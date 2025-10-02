"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

type ChatMsg = { role: "user" | "model"; content: string; tools?: ToolCall[] };
type ToolCall = { name: string; args?: unknown; result?: unknown };

export default function ChatTab() {
    const [messages, setMessages] = useState<ChatMsg[]>([
        {
            role: "model",
            content: "Hi! Ask me to manage your todos or run MCP tools.",
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
            const toolCalls: ToolCall[] = data?.toolCalls ?? [];
            setMessages((m) => [
                ...m,
                { role: "model", content: reply, tools: toolCalls },
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-3">
            <Card>
                <CardContent className="p-3 h-[440px] overflow-y-auto bg-muted/30">
                    {messages.map((m, idx) => (
                        <div
                            key={idx}
                            className={`mb-2 flex ${
                                m.role === "user"
                                    ? "justify-end"
                                    : "justify-start"
                            }`}
                        >
                            <div
                                className={`max-w-[85%] rounded-md border bg-background p-2 text-sm ${
                                    m.role === "user" ? "bg-primary/5" : ""
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge
                                        variant={
                                            m.role === "user"
                                                ? "default"
                                                : "secondary"
                                        }
                                    >
                                        {m.role}
                                    </Badge>
                                </div>
                                <div className="whitespace-pre-wrap">
                                    {m.content}
                                </div>
                                {m.tools && m.tools.length > 0 && (
                                    <div className="mt-2">
                                        {m.tools.map((t, i) => (
                                            <Collapsible key={i}>
                                                <CollapsibleTrigger className="text-xs underline">
                                                    Tool call: {t.name}
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="text-xs mt-1 space-y-1">
                                                    <div>
                                                        <span className="font-medium">
                                                            Args:
                                                        </span>{" "}
                                                        <pre className="whitespace-pre-wrap">
                                                            {JSON.stringify(
                                                                t.args,
                                                                null,
                                                                2
                                                            )}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">
                                                            Result:
                                                        </span>{" "}
                                                        <pre className="whitespace-pre-wrap">
                                                            {JSON.stringify(
                                                                t.result,
                                                                null,
                                                                2
                                                            )}
                                                        </pre>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={endRef} />
                </CardContent>
            </Card>

            <div className="flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") send();
                    }}
                    placeholder="Ask to manage todos or run MCP tools..."
                />
                <Button onClick={send} disabled={loading}>
                    {loading ? "Sending..." : "Send"}
                </Button>
            </div>
        </div>
    );
}
