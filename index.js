import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";

const execAsync = promisify(exec);

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

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP-SEC Ping Server running on stdio");
}

main().catch(console.error);