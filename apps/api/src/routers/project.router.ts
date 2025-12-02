import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { db as prisma } from '../db.js';

export const projectRouter = createTRPCRouter({
  /**
   * Create a new project with its associated jobs.
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
        jobs: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
            roleId: z.string().optional(),
            dependsOn: z.number().optional(), // Index of the job it depends on in the array
            parallelGroup: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const { name, description, priority, jobs } = input;

      return await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            name,
            description,
            priority,
          },
        });

        const createdJobs: { [index: number]: { id: string } } = {};

        for (const [index, jobInput] of jobs.entries()) {
          const createdJob = await tx.job.create({
            data: {
              name: jobInput.name,
              description: jobInput.description,
              priority: jobInput.priority,
              projectId: project.id,
              roleId: jobInput.roleId,
              parallelGroup: jobInput.parallelGroup,
              dependsOnJobId:
                jobInput.dependsOn !== undefined && createdJobs[jobInput.dependsOn]
                  ? createdJobs[jobInput.dependsOn].id
                  : undefined,
            },
          });
          createdJobs[index] = { id: createdJob.id };
        }

        return project;
      });
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
        jobs: true, // Include jobs for a high-level overview
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
              role: true, // Include the assigned role information
            },
          },
        },
      });
    }),

  /**
   * Update a project's details.
   * (Placeholder for future implementation)
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
    .mutation(async ({ input }) => {
      // Logic to update the project will be implemented here.
      console.log('Updating project:', input);
      return { status: 'ok', message: 'Project update placeholder' };
    }),

  /**
   * Delete a project by its ID.
   * (Placeholder for future implementation)
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Logic to delete the project will be implemented here.
      console.log('Deleting project:', input);
      return { status: 'ok', message: 'Project delete placeholder' };
    }),
});
