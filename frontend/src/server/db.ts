import fs from 'fs';
import path from 'path';

const mockDataPath = (filename: string) => path.join(process.cwd(), 'src/server/api/mockData', filename);

const workspaces = JSON.parse(fs.readFileSync(mockDataPath('workspaces.json'), 'utf-8'));
const agentRoles = JSON.parse(fs.readFileSync(mockDataPath('agentRoles.json'), 'utf-8'));
const tasks = JSON.parse(fs.readFileSync(mockDataPath('tasks.json'), 'utf-8'));
const contexts = JSON.parse(fs.readFileSync(mockDataPath('contexts.json'), 'utf-8'));

export const mockPrisma = {
  workspace: {
    findMany: async () => {
      console.log("SIMULATION: ctx.prisma.workspace.findMany");
      return workspaces;
    },
  },
  agentRole: {
    findMany: async () => {
      console.log("SIMULATION: ctx.prisma.agentRole.findMany");
      return agentRoles;
    },
  },
  task: {
    findMany: async () => {
      console.log("SIMULATION: ctx.prisma.task.findMany");
      return tasks;
    },
  },
  context: {
    findMany: async () => {
      console.log("SIMULATION: ctx.prisma.context.findMany");
      return contexts;
    },
  },
};
