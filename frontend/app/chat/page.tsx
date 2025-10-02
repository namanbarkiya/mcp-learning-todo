"use client";

import { useEffect, useRef, useState } from "react";

type ChatMsg = { role: "user" | "model"; content: string };

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMsg[]>([
        {
            role: "model",
            content: "Hi! I can manage your todos. Ask me anything.",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function send() {
        const text = input.trim();
        if (!text || loading) return;
        setInput("");
        const next: ChatMsg[] = [...messages, { role: "user", content: text }];
        setMessages(next);
        setLoading(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ messages: next }),
            });
            const data = await res.json();
            const reply = data?.reply ?? "(no response)";
            setMessages((m) => [...m, { role: "model", content: reply }]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
            <h1>Gemini + MCP Chat</h1>
            <div
                style={{
                    border: "1px solid #eee",
                    borderRadius: 8,
                    padding: 12,
                    height: 420,
                    overflowY: "auto",
                    background: "#fafafa",
                }}
            >
                {messages.map((m, idx) => (
                    <div
                        key={idx}
                        style={{
                            marginBottom: 8,
                            display: "flex",
                            justifyContent:
                                m.role === "user" ? "flex-end" : "flex-start",
                        }}
                    >
                        <div
                            style={{
                                maxWidth: "85%",
                                background:
                                    m.role === "user" ? "#dff0ff" : "white",
                                border: "1px solid #e6e6e6",
                                borderRadius: 8,
                                padding: 8,
                            }}
                        >
                            {m.content}
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") send();
                    }}
                    placeholder="Ask Gemini to manage your todos..."
                    style={{ flex: 1, padding: 10 }}
                />
                <button onClick={send} disabled={loading}>
                    {loading ? "Sending..." : "Send"}
                </button>
            </div>
        </main>
    );
}
