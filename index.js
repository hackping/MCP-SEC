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

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "MCP-SEC",
    version: "1.0.0",
    endpoints: {
      sse: "/sse",
      messages: "/messages",
    },
  });
});

// CORS middleware for browser-based clients
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// SSE endpoint - client connects here to receive events
app.get("/sse", async (req, res) => {
  console.error("New SSE connection request received");
  try {
    const transport = new SSEServerTransport("/messages", res);
    sseTransports.set(transport.sessionId, transport);
    res.on("close", () => {
      sseTransports.delete(transport.sessionId);
      console.error("SSE client disconnected, session:", transport.sessionId);
    });
    await server.connect(transport);
    console.error("SSE client connected, session:", transport.sessionId);
  } catch (err) {
    console.error("SSE connection error:", err);
  }
});

// Messages endpoint - client sends JSON-RPC messages here
app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId;
  if (sessionId && sseTransports.has(sessionId)) {
    try {
      await sseTransports.get(sessionId).handlePostMessage(req, res);
    } catch (err) {
      console.error("Message handling error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal error" });
      }
    }
  } else {
    res.status(400).json({ error: "No active SSE session", sessionId: sessionId || "missing" });
  }
});

// CAP/FC uses port 9000 by default, fallback to PORT env var or 3000
const PORT = process.env.PORT || 9000;
app.listen(PORT, "0.0.0.0", () => {
  console.error(`MCP-SEC SSE Server listening on 0.0.0.0:${PORT}`);
  console.error(`SSE endpoint: http://0.0.0.0:${PORT}/sse`);
});
