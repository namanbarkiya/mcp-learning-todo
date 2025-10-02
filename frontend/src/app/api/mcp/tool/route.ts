import { NextResponse } from "next/server";
import { getMcpClient } from "@/lib/mcpClient";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const { name, args } = await req.json();
    const client = await getMcpClient();
    const result = await client.callTool({ name, arguments: args ?? {} });
    return NextResponse.json(result);
}
