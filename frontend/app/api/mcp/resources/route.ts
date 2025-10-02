import { NextResponse } from "next/server";
import { getMcpClient } from "@/lib/mcpClient";

export const dynamic = "force-dynamic";

export async function GET() {
    const client = await getMcpClient();
    const resources = await client.listResources();
    return NextResponse.json(resources);
}
