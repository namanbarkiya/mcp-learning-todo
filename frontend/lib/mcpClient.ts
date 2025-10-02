import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

let singletonClient: Client | null = null;
let connectPromise: Promise<Client> | null = null;

function getMcpBaseUrl(): URL {
    const fromEnv = process.env.MCP_SERVER_URL;
    const url =
        fromEnv && fromEnv.length > 0 ? fromEnv : "http://localhost:8080/mcp";
    return new URL(url);
}

export async function getMcpClient(): Promise<Client> {
    if (singletonClient) {
        return singletonClient;
    }

    if (connectPromise) {
        return connectPromise;
    }

    connectPromise = (async () => {
        const baseUrl = getMcpBaseUrl();
        // Try modern Streamable HTTP first; fall back to legacy SSE if server rejects POST
        try {
            const client = new Client({
                name: "nextjs-client",
                version: "1.0.0",
            });
            const transport = new StreamableHTTPClientTransport(baseUrl);
            await client.connect(transport);
            singletonClient = client;
            return client;
        } catch {
            const client = new Client({
                name: "nextjs-client-sse",
                version: "1.0.0",
            });
            const sse = new SSEClientTransport(baseUrl);
            await client.connect(sse);
            singletonClient = client;
            return client;
        } finally {
            connectPromise = null;
        }
    })();

    return connectPromise;
}
