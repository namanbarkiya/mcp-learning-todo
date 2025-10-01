"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Todo {
    id: number;
    title: string;
    description: string | null;
    priority: "low" | "medium" | "high";
    due_date: string | null;
    completed: boolean;
    category: string;
    created_at: string;
    updated_at: string;
}

interface Category {
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
    user_id: string;
}

export default function DashboardPage() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [newTodo, setNewTodo] = useState({
        title: "",
        description: "",
        priority: "medium" as const,
        category: "general",
    });
    const [isAddingTodo, setIsAddingTodo] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("general");
    const [useCustomCategory, setUseCustomCategory] = useState<boolean>(false);
    const [customCategory, setCustomCategory] = useState<string>("");
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/auth/login");
            return;
        }
        fetchTodos();
        fetchCategories();
    }, [router]);

    const fetchTodos = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:8000/api/todos/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setTodos(data);
            } else if (response.status === 401) {
                localStorage.removeItem("token");
                router.push("/auth/login");
            } else {
                setError("Failed to fetch todos");
            }
        } catch (err) {
            setError("Network error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAddingTodo(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:8000/api/todos/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...newTodo,
                    category:
                        useCustomCategory && customCategory.trim()
                            ? customCategory.trim()
                            : selectedCategory,
                }),
            });

            if (response.ok) {
                const createdTodo = await response.json();
                setTodos([...todos, createdTodo]);
                setNewTodo({
                    title: "",
                    description: "",
                    priority: "medium",
                    category: "general",
                });
                setSelectedCategory("general");
                setUseCustomCategory(false);
                setCustomCategory("");
                fetchCategories();
            } else {
                setError("Failed to create todo");
            }
        } catch (err) {
            setError("Network error");
        } finally {
            setIsAddingTodo(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                "http://localhost:8000/api/todos/categories",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                const base: Category[] = [
                    { id: "general", name: "general", user_id: "self" },
                ];
                const merged = [
                    ...base,
                    ...data.filter((c: Category) => c && c.name !== "general"),
                ];
                const uniqueByName = Array.from(
                    new Map(merged.map((c) => [c.name, c])).values()
                );
                setCategories(uniqueByName);
                if (!uniqueByName.find((c) => c.name === selectedCategory)) {
                    setSelectedCategory("general");
                }
            }
        } catch (err) {
            // ignore for MVP
        }
    };

    const toggleTodo = async (todoId: number) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `http://localhost:8000/api/todos/${todoId}/toggle`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const updatedTodo = await response.json();
                setTodos(
                    todos.map((todo) =>
                        todo.id === todoId ? updatedTodo : todo
                    )
                );
            }
        } catch (err) {
            setError("Failed to update todo");
        }
    };

    const deleteTodo = async (todoId: number) => {
        if (!confirm("Are you sure you want to delete this todo?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `http://localhost:8000/api/todos/${todoId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                setTodos(todos.filter((todo) => todo.id !== todoId));
            }
        } catch (err) {
            setError("Failed to delete todo");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/");
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high":
                return "bg-red-100 text-red-800";
            case "medium":
                return "bg-yellow-100 text-yellow-800";
            case "low":
                return "bg-green-100 text-green-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <h1 className="text-3xl font-bold text-gray-900">
                            MCP Todo App
                        </h1>
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* Add Todo Form */}
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">
                            Add New Todo
                        </h2>
                        <form onSubmit={handleAddTodo} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newTodo.title}
                                        onChange={(e) =>
                                            setNewTodo({
                                                ...newTodo,
                                                title: e.target.value,
                                            })
                                        }
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter todo title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Priority
                                    </label>
                                    <select
                                        value={newTodo.priority}
                                        onChange={(e) =>
                                            setNewTodo({
                                                ...newTodo,
                                                priority: e.target.value as
                                                    | "low"
                                                    | "medium"
                                                    | "high",
                                            })
                                        }
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Description
                                </label>
                                <textarea
                                    value={newTodo.description}
                                    onChange={(e) =>
                                        setNewTodo({
                                            ...newTodo,
                                            description: e.target.value,
                                        })
                                    }
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    placeholder="Enter todo description"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Category
                                </label>
                                <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <select
                                        disabled={useCustomCategory}
                                        value={selectedCategory}
                                        onChange={(e) =>
                                            setSelectedCategory(e.target.value)
                                        }
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                    >
                                        {categories.map((c) => (
                                            <option
                                                key={c.id + c.name}
                                                value={c.name}
                                            >
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            id="useCustom"
                                            type="checkbox"
                                            checked={useCustomCategory}
                                            onChange={(e) =>
                                                setUseCustomCategory(
                                                    e.target.checked
                                                )
                                            }
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label
                                            htmlFor="useCustom"
                                            className="text-sm text-gray-700"
                                        >
                                            Custom
                                        </label>
                                    </div>
                                </div>
                                {useCustomCategory && (
                                    <input
                                        type="text"
                                        value={customCategory}
                                        onChange={(e) =>
                                            setCustomCategory(e.target.value)
                                        }
                                        className="mt-3 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Type a new category"
                                    />
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={isAddingTodo}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                            >
                                {isAddingTodo ? "Adding..." : "Add Todo"}
                            </button>
                        </form>
                    </div>

                    {/* Todos List */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">
                                Your Todos ({todos.length})
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {todos.length === 0 ? (
                                <div className="px-6 py-8 text-center text-gray-500">
                                    No todos yet. Create your first todo above!
                                </div>
                            ) : (
                                todos.map((todo) => (
                                    <div key={todo.id} className="px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    checked={todo.completed}
                                                    onChange={() =>
                                                        toggleTodo(todo.id)
                                                    }
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <div className="flex-1">
                                                    <h3
                                                        className={`text-sm font-medium ${
                                                            todo.completed
                                                                ? "line-through text-gray-500"
                                                                : "text-gray-900"
                                                        }`}
                                                    >
                                                        {todo.title}
                                                    </h3>
                                                    {todo.description && (
                                                        <p
                                                            className={`text-sm ${
                                                                todo.completed
                                                                    ? "text-gray-400"
                                                                    : "text-gray-600"
                                                            }`}
                                                        >
                                                            {todo.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                                                                todo.priority
                                                            )}`}
                                                        >
                                                            {todo.priority}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {todo.category}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    deleteTodo(todo.id)
                                                }
                                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
