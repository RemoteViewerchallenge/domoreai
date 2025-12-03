import { complexityRouter } from '../services/ComplexityRouter.js';

export const complexityTool = {
  name: 'analysis.complexity',
  description: 'Analyze task text and return a structured ComplexityScore for orchestration decisions',
  handler: async (args: { taskDescription: string }) => {
    const res = await complexityRouter.analyzeTask(args.taskDescription || '');
    return res;
  },
  input_schema: {
    type: 'object',
    properties: { taskDescription: { type: 'string' } },
    required: ['taskDescription']
  }
};
