import { NextResponse } from "next/server";
import { getMcpClient } from "@/lib/mcpClient";

export const dynamic = "force-dynamic";

export async function GET() {
    const client = await getMcpClient();
    const tools = await client.listTools();
    return NextResponse.json(tools);
}
