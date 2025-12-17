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
interface DepartmentInfo {
  name: string;
  category: string;
  dependencies: string[];
  roleName: string;
  description: string;
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

/**
 * Identify department type based on dependencies
 */
function identifyDepartment(dependencies: Record<string, string>): DepartmentInfo | null {
  const depNames = Object.keys(dependencies);
  
  // Frontend Department Detection
  const hasFrontend = depNames.some(dep => 
    ['react', 'vue', 'angular', 'svelte', 'solid-js'].includes(dep)
  );
  const hasTailwind = depNames.includes('tailwindcss');
  const hasFlyonUI = depNames.includes('flyonui') || depNames.includes('daisyui');
  
  if (hasFrontend) {
    const frameworks = [];
    if (depNames.includes('react')) frameworks.push('React');
    if (depNames.includes('vue')) frameworks.push('Vue');
    if (depNames.includes('angular')) frameworks.push('Angular');
    if (depNames.includes('svelte')) frameworks.push('Svelte');
    
    const styling = [];
    if (hasTailwind) styling.push('TailwindCSS');
    if (hasFlyonUI) styling.push('FlyonUI');
    if (depNames.includes('daisyui')) styling.push('DaisyUI');
    
    const techStack = [...frameworks, ...styling].join(', ');
    
    return {
      name: 'Frontend',
      category: 'Frontend Department',
      dependencies: depNames,
      roleName: 'Frontend Lead',
      description: `Frontend development specialist with expertise in ${techStack}`,
    };
  }
  
  // Backend Department Detection
  const hasBackend = depNames.some(dep => 
    ['express', '@nestjs/core', 'fastify', 'koa', 'hapi'].includes(dep)
  );
  const hasPrisma = depNames.includes('@prisma/client') || depNames.includes('prisma');
  
  if (hasBackend || hasPrisma) {
    const frameworks = [];
    if (depNames.includes('express')) frameworks.push('Express');
    if (depNames.includes('@nestjs/core')) frameworks.push('NestJS');
    if (depNames.includes('fastify')) frameworks.push('Fastify');
    
    const data = [];
    if (hasPrisma) data.push('Prisma ORM');
    if (depNames.includes('pg')) data.push('PostgreSQL');
    if (depNames.includes('mongodb')) data.push('MongoDB');
    if (depNames.includes('redis')) data.push('Redis');
    
    const techStack = [...frameworks, ...data].join(', ');
    
    return {
      name: 'Backend',
      category: 'Backend Department',
      dependencies: depNames,
      roleName: 'Backend Architect',
      description: `Backend development specialist with expertise in ${techStack}`,
    };
  }
  
  return null;
}

/**
 * Generate a tech-stack-specific system prompt
 */
function generateDepartmentPrompt(dept: DepartmentInfo): string {
  const techList = dept.dependencies
    .filter(dep => !dep.startsWith('@types/'))
    .slice(0, 15) // Limit to top 15 dependencies
    .map(dep => `- ${dep}`)
    .join('\n');
  
  return `## ROLE: ${dept.roleName}

**DEPARTMENT:** ${dept.category}
**DESCRIPTION:** ${dept.description}

**DETECTED TECH STACK:**
${techList}

**CORE RESPONSIBILITIES:**
- Architect and implement features using the detected technology stack
- Ensure code quality, maintainability, and best practices
- Collaborate with other departments to deliver cohesive solutions
- Leverage the specific frameworks and libraries in this project

**TECHNICAL EXPERTISE:**
You are an expert in the technologies listed above. When working on this project:
1. Use the exact dependencies and versions installed in this codebase
2. Follow the architectural patterns already established in the project
3. Ensure compatibility with the existing tech stack
4. Provide solutions that integrate seamlessly with current implementations

**INSTRUCTIONS:**
- Always check the actual package.json and codebase before making assumptions
- Prioritize solutions that use the installed dependencies
- Maintain consistency with existing code style and patterns
- Consider the full stack context when making architectural decisions`;
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

    // Step 2: Analyze each package.json and identify departments
    const departments = new Map<string, DepartmentInfo>();
    
    for (const pkgPath of packageJsonFiles) {
      try {
        const content = await fs.readFile(pkgPath, 'utf-8');
        const pkg = JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
        
        const allDeps: Record<string, string> = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };
        
        const dept = identifyDepartment(allDeps);
        
        if (dept) {
          // Use department name as key to avoid duplicates
          if (!departments.has(dept.name)) {
            departments.set(dept.name, dept);
            console.log(`  ✓ Identified ${dept.name} Department in ${path.relative(rootPath, pkgPath)}`);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Failed to parse ${pkgPath}: ${errorMsg}`);
        console.error(`  ✗ Error parsing ${pkgPath}:`, errorMsg);
      }
    }
    
    stats.departments = departments.size;
    console.log(`\n🏗️  Identified ${departments.size} unique departments\n`);

    // Step 3: Create or update roles for each department
    for (const [_deptName, dept] of departments) {
      try {
        // Ensure category exists
        const category = await prisma.roleCategory.upsert({
          where: { name: dept.category },
          update: {},
          create: { name: dept.category },
        });

        // Generate the tech-stack-specific prompt
        const systemPrompt = generateDepartmentPrompt(dept);
        
        // Determine appropriate tools based on department
        const tools: string[] = ['filesystem', 'terminal'];
        if (dept.name === 'Frontend') {
          tools.push('browser');
        }
        
        // Check if role already exists
        const existing = await prisma.role.findUnique({
          where: { name: dept.roleName },
        });

        if (existing) {
          // Update existing role with new tech stack info
          await prisma.role.update({
            where: { name: dept.roleName },
            data: {
              basePrompt: systemPrompt,
              tools: tools,
              categoryId: category.id,
              categoryString: dept.category,
              description: dept.description,
              metadata: {
                needsReasoning: true,
                needsCoding: true,
                minContext: 8192,
                maxContext: 128000,
                detectedDependencies: dept.dependencies,
              },
            } as any,
          });
          stats.rolesUpdated++;
          console.log(`  ♻️  Updated role: ${dept.roleName}`);
        } else {
          // Create new role
          await prisma.role.create({
            data: {
              name: dept.roleName,
              basePrompt: systemPrompt,
              tools: tools,
              categoryId: category.id,
              categoryString: dept.category,
              description: dept.description,
              metadata: {
                needsReasoning: true,
                needsCoding: true,
                minContext: 8192,
                maxContext: 128000,
                detectedDependencies: dept.dependencies,
              },
            } as any,
          });
          stats.rolesCreated++;
          console.log(`  ✨ Created role: ${dept.roleName}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Failed to create/update role for ${dept.roleName}: ${errorMsg}`);
        console.error(`  ✗ Error creating role for ${dept.roleName}:`, errorMsg);
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
