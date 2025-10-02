"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TodoTab from "@/components/tabs/TodoTab";
import McpToolsTab from "@/components/tabs/McpToolsTab";
import ChatTab from "@/components/tabs/ChatTab";

export default function HomePage() {
    return (
        <main className="mx-auto max-w-5xl p-4">
            <Card>
                <CardHeader>
                    <CardTitle>CSV Todo + MCP</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="todo" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="todo">Todos</TabsTrigger>
                            <TabsTrigger value="mcp">MCP Tools</TabsTrigger>
                            <TabsTrigger value="chat">Chat</TabsTrigger>
                        </TabsList>
                        <TabsContent value="todo" className="mt-4">
                            <TodoTab />
                        </TabsContent>
                        <TabsContent value="mcp" className="mt-4">
                            <McpToolsTab />
                        </TabsContent>
                        <TabsContent value="chat" className="mt-4">
                            <ChatTab />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </main>
    );
}
