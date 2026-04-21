import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecutionStrategies } from '../../src/services/ExecutionStrategies.js';
import { ActionHandler } from '../../src/services/ActionHandler.js';
import { McpOrchestrator } from '../../src/orchestrator/McpOrchestrator.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Tooling & MCP Integration', () => {
  // Increase timeout for MCP tests
  vi.setConfig({ testTimeout: 15000 });

  describe('1. DETERMINISTIC OUTPUT PARSING (JSON vs TypeScript)', () => {
    it('Test A: should extract JSON from conversational text without SyntaxError', () => {
      const sloppyOutput = `
        I will help you with that.
        \`\`\`json
        {
          "tool": "webScraper",
          "args": { "url": "https://example.com" }
        }
        \`\`\`
        Done.
      `;
      const blocks = ExecutionStrategies.extractToolCalls(sloppyOutput);
      const jsonBlock = blocks.find(b => b.type === 'json');
      expect(jsonBlock).toBeDefined();

      const parsed = JSON.parse(jsonBlock!.content);
      expect(parsed.tool).toBe('webScraper');
    });

    it('Test B: should identify typescript block and strip markdown tags', () => {
      const tsOutput = `
        Let me run some code:
        \`\`\`typescript
        const x = 10;
        console.log(x);
        \`\`\`
      `;
      const blocks = ExecutionStrategies.extractToolCalls(tsOutput);
      const tsBlock = blocks.find(b => b.type === 'typescript');
      expect(tsBlock).toBeDefined();
      expect(tsBlock!.content).toContain('const x = 10;');
      expect(tsBlock!.content).not.toContain('\`\`\`typescript');
    });
  });

  describe('2. NATIVE TOOL EXECUTION ISOLATION', () => {
    it('should execute a mocked tool call via ActionHandler', async () => {
      const handler = new ActionHandler();
      // We need to implement executeAction in ActionHandler or mock it
      // For this test, we expect ActionHandler to have a way to handle native tool calls
      const toolCall = { tool: "webScraper", args: { url: "https://example.com" } };

      // Mocking the internal native tool registry if needed, 
      // but the task says "Mock the actual HTTP fetch to prevent network dependence"
      vi.mock('../../src/tools/webScraper.js', () => ({
        webScraperTool: {
          handler: vi.fn().mockResolvedValue('<html>Scraped Content</html>')
        }
      }));

      const result = await handler.executeNativeTool(toolCall.tool, toolCall.args);
      expect(result).toBe('<html>Scraped Content</html>');
    });
  });

  describe('3. MCP SERVER LIFECYCLE (No-AI)', () => {
    let dummyMcpPath: string;
    let orchestrator: McpOrchestrator;

    beforeEach(() => {
      dummyMcpPath = path.join(__dirname, 'dummy-mcp.cjs');
      const dummyContent = `
        const fs = require('fs');
        process.stdin.resume();
        process.stdin.on('data', (data) => {
          const content = data.toString();
          const lines = content.split('\\n');
          for (const line of lines) {
            if (!line || !line.trim()) continue;
            try {
              const request = JSON.parse(line);
              if (request.method === 'initialize') {
                const response = JSON.stringify({
                  jsonrpc: "2.0",
                  id: request.id,
                  result: {
                    protocolVersion: "2024-11-05",
                    capabilities: { tools: {} },
                    serverInfo: { name: "dummy", version: "1.0.0" }
                  }
                }) + "\\n";
                process.stdout.write(response);
              } else if (request.method === 'tools/list') {
               const response = JSON.stringify({
                  jsonrpc: "2.0",
                  id: request.id,
                  result: {
                    tools: [{
                      name: "echo",
                      description: "Echo message",
                      inputSchema: { type: "object", properties: { message: { type: "string" } } }
                    }]
                  }
                }) + "\\n";
                process.stdout.write(response);
              } else if (request.method === 'tools/call') {
                const response = JSON.stringify({
                  jsonrpc: "2.0",
                  id: request.id,
                  result: { content: [{ type: "text", text: request.params.arguments.message }] }
                }) + "\\n";
                process.stdout.write(response);
              }
            } catch (e) {}
          }
        });
      `;
      fs.writeFileSync(dummyMcpPath, dummyContent);

      const mockRegistry = {
        getServerConfig: vi.fn().mockResolvedValue({
          command: 'node',
          args: [dummyMcpPath],
          env: {}
        })
      };
      orchestrator = new McpOrchestrator(mockRegistry as any);
    });

    afterEach(() => {
      if (fs.existsSync(dummyMcpPath)) fs.unlinkSync(dummyMcpPath);
      // Clean up orchestrator
      (orchestrator as any).shutdownAll?.();
    });

    it('Test A (Startup): should register server as connected', async () => {
      await orchestrator.prepareEnvironment(['dummy-server']);
      const activeServers = (orchestrator as any).activeServers;
      expect(activeServers.has('dummy-server')).toBe(true);
    });

    it('Test B (Discovery): should return expected JSON schema', async () => {
      await orchestrator.prepareEnvironment(['dummy-server']);
      const tools = await orchestrator.getToolsForSandbox();
      const echoTool = tools.find(t => t.name === 'dummy_server_echo');
      expect(echoTool).toBeDefined();
      expect(echoTool?.inputSchema.properties.message).toBeDefined();
    });

    it('Test C (Execution): should return correct result from mocked tool', async () => {
      await orchestrator.prepareEnvironment(['dummy-server']);
      const tools = await orchestrator.getToolsForSandbox();
      const echoTool = tools.find(t => t.name === 'dummy_server_echo');
      const result = await echoTool?.handler({ message: 'Hello MCP' });
      expect(result).toBe('Hello MCP');
    });

    it('Test D (Teardown): should terminate child process cleanly', async () => {
      await orchestrator.prepareEnvironment(['dummy-server']);
      const activeServers = (orchestrator as any).activeServers;
      const server = activeServers.get('dummy-server');
      const transport = server.transport;

      // Spy on transport.close or similar
      const closeSpy = vi.spyOn(transport, 'close');

      await (orchestrator as any).shutdownAll?.() || server.client.close();

      expect(activeServers.has('dummy-server')).toBe(false);
      // Stdio transport should be closed
    });
  });
});
