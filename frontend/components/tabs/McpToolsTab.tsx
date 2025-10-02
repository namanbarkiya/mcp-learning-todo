"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type McpTool = {
    name: string;
    description?: string;
};

export default function McpToolsTab() {
    const [tools, setTools] = useState<McpTool[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/mcp/tools", {
                    cache: "no-store",
                });
                if (!res.ok) throw new Error("Failed to load MCP tools");
                const data = await res.json();
                const list = Array.isArray(data) ? data : data?.tools ?? [];
                setTools(list);
                setError(null);
            } catch (e: unknown) {
                const message =
                    e instanceof Error ? e.message : "Failed to load MCP tools";
                setError(message);
            }
        })();
    }, []);

    if (error) {
        return <div className="text-destructive">{error}</div>;
    }

    if (tools.length === 0) {
        return <div className="text-muted-foreground">No tools found.</div>;
    }

    return (
        <div className="space-y-3">
            {tools.map((tool) => (
                <Card key={tool.name}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="font-medium">{tool.name}</div>
                            <Badge variant="secondary">MCP</Badge>
                        </div>
                        {tool.description && (
                            <div className="text-sm text-muted-foreground mt-2">
                                {tool.description}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
            <Separator />
        </div>
    );
}
