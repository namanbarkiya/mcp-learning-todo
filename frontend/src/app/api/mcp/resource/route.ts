import { NextResponse } from "next/server";
import { getMcpClient } from "@/lib/mcpClient";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const { uri } = await req.json();
    const client = await getMcpClient();
    const resource = await client.readResource({ uri });
    return NextResponse.json(resource);
}
