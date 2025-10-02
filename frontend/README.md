# Frontend (Next.js) – MCP AI Todo

This is the Next.js client for the MCP AI Todo demo. It consumes the FastAPI REST API and visualizes tool activity from the MCP endpoint.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Optional environment variable:

-   `NEXT_PUBLIC_API_BASE` – defaults to `http://localhost:8080`.

## UI Overview

Single-page, multi-tab layout using shadcn/ui and Tailwind:

-   **Todos**: list, create, update (inline edit), toggle complete, delete.
-   **MCP Tools**: lists available tools from the MCP server.
-   **Chat**: chat window with a typing indicator and a grouped “Tool calls (n)” section under each assistant response, showing args and results for each tool call.

## Tech

-   Next.js App Router, Tailwind CSS (v3)
-   shadcn/ui components (`Tabs`, `Card`, `Button`, `Input`, `Textarea`, `Accordion`, `Badge`, `ScrollArea`, `Separator`, `Skeleton`, `Toast`, `Collapsible`, `Checkbox`, `Label`)
-   MCP client: `frontend/lib/mcpClient.ts`

## Notes

-   The frontend is API-first and thin: it calls the REST API for data and reflects tool steps returned by the assistant (via `/api/chat`).
-   No component boilerplate from scratch—UI uses shadcn primitives.
-   To switch API targets, set `NEXT_PUBLIC_API_BASE`.
