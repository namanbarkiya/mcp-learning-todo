"use client";

import { useState } from "react";
import Link from "next/link";

export default function ChatPage() {
    const [messages, setMessages] = useState<
        { role: "user" | "assistant"; content: string }[]
    >([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [toolHistory, setToolHistory] = useState<any[]>([]);

    const send = async () => {
        if (!input.trim()) return;
        setError("");
        const token = localStorage.getItem("token");
        if (!token) {
            setError("Please login first.");
            return;
        }
        const next = [...messages, { role: "user", content: input }];
        setMessages(next);
        setInput("");
        setLoading(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: next,
                    token,
                    toolContext: toolHistory[toolHistory.length - 1] || null,
                    toolHistory,
                }),
            });
            const data = await res.json();
            let reply = data?.message || "(no response)";
            const tr = data?.tool_result?.result;
            if (tr) {
                if (Array.isArray(tr)) {
                    const list = tr
                        .map(
                            (t: any) =>
                                `- ${t.title} [${t.priority ?? ""}]${
                                    t.completed ? " (done)" : ""
                                }`
                        )
                        .join("\n");
                    reply = `Here are your todos (via MCP):\n${list}`;
                } else if (typeof tr === "object") {
                    const t = tr as any;
                    const line = `${t.title ?? "todo"} [${t.priority ?? ""}]${
                        t.completed ? " (done)" : ""
                    }`;
                    reply = `Updated todo (via MCP): ${line}`;
                }
            }
            setMessages([...next, { role: "assistant", content: reply }]);
            if (data?.tool_result) {
                setToolHistory((prev) => {
                    const updated = [...prev, data.tool_result];
                    return updated.slice(-3);
                });
            }
        } catch (e) {
            setError("Failed to chat");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Chat (Gemini + MCP)
                    </h1>
                    <Link
                        href="/dashboard"
                        className="text-blue-600 hover:underline"
                    >
                        Dashboard
                    </Link>
                </div>
            </header>
            <main className="max-w-5xl mx-auto py-6 px-4">
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                        {error}
                    </div>
                )}
                <div className="bg-white shadow rounded-lg p-4 h-[70vh] flex flex-col">
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {messages.map((m, idx) => (
                            <div
                                key={idx}
                                className={
                                    m.role === "user"
                                        ? "text-right"
                                        : "text-left"
                                }
                            >
                                <div
                                    className={`inline-block px-3 py-2 rounded-lg ${
                                        m.role === "user"
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 text-gray-900"
                                    }`}
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="text-gray-500 text-sm">
                                Thinking…
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex gap-2">
                        <input
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ask to list todos or create a todo…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") send();
                            }}
                        />
                        <button
                            onClick={send}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
