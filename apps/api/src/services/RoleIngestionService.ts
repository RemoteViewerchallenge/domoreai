import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

interface AgentData {
  name: string;
  description: string;
  tools: string[];
  category?: string;
  systemPrompt: string;
}

/**
 * Parses frontmatter and body from markdown agent files
 */
function parseMarkdownAgent(content: string): AgentData {
  // Extract frontmatter (between --- markers)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error('Invalid markdown: missing frontmatter');
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.substring(frontmatterMatch[0].length).trim();

  // Parse YAML-like frontmatter
  const parseFrontmatterField = (key: string): string | string[] => {
    const regex = new RegExp(`^${key}:\\s*(.*)$`, 'm');
    const match = frontmatter.match(regex);
    if (!match) return key === 'tools' ? [] : '';

    const value = match[1].trim();
    if (key === 'tools') {
      // Split comma-separated tools
      return value
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }
    return value;
  };

  const name = parseFrontmatterField('name') as string;
  const description = parseFrontmatterField('description') as string;
  const category = parseFrontmatterField('category') as string;
  const tools = parseFrontmatterField('tools') as string[];

  return {
    name,
    description,
    tools,
    category: category || 'Uncategorized',
    systemPrompt: body,
  };
}

/**
 * Tool name mapping from agent definitions to actual system tools
 */
const TOOL_MAPPING: Record<string, string[]> = {
  // File system operations
  'read': ['filesystem'],
  'write': ['filesystem'],
  'edit': ['filesystem'],
  'multiEdit': ['filesystem'],
  'grep': ['filesystem'],
  
  // Terminal/shell operations
  'bash': ['terminal'],
  'shell': ['terminal'],
  'command': ['terminal'],
  
  // Web/browser operations
  'browser': ['browser'],
  'http': ['browser'],
  'web': ['browser'],
  
  // Meta/system operations
  'git': ['meta'],
  'system': ['meta'],
  'meta': ['meta'],
};

/**
 * Get available system tools
 */
const AVAILABLE_TOOLS = new Set(['filesystem', 'terminal', 'browser', 'meta']);

/**
 * Filter tools to only include those that exist in the system
 * Maps agent tool names (Read, Write, Bash, etc.) to repo tools (filesystem, terminal, browser, meta)
 */
function filterAvailableTools(tools: string[]): string[] {
  const mapped = new Set<string>();
  
  for (const tool of tools) {
    const normalized = tool.toLowerCase();
    const mappedTools = TOOL_MAPPING[normalized];
    
    if (mappedTools) {
      // Add all mapped tools that exist in the system
      mappedTools.forEach((t) => {
        if (AVAILABLE_TOOLS.has(t)) {
          mapped.add(t);
        }
      });
    } else {
      // If no mapping found, try direct match (in case tool is already a system tool)
      if (AVAILABLE_TOOLS.has(normalized)) {
        mapped.add(normalized);
      }
    }
  }
  
  return Array.from(mapped);
}

/**
 * Determines if an agent should have reasoning enabled based on description/tools
 */
function shouldNeedReasoning(description: string, systemPrompt: string): boolean {
  const reasoningKeywords = [
    'analysis',
    'complex',
    'reasoning',
    'planning',
    'strategy',
    'research',
    'architect',
  ];
  const combined = `${description} ${systemPrompt}`.toLowerCase();
  return reasoningKeywords.some((keyword) => combined.includes(keyword));
}

/**
 * Ingest agent markdown files from a directory into the Role table
 */
export async function ingestAgentLibrary(
  agentsDir: string,
  prisma: PrismaClient
): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
  const stats = { created: 0, updated: 0, failed: 0, errors: [] as string[] };
  const createdNames = new Set<string>();

  try {
    // Read all .md files from the agents directory
    const files = await fs.readdir(agentsDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    console.log(`Found ${mdFiles.length} agent files in ${agentsDir}`);

    for (const file of mdFiles) {
      try {
        const filePath = path.join(agentsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');

        const agentData = parseMarkdownAgent(content);

        // Validate required fields
        if (!agentData.name || !agentData.systemPrompt) {
          stats.failed++;
          stats.errors.push(`${file}: missing name or system prompt`);
          continue;
        }

        const filteredTools = filterAvailableTools(agentData.tools);
        const needsReasoning = shouldNeedReasoning(
          agentData.description,
          agentData.systemPrompt
        );

        // Manage RoleCategory
        const categoryName = agentData.category || 'Uncategorized';
        // Upsert permissionless, assuming name is unique
        const category = await prisma.roleCategory.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName }
        });

        // Check if role already exists
        const existing = await prisma.role.findUnique({
          where: { name: agentData.name },
        });

        if (existing) {
          // Update existing role
          await prisma.role.update({
            where: { name: agentData.name },
            data: {
              basePrompt: agentData.systemPrompt,
              tools: filteredTools,
              category: { connect: { id: category.id } },
              categoryString: categoryName,
              metadata: {
                needsReasoning: needsReasoning
              }, 
            } as import('@prisma/client').Prisma.RoleUpdateInput,
          });
          stats.updated++;
          createdNames.add(agentData.name);
        } else {
           // Create new role
           await prisma.role.create({
             data: {
               name: agentData.name,
               basePrompt: agentData.systemPrompt,
               tools: filteredTools,
               category: { connect: { id: category.id } },
               categoryString: categoryName,
               metadata: {
                 needsReasoning: needsReasoning,
                 minContext: 4096,
                 maxContext: 128000
               },
             } as import('@prisma/client').Prisma.RoleCreateInput,
           });
           stats.created++;
           createdNames.add(agentData.name);
        }

        console.log(`✓ Ingested role: ${agentData.name}`);
      } catch (error) {
        stats.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`${file}: ${errorMsg}`);
        console.error(`✗ Failed to ingest ${file}:`, errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stats.errors.push(`Directory read error: ${errorMsg}`);
    console.error('Fatal error reading agents directory:', errorMsg);
  }

  return stats;
}
