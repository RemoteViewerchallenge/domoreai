import { ToolDefinition } from '../protocols/LocalProtocol.js';
import { createFsTools } from '../../tools/filesystem.js';
import { browserTools } from '../../tools/browser.js';
import { webScraperTool } from '../../tools/webScraper.js';
import { complexityTool } from '../../tools/complexityTool.js';
import { terminalTools } from '../../tools/terminal.js';
import { listFilesTree, searchCodebase } from '@repo/mcp-server-vfs';
import { vfsSessionService } from '../vfsSession.service.js';

export function getNativeTools(rootPath: string, fsTools: ReturnType<typeof createFsTools>): ToolDefinition[] {
     return [
        {
            name: 'read_file',
            handler: async (args: unknown) => fsTools.readFile(args as { path: string }),
            description: 'Read a file',
            input_schema: {
                type: 'object',
                properties: {
                    path: { type: 'string' }
                },
                required: ['path']
            }
        },
        {
            name: 'write_file',
            handler: async (args: unknown) => fsTools.writeFile(args as { path: string; content: string }),
            description: 'Write to a file',
            input_schema: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    content: { type: 'string' }
                },
                required: ['path', 'content']
            }
        },
        {
            name: 'list_files',
            handler: async (args: unknown) => fsTools.listFiles(args as { path: string }),
            description: 'List files in a directory',
            input_schema: {
                type: 'object',
                properties: {
                    path: { type: 'string' }
                },
                required: ['path']
            }
        },
        {
            name: 'browse',
            handler: async (args: unknown) => browserTools.fetchPage(args as { url: string }),
            description: 'Fetch a web page',
            input_schema: {
                type: 'object',
                properties: {
                    url: { type: 'string' }
                },
                required: ['url']
            }
        },
        {
          name: webScraperTool.name,
          handler: async (args: unknown) => webScraperTool.handler(args as { url: string }),
          description: webScraperTool.description,
          input_schema: webScraperTool.input_schema
        },
        {
          name: complexityTool.name,
          handler: async (args: unknown) => complexityTool.handler(args as { taskDescription: string }),
          description: complexityTool.description,
          input_schema: complexityTool.input_schema
        },
        {
            name: 'terminal_execute',
            handler: async (args: unknown) => {
                // delegate to the centralized terminal tool implementation
                // Use zod validation instead of casting
                const parsedArgs = terminalTools.execute.inputSchema.parse(args);
                return await (terminalTools.execute.handler as any)(parsedArgs);
            },
            description: terminalTools.execute.description,
            input_schema: terminalTools.execute.inputSchema as unknown as Record<string, unknown>
        },
        {
            name: 'search_codebase',
            handler: async (args: unknown) => {
                const typedArgs = args as { query: string };
                const fs = await vfsSessionService.getProvider({ provider: 'local', rootPath: rootPath });
                return searchCodebase(fs, typedArgs.query);
            },
            description: 'Search the codebase for a string',
            input_schema: {
                type: 'object',
                properties: {
                    query: { type: 'string' }
                },
                required: ['query']
            }
        },
        {
            name: 'list_files_tree',
            handler: async () => {
                const fs = await vfsSessionService.getProvider({ provider: 'local', rootPath: rootPath });
                return listFilesTree(fs, '/');
            },
            description: 'List files in a tree structure',
            input_schema: {
                type: 'object',
                properties: {},
                required: []
            }
        }
     ];
}
