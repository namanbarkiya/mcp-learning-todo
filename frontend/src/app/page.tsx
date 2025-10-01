import Link from "next/link";

export default function Home() {
    return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        MCP Todo App
                    </h1>
                    <p className="text-gray-600 mb-8">
                        A todo application with Model Context Protocol
                        integration
                    </p>
                </div>

                <div className="space-y-4">
                    <Link
                        href="/auth/login"
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Login
                    </Link>

                    <Link
                        href="/auth/register"
                        className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Register
                    </Link>
                </div>

                <div className="text-center">
                    <Link
                        href="/dashboard"
                        className="text-sm text-blue-600 hover:text-blue-500"
                    >
                        Go to Dashboard (Demo)
                    </Link>
                </div>
            </div>
        </main>
    );
}
