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

function toGeminiFunction(tool: ToolDef) {
    return {
        name: tool.name,
        description: tool.description || undefined,
        parameters: sanitizeSchema(
            (tool.inputSchema as Record<string, unknown>) || { type: "object" }
        ),
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
        model: "gemini-2.5-flash",
        tools: { functionDeclarations: tools.map(toGeminiFunction) },
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
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

    // 3) Build running transcript and satisfy tool calls
    const systemInstruction = {
        role: "user",
        parts: [
            {
                text: 'You are a helpful assistant for a todo app. When you call tools you may receive machine-readable output (JSON, arrays, objects). Always transform such output into clear, natural-language summaries for the user — do NOT return raw JSON. Rules: 1. Begin with a one-sentence summary of the total number of todos (e.g. "You have 2 todos."). 2. Then list each todo in natural language, including the title and a clear status phrase (e.g. "done", "not done", "overdue"). Example: "‘Buy milk’ is done" or "‘Pay rent’ is not done". 3. Do not show raw JSON. Only include IDs if the user explicitly asked for them; otherwise omit IDs. If you do include IDs, put them in parentheses after the title: e.g. "‘Buy milk’ (ID: 3) — done". 4. After any tool call, briefly summarise what the tool returned and the effect (e.g. "I added todo \'Buy milk\' successfully. There are now 3 todos."). 5. Use friendly, conversational language and full sentences. Example outputs: - If tool returns two completed todos, respond: "You have 2 todos: ‘gggg’ is done and ‘hello’ is done." - If one is incomplete: "You have 2 todos: ‘gggg’ is done and ‘hello’ is not done." Now respond to the user\'s request or tool output following these rules.',
            },
        ],
    };
    let contents: Array<{ role: string; parts: unknown[] }> = [
        systemInstruction,
        ...messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.content }],
        })),
    ];
    const toolSteps: Array<{
        name: string;
        args: Record<string, unknown>;
        result: unknown;
    }> = [];
    const seenCalls = new Set<string>();

    let result: unknown = await model.generateContent({ contents } as unknown);
    for (let i = 0; i < 3; i++) {
        const call = getFunctionCall(result);
        if (!call) break;

        const { name, args } = call;
        const key = `${name}:${JSON.stringify(args)}`;
        if (seenCalls.has(key)) break;
        seenCalls.add(key);

        const toolRes = await fetch(`${baseUrl}/api/mcp/tool`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, args }),
            cache: "no-store",
        });
        const toolJson = await toolRes.json();
        toolSteps.push({ name, args, result: toolJson });

        contents = [
            ...contents,
            {
                role: "tool",
                parts: [buildFunctionResponsePart(name, toolJson)],
            },
        ];
        result = await model.generateContent({ contents } as unknown);
    }

    let text = getText(result);
    // Fallback: if the model produced no text, synthesize a concise user-facing message
    if (!text && toolSteps.length > 0) {
        try {
            const first = toolSteps[toolSteps.length - 1].result as unknown as {
                content?: Array<{ type?: string; text?: string }>;
            };
            const raw = first?.content
                ?.map((p) => p.text)
                .filter(Boolean)
                .join("\n");
            if (raw) {
                let summarized = "";
                try {
                    const data = JSON.parse(raw as string);
                    if (Array.isArray(data)) {
                        summarized = data
                            .map(
                                (t) =>
                                    `${t.id}. ${t.title}${
                                        t.completed ? " (done)" : ""
                                    }`
                            )
                            .join("\n");
                    } else if (typeof data === "object" && data) {
                        summarized = Object.entries(
                            data as Record<string, unknown>
                        )
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(", ");
                    }
                } catch {
                    // not JSON
                }
                text = summarized || (raw as string);
            }
        } catch {
            // ignore
        }
    }
    return NextResponse.json({ reply: text, toolSteps });
}
