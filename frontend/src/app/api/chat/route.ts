import { NextResponse } from "next/server";

// This route proxies chat to Gemini and enables tool calling by
// mapping Gemini function-calls to our MCP API endpoints.

type ToolDef = {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
};

function sanitizeSchema(schema: unknown): unknown {
    const isRecord = (v: unknown): v is Record<string, unknown> =>
        typeof v === "object" && v !== null && !Array.isArray(v);

    if (!isRecord(schema)) return schema;
    const s: Record<string, unknown> = { ...schema };

    const anyOf = s["anyOf"] as unknown;
    if (Array.isArray(anyOf)) {
        return { anyOf: (anyOf as unknown[]).map((x) => sanitizeSchema(x)) };
    }

    const oneOf = s["oneOf"] as unknown;
    if (Array.isArray(oneOf)) {
        return { oneOf: (oneOf as unknown[]).map((x) => sanitizeSchema(x)) };
    }

    const allOf = s["allOf"] as unknown;
    if (Array.isArray(allOf)) {
        return { allOf: (allOf as unknown[]).map((x) => sanitizeSchema(x)) };
    }

    const properties = s["properties"] as unknown;
    if (isRecord(properties)) {
        const newProps: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(properties)) {
            newProps[k] = sanitizeSchema(v);
        }
        s["properties"] = newProps;
    }

    const items = s["items"] as unknown;
    if (Array.isArray(items)) {
        s["items"] = (items as unknown[]).map((x) => sanitizeSchema(x));
    } else if (items !== undefined) {
        s["items"] = sanitizeSchema(items);
    }

    return s;
}

function toGeminiTool(tool: ToolDef) {
    return {
        functionDeclarations: [
            {
                name: tool.name,
                description: tool.description || undefined,
                parameters: sanitizeSchema(
                    (tool.inputSchema as Record<string, unknown>) || {
                        type: "object",
                    }
                ),
            },
        ],
    };
}

export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "model"; content: string };

export async function POST(req: Request) {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "Missing GEMINI_API_KEY env var" },
            { status: 500 }
        );
    }

    // 1) Load MCP tools from our own API (server-side call)
    const origin = new URL(req.url).origin;
    const baseUrl = process.env.NEXT_PUBLIC_URL ?? origin;
    const toolsRes = await fetch(`${baseUrl}/api/mcp/tools`, {
        cache: "no-store",
    });
    const toolsJson = await toolsRes.json();
    const tools: ToolDef[] = Array.isArray(toolsJson)
        ? toolsJson
        : toolsJson?.tools ?? [];

    // 2) Prepare Gemini with function declarations based on MCP tools
    const { GoogleGenerativeAI } = (await import(
        "@google/generative-ai"
    )) as unknown as {
        GoogleGenerativeAI: new (apiKey: string) => {
            getGenerativeModel: (cfg: unknown) => {
                generateContent: (input: unknown) => Promise<unknown>;
            };
        };
    };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        tools: tools.map(toGeminiTool),
    } as unknown);

    // Helpers for cross-model compatibility
    const getText = (r: unknown): string => {
        const t = (
            r as { response?: { text?: () => string } }
        )?.response?.text?.();
        if (typeof t === "string" && t.length > 0) return t;
        const parts = (
            r as {
                response?: {
                    candidates?: Array<{
                        content?: { parts?: Array<{ text?: string }> };
                    }>;
                };
            }
        )?.response?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            return parts
                .map((p) => (typeof p?.text === "string" ? p.text : ""))
                .join("");
        }
        return "";
    };

    const getFunctionCall = (
        r: unknown
    ): { name: string; args: Record<string, unknown> } | null => {
        const direct = (
            r as {
                response?: {
                    functionCalls?: Array<{
                        name: string;
                        args?: Record<string, unknown>;
                    }>;
                };
            }
        )?.response?.functionCalls?.[0];
        if (direct && typeof direct.name === "string") {
            return { name: direct.name, args: direct.args ?? {} };
        }
        const parts = (
            r as {
                response?: {
                    candidates?: Array<{
                        content?: {
                            parts?: Array<{
                                functionCall?: {
                                    name: string;
                                    args?: Record<string, unknown>;
                                };
                            }>;
                        };
                    }>;
                };
            }
        )?.response?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const p of parts) {
                const f = p?.functionCall;
                if (f && typeof f.name === "string") {
                    return { name: f.name, args: f.args ?? {} };
                }
            }
        }
        return null;
    };

    const buildFunctionResponsePart = (name: string, response: unknown) => ({
        functionResponse: { name, response },
    });

    // 3) Send chat
    let result: unknown = await model.generateContent({
        contents: messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.content }],
        })),
    } as unknown);

    // 4) Handle function-calls: loop until model stops requesting calls
    const aggregatedParts: Array<{ role: string; content: string }> = [];

    // Basic loop: if the model requests a function call, invoke our MCP tool endpoint and then
    // feed the result back as a tool response.
    for (let i = 0; i < 5; i++) {
        const call = getFunctionCall(result);
        if (!call) break;

        const { name, args } = call;

        const toolRes = await fetch(`${baseUrl}/api/mcp/tool`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, args }),
            // Use absolute URL when running server-side
            cache: "no-store",
        });

        const toolJson = await toolRes.json();
        aggregatedParts.push({
            role: "tool",
            content: JSON.stringify(toolJson),
        });

        // Send tool response back to the model
        result = await model.generateContent({
            contents: [
                ...messages.map((m) => ({
                    role: m.role,
                    parts: [{ text: m.content }],
                })),
                {
                    role: "tool",
                    parts: [buildFunctionResponsePart(name, toolJson)],
                },
            ],
        } as unknown);
    }

    const text = getText(result);
    return NextResponse.json({ reply: text, toolSteps: aggregatedParts });
}
