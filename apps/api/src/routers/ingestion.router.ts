import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc.js";
import { prisma } from "../db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory equivalent to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ingestionRouter = createTRPCRouter({
  importModels: publicProcedure.mutation(async () => {
    try {
      // 1. Read models.json
      // Path relative to: apps/api/src/routers -> apps/api/latest_models/models.json
      const modelsPath = path.resolve(__dirname, "../../latest_models/models.json");
      
      if (!fs.existsSync(modelsPath)) {
        throw new Error(`Models file not found at ${modelsPath}`);
      }

      const fileContent = fs.readFileSync(modelsPath, "utf-8");
      const models = JSON.parse(fileContent);

      let count = 0;

      for (const m of models) {
        // Ensure provider exists (simple upsert or find)
        // We assume "provider" field map to "type" or "label" in ProviderConfig.
        // For now, we'll try to find a provider with that type, or create a 'system' one.
        
        // This is a bit tricky because ProviderConfig is usually user-managed (API Keys).
        // WE will try to look up by 'type' (e.g. google, groq).
        // If not found, we might skip or create a placeholder.
        // For this task, let's upsert a placeholder provider if missing, to ensure foreign key constraints are met.
        
        const providerSlug = m.provider.toLowerCase();
        
        let provider = await prisma.providerConfig.findFirst({
          where: { type: providerSlug }
        });

        if (!provider) {
             // Create a placeholder provider to link models to
             provider = await prisma.providerConfig.create({
                 data: {
                     label: `${m.provider} (System)`,
                     type: providerSlug,
                     apiKey: "PLACEHOLDER_SYSTEM_IMPORT",
                     isEnabled: true
                 }
             });
        }

        // Upsert Model
        await prisma.model.upsert({
          where: {
            providerId_modelId: {
                providerId: provider.id,
                modelId: m.model_id
            }
          },
          update: {
            name: m.name,
            providerData: m,
            isFree: m.is_free,
            specs: {
                contextWindow: m.context_window,
                type: m.type
            }
          },
          create: {
            providerId: provider.id,
            modelId: m.model_id,
            name: m.name,
            providerData: m,
            isFree: m.is_free,
            specs: {
                contextWindow: m.context_window,
                type: m.type
            }
          }
        });
        count++;
      }

      return { success: true, count, message: `Imported ${count} models.` };

    } catch (error) {
      console.error("Import Models Error:", error);
      throw new Error(`Failed to import models: ${(error as Error).message}`);
    }
  }),

  importRoles: publicProcedure.mutation(async () => {
    try {
        // Path relative to: apps/api/src/routers -> apps/api/data/agents/en/
        const agentsDir = path.resolve(__dirname, "../../data/agents/en");

        if (!fs.existsSync(agentsDir)) {
            throw new Error(`Agents directory not found at ${agentsDir}`);
        }

        const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
        let count = 0;

        for (const file of files) {
            const content = fs.readFileSync(path.join(agentsDir, file), "utf-8");
            
            // Simple regex frontmatter parser
            const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
            
            let frontmatter: any = {};
            let body = content;

            if (match) {
                const fmString = match[1];
                body = match[2].trim();
                
                // Parse simple key: value lines
                fmString.split('\n').forEach(line => {
                    const parts = line.split(':');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const value = parts.slice(1).join(':').trim();
                        frontmatter[key] = value;
                    }
                });
            } else {
                // Fallback if no frontmatter
                frontmatter = { name: file.replace('.md', '') };
            }

            // Clean up tools if csv
            let tools = [];
            if (frontmatter.tools) {
                tools = frontmatter.tools.split(',').map((t: string) => t.trim());
            }

            // Upsert Role
            await prisma.role.upsert({
                where: { name: frontmatter.name || file.replace('.md', '') },
                update: {
                    basePrompt: body,
                    tools: tools,
                    // If description is in frontmatter, maybe store in metadata?
                    metadata: { description: frontmatter.description }
                },
                create: {
                    name: frontmatter.name || file.replace('.md', ''),
                    basePrompt: body,
                    tools: tools,
                    metadata: { description: frontmatter.description }
                }
            });
            count++;
        }

        return { success: true, count, message: `Imported ${count} roles.` };
    } catch (error) {
        console.error("Import Roles Error:", error);
        throw new Error(`Failed to import roles: ${(error as Error).message}`);
    }
  })
});
