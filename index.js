import { Server } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { CallToolResult } from '@modelcontextprotocol/sdk';

// Ping tool implementation
async function ping(host = '127.0.0.1') {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const cmd = process.platform === 'win32' 
      ? `ping -n 1 ${host}` 
      : `ping -c 1 ${host}`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve({
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true
        });
        return;
      }
      resolve({
        content: [{ type: 'text', text: stdout || stderr }]
      });
    });
  });
}

// Create MCP Server
class PingServer {
  constructor() {
    this.server = new Server(
      {
        name: 'MCP-SEC Ping Server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupHandlers();
  }
  
  setupHandlers() {
    this.server.setRequestHandler(
      { method: 'tools/list' },
      async () => {
        return {
          tools: [
            {
              name: 'ping',
              description: 'Ping a host to check network connectivity',
              inputSchema: {
                type: 'object',
                properties: {
                  host: {
                    type: 'string',
                    description: 'Host to ping (default: 127.0.0.1)',
                    default: '127.0.0.1'
                  }
                },
                required: []
              }
            }
          ]
        };
      }
    );
    
    this.server.setRequestHandler(
      { method: 'tools/call' },
      async (request) => {
        const { name, arguments: args } = request.params;
        
        if (name === 'ping') {
          const host = args.host || '127.0.0.1';
          const result = await ping(host);
          return result;
        }
        
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true
        };
      }
    );
  }
  
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP-SEC Ping Server running on stdio');
  }
}

const server = new PingServer();
server.run().catch(console.error);