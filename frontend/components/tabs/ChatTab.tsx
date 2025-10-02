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
            const toolCalls: ToolCall[] = data?.toolSteps ?? [];
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
                                        <Collapsible>
                                            <CollapsibleTrigger className="text-xs font-medium underline text-primary">
                                                Tool calls ({m.tools.length})
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="mt-2 space-y-2">
                                                {m.tools.map((t, i) => (
                                                    <div
                                                        key={i}
                                                        className="rounded-md border bg-muted/30 p-2"
                                                    >
                                                        <div className="text-xs font-semibold mb-1">
                                                            {t.name}
                                                        </div>
                                                        <div className="text-xs">
                                                            <div className="font-medium">
                                                                Args:
                                                            </div>
                                                            <pre className="whitespace-pre-wrap rounded bg-background p-2 border mt-1">
                                                                {JSON.stringify(
                                                                    t.args,
                                                                    null,
                                                                    2
                                                                )}
                                                            </pre>
                                                        </div>
                                                        <div className="text-xs mt-2">
                                                            <div className="font-medium">
                                                                Result:
                                                            </div>
                                                            <pre className="whitespace-pre-wrap rounded bg-background p-2 border mt-1">
                                                                {JSON.stringify(
                                                                    t.result,
                                                                    null,
                                                                    2
                                                                )}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                ))}
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="mb-2 flex justify-start">
                            <div className="max-w-[85%] rounded-md border bg-background p-2 text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary">model</Badge>
                                </div>
                                <div className="ml-4 flex items-center gap-1 py-1">
                                    <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    )}
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
