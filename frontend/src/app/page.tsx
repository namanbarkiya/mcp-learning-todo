"use client";

import { useEffect, useMemo, useState } from "react";

type Todo = {
    id: number;
    title: string;
    completed: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

export default function HomePage() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingTitle, setEditingTitle] = useState("");

    async function fetchTodos() {
        try {
            const res = await fetch(`${API_BASE}/todos/`);
            if (!res.ok) throw new Error("Failed to load todos");
            const data = await res.json();
            setTodos(data);
            setError(null);
        } catch (e: any) {
            setError(e?.message || "Something went wrong");
        }
    }

    useEffect(() => {
        fetchTodos();
    }, []);

    async function addTodo() {
        if (!newTitle.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/todos/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle.trim() }),
            });
            if (res.ok) {
                setNewTitle("");
                await fetchTodos();
                setError(null);
            } else {
                setError("Failed to add todo");
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
            setError(null);
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
            if (!res.ok) throw new Error("Failed to delete");
            await fetchTodos();
            setError(null);
        } finally {
            setLoading(false);
        }
    }

    function startEditing(todo: Todo) {
        setEditingId(todo.id);
        setEditingTitle(todo.title);
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
            if (!res.ok) throw new Error("Failed to update");
            await fetchTodos();
            setError(null);
            setEditingId(null);
            setEditingTitle("");
        } finally {
            setLoading(false);
        }
    }

    function cancelEditing() {
        setEditingId(null);
        setEditingTitle("");
    }

    return (
        <main style={{ maxWidth: 640, margin: "0 auto" }}>
            <h1>CSV Todo</h1>
            {error && (
                <div
                    style={{
                        background: "#ffe5e5",
                        color: "#941b1b",
                        padding: 8,
                        borderRadius: 4,
                        marginBottom: 12,
                    }}
                >
                    {error}
                </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
                <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="New todo title"
                    style={{ flex: 1, padding: 8 }}
                />
                <button onClick={addTodo} disabled={loading}>
                    Add
                </button>
            </div>
            <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
                {todos.map((t) => (
                    <li
                        key={t.id}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 0",
                            borderBottom: "1px solid #eee",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() => toggleTodo(t.id, t.completed)}
                        />
                        {editingId === t.id ? (
                            <input
                                autoFocus
                                value={editingTitle}
                                onChange={(e) =>
                                    setEditingTitle(e.target.value)
                                }
                                onBlur={saveEditing}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEditing();
                                    if (e.key === "Escape") cancelEditing();
                                }}
                                style={{ flex: 1, padding: 6 }}
                            />
                        ) : (
                            <span
                                onDoubleClick={() => startEditing(t)}
                                style={{
                                    textDecoration: t.completed
                                        ? "line-through"
                                        : "none",
                                    flex: 1,
                                    cursor: "text",
                                }}
                            >
                                {t.title}
                            </span>
                        )}
                        <button
                            onClick={() => deleteTodo(t.id)}
                            disabled={loading}
                        >
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
        </main>
    );
}
