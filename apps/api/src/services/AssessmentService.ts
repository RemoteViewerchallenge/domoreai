import { prisma } from "../db.js";
import { ProviderManager } from "./ProviderManager.js";
import { createVolcanoAgent } from "./AgentFactory.js";
import { Prisma } from "@prisma/client";

export interface JudgeAssessment {
  score: number;
  passed: boolean;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
}

interface StepLog {
  stepName?: string;
  status?: string;
  duration?: number;
  error?: string;
}

export class AssessmentService {
  
  static async recordFailure(roleId: string, originalPrompt: string, critique: string) {
    // 1. Save to PromptRefinement table
    // @ts-ignore - Prisma types may take a moment to update
    const refinement = await (prisma as any).promptRefinement.create({
      data: {
        roleId,
        originalPrompt,
        critique,
        refinedPrompt: '', // To be filled by optimization job
      }
    });

    // 2. Trigger Optimization (Fire and Forget)
    void this.optimizePrompt(refinement.id).catch(err => 
      console.error(`[AssessmentService] Optimization failed for ${refinement.id}:`, err)
    );

    return refinement;
  }

  static async optimizePrompt(refinementId: string) {
    // @ts-ignore - Prisma types may take a moment to update
    const refinement = await (prisma as any).promptRefinement.findUnique({
      where: { id: refinementId },
      include: { role: true }
    });

    if (!refinement) return;

    const metaPrompt = `
    You are an expert Prompt Engineer. A previous prompt for the role "${refinement.role.name}" failed.
    
    ORIGINAL PROMPT:
    ${refinement.originalPrompt}
    
    CRITIQUE (Why it failed):
    ${refinement.critique}
    
    TASK:
    Rewrite the prompt to address the critique and improve performance.
    Return ONLY the new prompt text.
    `;

    // Use a smart model - Dynamic Selection
    const models = await ProviderManager.getAllModels();
    
    const smartModel = models.find(m => m.capabilities?.includes('reasoning')) 
      || models.find(m => (m.costPer1k || 0) > 0) 
      || models.sort((a, b) => ((b.specs?.contextWindow || 0) - (a.specs?.contextWindow || 0)))[0] 
      || models[0];

    if (!smartModel) {
      console.error('[AssessmentService] No capable models found for assessment.');
      return;
    }

    console.log(`🧠 Assessment Service selected: ${smartModel.id} (Cost: $${smartModel.costPer1k || 0}/1k)`);

    const provider = ProviderManager.getProvider(smartModel.providerId || '');
    if (!provider) return;

    const newPrompt = await provider.generateCompletion({
      modelId: smartModel.id,
      messages: [{ role: 'user', content: metaPrompt }],
      temperature: 0.7,
      max_tokens: 4000
    });

    // Update the record
    // @ts-ignore - Prisma types may take a moment to update
    await (prisma as any).promptRefinement.update({
      where: { id: refinementId },
      data: { refinedPrompt: newPrompt }
    });
    
    console.log(`[AssessmentService] Prompt optimized for ${refinement.role.name}`);
  }

  /**
   * Evaluate an orchestration execution using a Judge role
   */
  static async evaluateExecution(executionId: string): Promise<JudgeAssessment> {
    console.log(`[Judge] ⚖️  Evaluating execution: ${executionId}`);

    const execution = await prisma.orchestrationExecution.findUnique({
      where: { id: executionId },
      include: {
        orchestration: {
          include: {
            steps: true
          }
        }
      }
    });

    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== 'completed') {
      console.warn(`[Judge] Cannot evaluate incomplete execution: ${execution.status}`);
      return {
        score: 0,
        feedback: 'Execution did not complete successfully',
        passed: false,
        strengths: [],
        weaknesses: ['Execution failed or is still running']
      };
    }

    let judgeRole = await prisma.role.findFirst({
      where: { name: 'Judge' }
    });

    if (!judgeRole) {
      console.log('[Judge] Creating default Judge role...');
      judgeRole = await prisma.role.create({
        data: {
          name: 'Judge',
          basePrompt: `You are an expert Quality Assurance Judge for AI orchestrations.
...
Return your assessment as a JSON object with this structure:
{
  "score": 0.85,
  "passed": true,
  "strengths": ["Clear output", "Efficient execution"],
  "weaknesses": ["Minor formatting issue"],
  "feedback": "Overall good execution with room for improvement..."
}`,
          metadata: {
            defaultTemperature: 0.3,
            defaultMaxTokens: 2048,
            defaultResponseFormat: 'json_object'
          }
        }
      });
    }

    const evaluationPrompt = this.createEvaluationPrompt(execution);

    const judgeAgent = await createVolcanoAgent({
      roleId: judgeRole.id,
      modelId: null,
      isLocked: false,
      temperature: 0.3,
      maxTokens: 2048
    });

    try {
      const response = await judgeAgent.generate(evaluationPrompt);
      
      let assessment: JudgeAssessment;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          assessment = JSON.parse(jsonMatch[0]) as JudgeAssessment;
        } else {
          assessment = JSON.parse(response) as JudgeAssessment;
        }
      } catch (parseError) {
        console.error('[Judge] Failed to parse JSON response:', response, parseError);
        assessment = {
          score: 0.5,
          passed: false,
          strengths: [],
          weaknesses: ['Failed to parse judge response'],
          feedback: response
        };
      }

      console.log(`[Judge] ✅ Evaluation complete: Score ${assessment.score}, Passed: ${assessment.passed}`);
      
      return {
        score: assessment.score || 0,
        feedback: assessment.feedback || '',
        passed: assessment.passed !== false,
        strengths: assessment.strengths || [],
        weaknesses: assessment.weaknesses || []
      };

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Judge] Evaluation failed:', error);
      return {
        score: 0,
        feedback: `Evaluation error: ${msg}`,
        passed: false,
        strengths: [],
        weaknesses: ['Judge evaluation failed']
      };
    }
  }

  private static createEvaluationPrompt(execution: Prisma.OrchestrationExecutionGetPayload<{
    include: {
      orchestration: {
        include: {
          steps: true
        }
      }
    }
  }>): string {
    const stepLogsRaw = execution.stepLogs;
    const stepLogs = (Array.isArray(stepLogsRaw) ? stepLogsRaw : []) as StepLog[];

    return `Evaluate this orchestration execution:

ORCHESTRATION: ${execution.orchestration.name}
DESCRIPTION: ${execution.orchestration.description || 'N/A'}

INPUT:
${JSON.stringify(execution.input, null, 2)}

WORKFLOW STEPS:
${stepLogs.map((log: StepLog, i: number) => 
  `${i + 1}. ${log.stepName || 'Unknown Step'} - Status: ${log.status}, Duration: ${log.duration}ms${log.error ? `, Error: ${log.error}` : ''}`
).join('\n') || 'No step logs available'}

OUTPUT:
${JSON.stringify(execution.output, null, 2)}

EXECUTION TIME: ${execution.completedAt ? 
  new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime() : 'N/A'}ms

Please evaluate this execution and provide your assessment as a JSON object.`;
  }

  static getAverageQuality(_modelId: string): number {
    return 0.7;
  }
}
