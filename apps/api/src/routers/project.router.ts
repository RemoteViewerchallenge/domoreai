import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { prisma } from '../db.js';
import { ProjectArchitect } from '../services/ProjectArchitect.js';
import { getDefaultAgentFactory } from '../services/AgentFactory.js';
import { projects } from '../db/schema.js';

export const projectRouter = createTRPCRouter({
  /**
   * Create a new project with its associated jobs.
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
        jobs: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
            roleId: z.string().optional(),
            dependsOn: z.number().optional(),
            parallelGroup: z.string().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { name, description } = input;

      const [project] = await ctx.db.insert(projects).values({
        name,
        description,
        status: 'planning',
      }).returning() as { id: string }[];

      const architect: ProjectArchitect = new ProjectArchitect(getDefaultAgentFactory());
      if (project && typeof project.id === 'string') {
        void architect.draftBlueprint(project.id, description)
          .then(() => console.log("Blueprint complete"))
          .catch(err => console.error("Blueprint failed", err));
      } else {
        console.error("Project creation failed or returned invalid ID.");
      }

      return project;
    }),

  /**
   * List all projects.
   */
  list: publicProcedure.query(async () => {
    return await prisma.project.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        jobs: true,
      },
    });
  }),

  /**
   * Get a single project by its ID, including all its jobs, tasks, and errands.
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await prisma.project.findUnique({
        where: { id: input.id },
        include: {
          jobs: {
            orderBy: {
              createdAt: 'asc',
            },
            include: {
              tasks: {
                include: {
                  errands: true,
                },
              },
              role: true,
            },
          },
        },
      });
    }),

  /**
   * Update a project's details.
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      console.log('Updating project:', input);
      return { status: 'ok', message: 'Project update placeholder' };
    }),

  /**
   * Delete a project by its ID.
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      console.log('Deleting project:', input);
      return { status: 'ok', message: 'Project delete placeholder' };
    }),

  /**
   * Get Constitution settings (Code Rules and Glossary) for a workspace
   */
  getConstitution: publicProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ input }) => {
      const workspace = await prisma.workspace.findUnique({
        where: { id: input.workspaceId },
        select: {
          codeRules: true,
          glossary: true,
        },
      });
      
      const glossary = (workspace?.glossary as Record<string, string>) || {};

      return {
        codeRules: workspace?.codeRules || '',
        glossary,
      };
    }),

  /**
   * Update Constitution settings (Code Rules and Glossary) for a workspace
   */
  updateConstitution: publicProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        codeRules: z.string().optional(),
        glossary: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { workspaceId, codeRules, glossary } = input;
      
      const updated = await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          ...(codeRules !== undefined && { codeRules }),
          ...(glossary !== undefined && { glossary }),
          updatedAt: new Date(),
        },
      });
      
      return {
        success: true,
        codeRules: updated.codeRules,
        glossary: updated.glossary as Record<string, string>,
      };
    }),
});
