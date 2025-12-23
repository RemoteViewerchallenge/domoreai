#!/usr/bin/env tsx
import { prisma } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Frontmatter {
  name?: string;
  description?: string;
  tools?: string;
}

async function importRoles() {
  try {
    const agentsDir = path.resolve(__dirname, '../../data/agents/en');
    
    if (!fs.existsSync(agentsDir)) {
      throw new Error(`Agents directory not found at ${agentsDir}`);
    }

    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    let count = 0;

    for (const file of files) {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
      
      // Parse frontmatter
      const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      
      const frontmatter: Frontmatter & Record<string, string | undefined> = {};
      let body = content;

      if (match) {
        const fmString = match[1];
        body = match[2].trim();
        
        fmString.split('\n').forEach(line => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join(':').trim();
            frontmatter[key] = value;
          }
        });
      } else {
        frontmatter.name = file.replace('.md', '');
      }

      // Parse tools
      let tools: string[] = [];
      if (frontmatter.tools) {
        tools = frontmatter.tools.split(',').map((t: string) => t.trim());
      }

      // Upsert Role
      await prisma.role.upsert({
        where: { name: frontmatter.name || file.replace('.md', '') },
        update: {
          basePrompt: body,
          tools: {
            deleteMany: {},
            create: tools.map((t: string) => ({
              tool: {
                connectOrCreate: {
                  where: { name: t },
                  create: {
                    name: t,
                    description: `Imported tool: ${t}`,
                    instruction: `Use the ${t} tool as needed.`,
                    schema: '{}'
                  }
                }
              }
            }))
          },
          metadata: { description: frontmatter.description }
        },
        create: {
          name: frontmatter.name || file.replace('.md', ''),
          basePrompt: body,
          tools: {
            create: tools.map((t: string) => ({
              tool: {
                connectOrCreate: {
                  where: { name: t },
                  create: {
                    name: t,
                    description: `Imported tool: ${t}`,
                    instruction: `Use the ${t} tool as needed.`,
                    schema: '{}'
                  }
                }
              }
            }))
          },
          metadata: { description: frontmatter.description }
        }
      });
      
      console.log(`✅ Imported: ${frontmatter.name || file}`);
      count++;
    }

    console.log(`\n🎉 Successfully imported ${count} roles!`);
    
    // Show all roles
    const allRoles = await prisma.role.findMany({
      include: {
        tools: { include: { tool: true } }
      }
    });
    
    console.log('\nRoles in database:');
    allRoles.forEach(role => {
      console.log(`  - ${role.name}: [${role.tools.map(rt => rt.tool.name).join(', ')}]`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

void importRoles();
