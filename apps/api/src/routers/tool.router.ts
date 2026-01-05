
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc.js";
import { prisma } from "../db.js";

const createToolSchema = z.object({
  name: z.string().min(1, "Name is required (snake_case preferred)."),
  description: z.string().min(1, "Description is required."),
  instruction: z.string().min(1, "Instruction (Tool Prompt) is required."),
  schema: z.string().min(2, "Schema must be a valid JSON string (Zod).").default("{}"),
  isEnabled: z.boolean().default(true),
  implementation: z.string().optional(),
});

const updateToolSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  instruction: z.string().optional(),
  schema: z.string().optional(),
  isEnabled: z.boolean().optional(),
  implementation: z.string().optional(),
});

export const toolRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return prisma.tool.findMany({
      orderBy: { name: "asc" },
    });
  }),

  // Get tool by ID (useful for editing)
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.tool.findUnique({
        where: { id: input.id },
      });
    }),

  create: publicProcedure
    .input(createToolSchema)
    .mutation(async ({ input }) => {
        // Validate Schema JSON
        try {
            JSON.parse(input.schema);
        } catch (e) {
            throw new Error("Invalid JSON Schema.");
        }

        return prisma.tool.create({
            data: {
                name: input.name,
                description: input.description,
                instruction: input.instruction,
                schema: input.schema,
                isEnabled: input.isEnabled,
                // implementation: input.implementation
            }
        });
    }),

  update: publicProcedure
    .input(updateToolSchema)
    .mutation(async ({ input }) => {
        const { id, ...data } = input;
        
        if (data.schema) {
             try {
                JSON.parse(data.schema);
            } catch (e) {
                throw new Error("Invalid JSON Schema.");
            }
        }

        return prisma.tool.update({
            where: { id },
            data: data
        });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
        return prisma.tool.delete({
            where: { id: input.id }
        });
    }),
});
