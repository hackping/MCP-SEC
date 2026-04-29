import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";

const execAsync = promisify(exec);

const app = express();

// Track SSE transports by session ID
const sseTransports = new Map();

// Create MCP Server
const server = new McpServer({
  name: "MCP-SEC",
  version: "1.0.0",
});

// Register ping tool
server.tool(
  "ping",
  "Ping a host to check network connectivity",
  { host: z.string().default("127.0.0.1").describe("Host to ping") },
  async ({ host }) => {
    try {
      const cmd = process.platform === "win32"
        ? `ping -n 4 ${host}`
        : `ping -c 4 ${host}`;
      const { stdout, stderr } = await execAsync(cmd, { timeout: 10000 });
      return {
        content: [{ type: "text", text: stdout || stderr }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Ping failed: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// SSE endpoint - client connects here to receive events
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  sseTransports.set(transport.sessionId, transport);
  res.on("close", () => {
    sseTransports.delete(transport.sessionId);
    console.error("SSE client disconnected, session:", transport.sessionId);
  });
  await server.connect(transport);
  console.error("SSE client connected, session:", transport.sessionId);
});

// Messages endpoint - client sends JSON-RPC messages here
app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId;
  if (sessionId && sseTransports.has(sessionId)) {
    await sseTransports.get(sessionId).handlePostMessage(req, res);
  } else {
    res.status(400).json({ error: "No active SSE session" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.error(`MCP-SEC SSE Server listening on port ${PORT}`);
  console.error(`SSE endpoint: http://localhost:${PORT}/sse`);
});
