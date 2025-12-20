import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { ProviderManager } from './ProviderManager.js';

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
                categoryId: category.id,
                categoryString: categoryName,
                metadata: {
                  needsReasoning: needsReasoning,
                },
              } as any,
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
                categoryId: category.id,
                categoryString: categoryName,
                metadata: {
                  needsReasoning: needsReasoning,
                  minContext: 4096,
                  maxContext: 128000,
                },
              } as any,
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

/**
 * Department detection based on package.json dependencies
 */
interface GeneratedRole {
  name: string;
  description: string;
  tools: string[];
  isManager: boolean;
}

/**
 * Recursively find all package.json files in a directory tree
 */
async function findPackageJsonFiles(rootPath: string): Promise<string[]> {
  const packageJsonFiles: string[] = [];
  
  async function scan(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip node_modules and hidden directories
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.name === 'package.json') {
          packageJsonFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.warn(`Could not read directory ${dirPath}:`, error);
    }
  }
  
  await scan(rootPath);
  return packageJsonFiles;
}

async function getTopFiles(dirPath: string, limit: number = 20): Promise<string[]> {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = entries
            .filter(e => e.isFile() && !e.name.startsWith('.'))
            .map(e => e.name);
        return files.slice(0, limit);
    } catch (error) {
        return [];
    }
}

/**
 * Identify roles using AI
 */
async function identifyRolesWithAI(
  dependencies: Record<string, string>,
  fileList: string[],
  pkgName: string
): Promise<GeneratedRole[]> {
  const providerManager = ProviderManager.getInstance();
  
  // Try to get gpt-4o-mini, or fallback to any model
  // We'll search for a model with 'gpt-4o-mini' in ID or name, or just use first available
  const allModels = await providerManager.getAllModels();
  let modelId = allModels.find(m => m.id.includes('gpt-4o-mini'))?.id;
  
  if (!modelId && allModels.length > 0) {
      modelId = allModels[0].id;
  }
  
  if (!modelId) {
      throw new Error("No AI models available for Role Ingestion");
  }
  
  // Find provider for this model
  // Simplified lookup: we need the provider instance.
  // We can iterate providers to find who owns this model.
  // ProviderManager doesn't expose `getProviderForModel` directly efficiently,
  // but we can guess or use `getProvider` if we know the provider ID.
  // Actually, LLMModel interface has providerId.
  const model = allModels.find(m => m.id === modelId);
  const providerId = model?.providerId || model?.provider;

  if (!providerId) {
       throw new Error(`Provider not found for model ${modelId}`);
  }
  
  const provider = providerManager.getProvider(providerId);
  if (!provider) {
      throw new Error(`Provider instance not found for ID ${providerId}`);
  }

  const prompt = `
  You are a Corporate Recruiter for a software company.
  Analyze the following project to determine the necessary team roles.

  Project Name: ${pkgName}
  Top Files: ${fileList.join(', ')}
  Dependencies: ${JSON.stringify(dependencies, null, 2)}

  Rule: If the directory/dependency list suggests a large or complex project (e.g. many frameworks, many files), create specialized 'Worker' roles (e.g., 'TailwindCSS Tweaker', 'API Schema Validator') and ONE 'Manager' role (e.g., 'Frontend Lead').
  If simple, just one Manager role might suffice.

  Output strictly a JSON array with this schema:
  [{ "name": "string", "description": "string", "tools": ["string"], "isManager": boolean }]

  Allowed tools: 'filesystem', 'terminal', 'browser'.
  `;

  try {
      const response = await provider.generateCompletion({
          modelId: modelId,
          messages: [{ role: 'user', content: prompt }]
      });

      // Clean markdown code blocks if present
      const jsonStr = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonStr);
  } catch (error) {
      console.error("AI Role Generation failed:", error);
      return [];
  }
}

/**
 * Corporate Recruiter: Automatically staff the organization based on detected tech stacks
 * 
 * This function scans a project directory for package.json files, identifies departments
 * based on dependencies, and creates specialized roles with tech-stack-specific prompts.
 */
export async function onboardProject(
  rootPath: string,
  prisma: PrismaClient
): Promise<{ 
  scanned: number; 
  departments: number; 
  rolesCreated: number; 
  rolesUpdated: number;
  errors: string[];
}> {
  const stats = {
    scanned: 0,
    departments: 0,
    rolesCreated: 0,
    rolesUpdated: 0,
    errors: [] as string[],
  };

  console.log(`\n🏢 [Corporate Recruiter] Starting project onboarding...`);
  console.log(`📂 Root Path: ${rootPath}\n`);

  try {
    // Step 1: Find all package.json files
    const packageJsonFiles = await findPackageJsonFiles(rootPath);
    stats.scanned = packageJsonFiles.length;
    
    console.log(`📦 Found ${packageJsonFiles.length} package.json files`);

    // Step 2: Analyze each package.json and identify roles via AI
    // We will now iterate and process immediately instead of buffering "departments"
    
    for (const pkgPath of packageJsonFiles) {
      try {
        const dirPath = path.dirname(pkgPath);
        const content = await fs.readFile(pkgPath, 'utf-8');
        const pkg = JSON.parse(content) as { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
        
        const allDeps: Record<string, string> = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };
        
        const fileList = await getTopFiles(dirPath);
        
        console.log(`  🤖 Asking AI to staff ${pkg.name || 'project'} in ${path.relative(rootPath, dirPath)}...`);
        
        // Call AI
        const generatedRoles = await identifyRolesWithAI(allDeps, fileList, pkg.name || 'Unnamed Project');
        
        if (generatedRoles.length > 0) {
            console.log(`  ✓ AI suggested ${generatedRoles.length} roles.`);

            // Step 3: Save to DB
            for (const roleData of generatedRoles) {
                 try {
                    // Determine category (Generic "AI Recruited" for now, or derive from isManager)
                    const categoryName = roleData.isManager ? 'Management' : 'Engineering';

                    const category = await prisma.roleCategory.upsert({
                        where: { name: categoryName },
                        update: {},
                        create: { name: categoryName },
                    });

                    const existing = await prisma.role.findUnique({
                        where: { name: roleData.name },
                    });

                    const metadata = {
                        needsReasoning: roleData.isManager, // Managers get reasoning
                        needsCoding: true,
                        minContext: 8192,
                        maxContext: 128000,
                        generatedBy: 'AI Recruiter',
                        sourcePackage: pkgPath
                    };

                    if (existing) {
                        await prisma.role.update({
                            where: { name: roleData.name },
                            data: {
                                description: roleData.description,
                                basePrompt: `You are ${roleData.name}. ${roleData.description}`,
                                tools: roleData.tools,
                                categoryId: category.id,
                                categoryString: categoryName,
                                metadata: metadata,
                            } as any
                        });
                        stats.rolesUpdated++;
                    } else {
                        await prisma.role.create({
                            data: {
                                name: roleData.name,
                                description: roleData.description,
                                basePrompt: `You are ${roleData.name}. ${roleData.description}`,
                                tools: roleData.tools,
                                categoryId: category.id,
                                categoryString: categoryName,
                                metadata: metadata,
                            } as any
                        });
                        stats.rolesCreated++;
                    }
                    console.log(`    - Processed Role: ${roleData.name} (${roleData.isManager ? 'Manager' : 'Worker'})`);

                 } catch (err) {
                     console.error(`    ✗ Failed to save role ${roleData.name}:`, err);
                 }
            }
        } else {
            console.log(`  ? AI returned no roles for ${pkgPath}`);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Failed to process ${pkgPath}: ${errorMsg}`);
        console.error(`  ✗ Error processing ${pkgPath}:`, errorMsg);
      }
    }

    console.log(`\n✅ [Corporate Recruiter] Onboarding complete!`);
    console.log(`   📊 Stats:`);
    console.log(`      - Package.json files scanned: ${stats.scanned}`);
    console.log(`      - Departments identified: ${stats.departments}`);
    console.log(`      - Roles created: ${stats.rolesCreated}`);
    console.log(`      - Roles updated: ${stats.rolesUpdated}`);
    if (stats.errors.length > 0) {
      console.log(`      - Errors: ${stats.errors.length}`);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stats.errors.push(`Fatal error: ${errorMsg}`);
    console.error('❌ [Corporate Recruiter] Fatal error:', errorMsg);
  }

  return stats;
}
