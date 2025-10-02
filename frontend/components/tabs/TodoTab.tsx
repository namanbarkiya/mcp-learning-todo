"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Todo = {
    id: number;
    title: string;
    completed: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

export default function TodoTab() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingTitle, setEditingTitle] = useState("");

    async function fetchTodos() {
        const res = await fetch(`${API_BASE}/todos/`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load todos");
        const data = await res.json();
        setTodos(data);
    }

    useEffect(() => {
        fetchTodos().catch(() => {});
    }, []);

    async function addTodo() {
        const title = newTitle.trim();
        if (!title) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/todos/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            });
            if (res.ok) {
                setNewTitle("");
                await fetchTodos();
            }
        } finally {
            setLoading(false);
        }
    }

    async function toggleTodo(id: number, completed: boolean) {
        setLoading(true);
        try {
            await fetch(`${API_BASE}/todos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed: !completed }),
            });
            await fetchTodos();
        } finally {
            setLoading(false);
        }
    }

    async function deleteTodo(id: number) {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/todos/${id}`, {
                method: "DELETE",
            });
            if (res.ok) await fetchTodos();
        } finally {
            setLoading(false);
        }
    }

    async function saveEditing() {
        if (editingId == null) return;
        const title = editingTitle.trim();
        if (!title) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/todos/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            });
            if (res.ok) {
                setEditingId(null);
                setEditingTitle("");
                await fetchTodos();
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="New todo title"
                />
                <Button onClick={addTodo} disabled={loading}>
                    Add
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <ul className="divide-y">
                        {todos.map((t) => (
                            <li
                                key={t.id}
                                className="flex items-center gap-3 p-3"
                            >
                                <Checkbox
                                    checked={t.completed}
                                    onCheckedChange={() =>
                                        toggleTodo(t.id, t.completed)
                                    }
                                />
                                {editingId === t.id ? (
                                    <Input
                                        autoFocus
                                        value={editingTitle}
                                        onChange={(e) =>
                                            setEditingTitle(e.target.value)
                                        }
                                        onBlur={saveEditing}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter")
                                                saveEditing();
                                            if (e.key === "Escape") {
                                                setEditingId(null);
                                                setEditingTitle("");
                                            }
                                        }}
                                        className="flex-1"
                                    />
                                ) : (
                                    <span
                                        onDoubleClick={() => {
                                            setEditingId(t.id);
                                            setEditingTitle(t.title);
                                        }}
                                        className={
                                            "flex-1 cursor-text " +
                                            (t.completed
                                                ? "line-through text-muted-foreground"
                                                : "")
                                        }
                                    >
                                        {t.title}
                                    </span>
                                )}
                                <Button
                                    variant="secondary"
                                    onClick={() => deleteTodo(t.id)}
                                    disabled={loading}
                                >
                                    Delete
                                </Button>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
            <Separator />
        </div>
    );
}
