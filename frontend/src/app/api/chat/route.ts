import { NextRequest, NextResponse } from "next/server";

// Simple helper to call backend MCP
async function callMcp(token: string, body: any) {
    const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/api/mcp`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}

export async function POST(req: NextRequest) {
    try {
        const { messages, token, toolContext, toolHistory } = await req.json();
        const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        console.log(`[chat][${reqId}] incoming`, {
            hasToken: Boolean(token),
            messagesCount: Array.isArray(messages) ? messages.length : 0,
        });
        const backendUrl =
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "Missing GEMINI_API_KEY" },
                { status: 500 }
            );
        }
        if (!token) {
            return NextResponse.json(
                { error: "Missing auth token" },
                { status: 401 }
            );
        }

        // fetch schema to ground the model
        const schemaRes = await fetch(`${backendUrl}/api/mcp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: "schema",
                method: "mcp.schema",
                params: {},
            }),
        });
        const schemaJson = await schemaRes.json().catch(() => ({}));
        const schema = schemaJson?.result || {};
        console.log(`[chat][${reqId}] fetched schema`, {
            ok: schemaRes.ok,
            methodCount: Array.isArray(schema?.methods)
                ? schema.methods.length
                : 0,
        });

        // Build prompt
        const system = `You are an assistant with tool access to an MCP JSON-RPC server (/api/mcp).

Schema: ${JSON.stringify(schema)}
Recent tool context (may be stale): ${JSON.stringify(toolContext || null)}

GUIDELINES
- Prefer calling MCP tools to obtain fresh state when the user clearly intends to manage todos (list/show/find/describe/toggle/update/delete).
- If intent is unclear, respond conversationally without forcing a tool call.
- Do not fabricate data when a tool can verify; use history/toolContext only as hints.
- When you decide to call a tool, respond ONLY with: {"tool_call": {"method": "<method>", "params": { ... }}}.

EXAMPLES
User: list all todos
Assistant: {"tool_call":{"method":"todos.list","params":{}}}

User: describe hey task
Assistant: {"tool_call":{"method":"todos.findByTitle","params":{"query":"hey","exact":false}}}

User: toggle hey
Assistant: {"tool_call":{"method":"todos.findByTitle","params":{"query":"hey","exact":true}}}
`;

        // Build conversation with last 5 messages + last 3 tool results
        const lastFive = Array.isArray(messages) ? messages.slice(-5) : [];
        const lastThreeTools = Array.isArray(toolHistory)
            ? toolHistory.slice(-3)
            : [];
        const inputText = lastFive
            .map(
                (m: any) =>
                    `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
            )
            .join("\n");

        // Intent router (very narrow): only handle explicit list-all deterministically. Everything else goes to the model.
        const lastUserMsg =
            [...lastFive].reverse().find((m: any) => m.role === "user")
                ?.content || "";
        const wantsList =
            /\b(list\s*(all)?\s*(todos|tasks))\b/i.test(lastUserMsg) ||
            /\b(show\s+(all\s+)?(todos|tasks))\b/i.test(lastUserMsg);
        if (wantsList) {
            console.log(`[chat][${reqId}] pre-intent -> todos.list`);
            const rpc = await callMcp(token, {
                jsonrpc: "2.0",
                id: "tool",
                method: "todos.list",
                params: {},
            });
            return NextResponse.json({
                message: "Here are your latest todos.",
                tool_call: { method: "todos.list", params: {} },
                tool_result: rpc.data,
            });
        }

        // Minimal Gemini call (Generative Language API, text model)
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        { role: "user", parts: [{ text: system }] },
                        ...lastFive.map((m: any) => ({
                            role: m.role === "user" ? "user" : "model",
                            parts: [{ text: m.content }],
                        })),
                        {
                            role: "user",
                            parts: [
                                {
                                    text: `Recent tool results: ${JSON.stringify(
                                        lastThreeTools
                                    )}`,
                                },
                            ],
                        },
                    ],
                }),
            }
        );
        console.log(`[chat][${reqId}] gemini response`, geminiRes);
        const geminiJson = await geminiRes.json();
        let text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log(`[chat][${reqId}] gemini response`, {
            ok: geminiRes.ok,
            textLen: text?.length || 0,
        });

        // Try to parse tool call JSON
        let toolResult: any = null;
        let toolRequest: any = null;
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed?.tool_call?.method) {
                    toolRequest = parsed.tool_call;
                    // Resolve unqualified method names using schema
                    try {
                        const methods: any[] = Array.isArray(schema?.methods)
                            ? schema.methods
                            : [];
                        if (
                            toolRequest.method &&
                            !toolRequest.method.includes(".")
                        ) {
                            const desired = toolRequest.method.toLowerCase();
                            const found = methods.find(
                                (m: any) =>
                                    m?.name?.toLowerCase?.() === desired ||
                                    m?.name
                                        ?.toLowerCase?.()
                                        .endsWith(`.${desired}`)
                            );
                            if (found?.name) {
                                console.log(
                                    `[chat][${reqId}] method resolved`,
                                    { from: toolRequest.method, to: found.name }
                                );
                                toolRequest.method = found.name;
                            }
                        }
                    } catch {}
                    const rpcPayload = {
                        jsonrpc: "2.0",
                        id: "tool",
                        method: toolRequest.method,
                        params: toolRequest.params || {},
                    };
                    console.log(
                        `[chat][${reqId}] tool_call parsed`,
                        rpcPayload
                    );
                    const rpc = await callMcp(token, rpcPayload);
                    if (
                        rpc?.data?.detail ===
                        "Invalid authentication credentials"
                    ) {
                        console.log(`[chat][${reqId}] backend auth error`);
                        return NextResponse.json(
                            {
                                message: "Please login again to use tools.",
                                tool_call: rpcPayload,
                                tool_result: rpc.data,
                            },
                            { status: 401 }
                        );
                    }
                    console.log(`[chat][${reqId}] tool_call result`, {
                        ok: rpc.ok,
                    });
                    toolResult = rpc.data;
                }
            }
        } catch {}

        // Fallbacks if model returned empty text and no tool call
        if ((!text || !text.trim()) && !toolResult) {
            // Simple heuristics
            const lower = (inputText || "").toLowerCase();
            // If the last tool returned a single todo and user says 'toggle it', act on it
            if (
                toolContext?.result &&
                Array.isArray(toolContext.result) &&
                toolContext.result.length === 1 &&
                lower.includes("toggle")
            ) {
                const todo = toolContext.result[0];
                const rpc = await callMcp(token, {
                    jsonrpc: "2.0",
                    id: "tool",
                    method: "todos.toggle",
                    params: { id: todo.id },
                });
                const tId = todo.id;
                return NextResponse.json({
                    message: `Toggled todo id ${tId}.`,
                    tool_call: { method: "todos.toggle", params: { id: tId } },
                    tool_result: rpc.data,
                });
            }
            if (
                lower.includes("list") &&
                (lower.includes("todo") || lower.includes("task"))
            ) {
                console.log(`[chat][${reqId}] fallback -> todos.list`);
                const rpc = await callMcp(token, {
                    jsonrpc: "2.0",
                    id: "tool",
                    method: "todos.list",
                    params: {},
                });
                toolRequest = { method: "todos.list", params: {} };
                if (
                    rpc?.data?.detail === "Invalid authentication credentials"
                ) {
                    return NextResponse.json(
                        {
                            message: "Please login again to use tools.",
                            tool_call: { method: "todos.list", params: {} },
                            tool_result: rpc.data,
                        },
                        { status: 401 }
                    );
                }
                toolResult = rpc.data;
                text = "Listed your todos.";
            } else if (
                lower.includes("create") &&
                (lower.includes("todo") || lower.includes("task"))
            ) {
                // naive title extraction
                const titleMatch = inputText.match(
                    /create\s+(?:a\s+)?(?:todo|task)\s+(?:called\s+|named\s+|to\s+)?"?([^"\n]+)"?/i
                );
                const title = (titleMatch && titleMatch[1]) || "New task";
                console.log(`[chat][${reqId}] fallback -> todos.create`, {
                    title,
                });
                const rpc = await callMcp(token, {
                    jsonrpc: "2.0",
                    id: "tool",
                    method: "todos.create",
                    params: { title },
                });
                toolRequest = { method: "todos.create", params: { title } };
                if (
                    rpc?.data?.detail === "Invalid authentication credentials"
                ) {
                    return NextResponse.json(
                        {
                            message: "Please login again to use tools.",
                            tool_call: {
                                method: "todos.create",
                                params: { title },
                            },
                            tool_result: rpc.data,
                        },
                        { status: 401 }
                    );
                }
                toolResult = rpc.data;
                text = `Created todo: ${title}`;
            } else {
                text = "I could not get a response from the model.";
            }
        }

        // Clean message: strip markdown code fences if present
        const stripFences = (s: string) => {
            if (!s) return s;
            return s.replace(/^```[a-zA-Z]*\n/m, "").replace(/\n```$/m, "");
        };

        const responseBody = {
            message: stripFences(text),
            tool_call: toolRequest,
            tool_result: toolResult,
        };
        console.log(`[chat][${reqId}] response`, {
            messageLen: responseBody.message?.length || 0,
            hasTool: Boolean(responseBody.tool_call),
        });
        return NextResponse.json(responseBody);
    } catch (e: any) {
        console.error(`[chat][error]`, e);
        return NextResponse.json(
            { error: e?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
