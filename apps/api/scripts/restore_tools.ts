import { prisma } from '../src/db.js';

const tools = [
  // --- SYSTEM TOOLS ---
  {
    name: 'filesystem',
    description: 'System Tool (Auto-seeded)',
    instruction: `
type FilesystemTool = {
  // Read a file from the local filesystem at the given path.
  readFile: (args: { path: string }) => Promise<string>;
  
  // Write content to a file at the given path. Overwrites existing content.
  writeFile: (args: { path: string; content: string }) => Promise<{ success: boolean }>;
  
  // List all files and directories in the specified directory path.
  listFiles: (args: { path: string }) => Promise<Array<{ name: string; isDir: boolean }>>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
  {
    name: 'search_codebase',
    description: 'System Tool (Auto-seeded)',
    instruction: `
type SearchCodebaseTool = {
  // Semantic search over the codebase using vector embeddings.
  // Use this to find relevant code snippets or documentation.
  search_codebase: (args: { 
    query: string; // The search query
    limit?: number; // Max results to return (default 5)
  }) => Promise<string>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
  {
    name: 'research_browser',
    description: 'System Tool (Auto-seeded)',
    instruction: `
type ResearchBrowserTool = {
  // Fetch a web page, returning its title and readable content.
  // Useful for general browsing and reading.
  fetchPage: (args: { url: string }) => Promise<{ title: string; content: string }>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
  {
    name: 'web_scrape',
    description: 'Auto-generated tool for web_scrape',
    instruction: `
type WebScrapeTool = {
  // Fetch a URL and return extracted content as markdown and text.
  // Useful for extracting data or reading long-form content.
  fetchPageAsMarkdown: (args: { url: string }) => Promise<{ title: string; markdown: string; text: string }>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
  {
    name: 'research.web_scrape',
    description: 'Auto-generated tool for research.web_scrape',
    instruction: `
type WebScrapeTool = {
  // Fetch a URL and return extracted content as markdown and text.
  // Useful for extracting data or reading long-form content.
  fetchPageAsMarkdown: (args: { url: string }) => Promise<{ title: string; markdown: string; text: string }>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },

  // --- MCP TOOLS ---
  {
    name: 'git_status',
    description: 'Show working tree status',
    instruction: `
type GitTools = {
  // Show the working tree status, including staged, unstaged, and untracked files.
  git_status: (args: {}) => Promise<string>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
  {
    name: 'git_diff',
    description: 'Show changes between commits, commit and working tree, etc',
    instruction: `
type GitTools = {
  // Show changes between the working tree and the index or a tree, 
  // changes between the index and a tree, changes between two trees, 
  // or changes between two files on disk.
  git_diff: (args: { target?: string }) => Promise<string>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
  {
    name: 'git_log',
    description: 'Show commit logs',
    instruction: `
type GitTools = {
  // Show the commit logs.
  git_log: (args: { max_count?: number }) => Promise<string>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
  {
    name: 'postgres_query',
    description: 'Execute a read-only SQL query',
    instruction: `
type PostgresTools = {
  // Execute a read-only SQL query against the database.
  query: (args: { sql: string }) => Promise<any[]>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
  {
    name: 'postgres_get_schema',
    description: 'Get database schema information',
    instruction: `
type PostgresTools = {
  // Get the database schema, including table names and column definitions.
  get_schema: (args: {}) => Promise<string>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
  {
    name: 'playwright_navigate',
    description: 'Navigate to a URL using Playwright',
    instruction: `
type PlaywrightTools = {
  // Navigate the browser to the specified URL.
  navigate: (args: { url: string }) => Promise<void>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
  {
    name: 'playwright_click',
    description: 'Click an element using Playwright',
    instruction: `
type PlaywrightTools = {
  // Click an element identified by the selector.
  click: (args: { selector: string }) => Promise<void>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
  {
    name: 'playwright_screenshot',
    description: 'Take a screenshot using Playwright',
    instruction: `
type PlaywrightTools = {
  // Take a screenshot of the current page.
  screenshot: (args: { path?: string }) => Promise<void>;
};
`.trim(),
    schema: '{}',
    isEnabled: true,
  },
];

async function main() {
  console.log('Restoring tools (System + MCP) with TypeScript definitions...');
  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { name: tool.name },
      update: tool,
      create: tool,
    });
    console.log(`Restored tool: ${tool.name}`);
  }
  console.log('Tool restoration complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
