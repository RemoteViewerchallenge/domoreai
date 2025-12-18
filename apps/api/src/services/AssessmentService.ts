import { db } from "../db.js";
import { prisma } from "../db.js";
import { ProviderManager } from "./ProviderManager.js";
import { createVolcanoAgent } from "./AgentFactory.js";

export class AssessmentService {
  
  static async recordFailure(roleId: string, originalPrompt: string, critique: string) {
    // 1. Save to PromptRefinement table
    const refinement = await (db as any).promptRefinement.create({
      data: {
        roleId,
        originalPrompt,
        critique,
        refinedPrompt: '', // To be filled by optimization job
      }
    });

    // 2. Trigger Optimization (Fire and Forget)
    this.optimizePrompt(refinement.id).catch(err => 
      console.error(`[AssessmentService] Optimization failed for ${refinement.id}:`, err)
    );

    return refinement;
  }

  static async optimizePrompt(refinementId: string) {
    const refinement = await (db as any).promptRefinement.findUnique({
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
    
    // [NEW] Dynamic Resilience
    // 1. Look for models explicitly tagged with 'reasoning' or 'smart' (future-proofing)
    // 2. Fallback to models that are NOT free (assuming paid = smarter)
    // 3. Fallback to the largest context window
    const smartModel = models.find(m => m.capabilities?.includes('reasoning')) 
      || models.find(m => (m.costPer1k || 0) > 0) // Heuristic: Paid models are usually "smarter"
      || models.sort((a, b) => ((b.specs?.contextWindow || 0) - (a.specs?.contextWindow || 0)))[0] // Fallback: Biggest brain
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
    await (db as any).promptRefinement.update({
      where: { id: refinementId },
      data: { refinedPrompt: newPrompt }
    });
    
    console.log(`[AssessmentService] Prompt optimized for ${refinement.role.name}`);
  }

  /**
   * Evaluate an orchestration execution using a Judge role
   * @param executionId - The execution to evaluate
   * @returns Quality score (0-1) and detailed feedback
   */
  static async evaluateExecution(executionId: string): Promise<{
    score: number;
    feedback: string;
    passed: boolean;
    strengths: string[];
    weaknesses: string[];
  }> {
    console.log(`[Judge] ⚖️  Evaluating execution: ${executionId}`);

    // 1. Load the execution
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

    // 2. Find or create a Judge role
    let judgeRole = await prisma.role.findFirst({
      where: { name: 'Judge' }
    });

    if (!judgeRole) {
      console.log('[Judge] Creating default Judge role...');
      judgeRole = await prisma.role.create({
        data: {
          name: 'Judge',
          basePrompt: `You are an expert Quality Assurance Judge for AI orchestrations.

Your job is to evaluate the quality of orchestration executions by analyzing:
1. Whether the output matches the input requirements
2. The efficiency of the workflow (step duration, retries)
3. The completeness and correctness of the result
4. Any errors or issues in the execution logs

Return your assessment as a JSON object with this structure:
{
  "score": 0.85,  // 0-1 scale
  "passed": true,  // true if score >= 0.7
  "strengths": ["Clear output", "Efficient execution"],
  "weaknesses": ["Minor formatting issue"],
  "feedback": "Overall good execution with room for improvement..."
}`,
          tools: [],
          metadata: {
            defaultTemperature: 0.3,  // Low temperature for consistent grading
            defaultMaxTokens: 2048,
            defaultResponseFormat: 'json_object'
          }
        }
      });
    }

    // 3. Create the evaluation prompt
    const evaluationPrompt = this.createEvaluationPrompt(execution);

    // 4. Create Judge agent
    const judgeAgent = await createVolcanoAgent({
      roleId: judgeRole.id,
      modelId: null,  // Let orchestrator pick best model
      isLocked: false,
      temperature: 0.3,
      maxTokens: 2048
    });

    // 5. Get Judge's assessment
    try {
      const response = await judgeAgent.generate(evaluationPrompt);
      
      // Parse JSON response
      let assessment;
      try {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          assessment = JSON.parse(jsonMatch[0]);
        } else {
          assessment = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('[Judge] Failed to parse JSON response:', response);
        // Fallback assessment
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

    } catch (error: any) {
      console.error('[Judge] Evaluation failed:', error);
      return {
        score: 0,
        feedback: `Evaluation error: ${error.message}`,
        passed: false,
        strengths: [],
        weaknesses: ['Judge evaluation failed']
      };
    }
  }

  /**
   * Create the evaluation prompt for the Judge
   */
  private static createEvaluationPrompt(execution: any): string {
    return `Evaluate this orchestration execution:

ORCHESTRATION: ${execution.orchestration.name}
DESCRIPTION: ${execution.orchestration.description || 'N/A'}

INPUT:
${JSON.stringify(execution.input, null, 2)}

WORKFLOW STEPS:
${execution.stepLogs?.map((log: any, i: number) => 
  `${i + 1}. ${log.stepName} - Status: ${log.status}, Duration: ${log.duration}ms${log.error ? `, Error: ${log.error}` : ''}`
).join('\n') || 'No step logs available'}

OUTPUT:
${JSON.stringify(execution.output, null, 2)}

EXECUTION TIME: ${execution.completedAt ? 
  new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime() : 'N/A'}ms

Please evaluate this execution and provide your assessment as a JSON object.`;
  }

  static async getAverageQuality(modelId: string): Promise<number> {
    // Placeholder: In the future, this will query the 'assessments' table
    // to find the average pass rate for this model.
    // For now, we assume neutral quality (0.7)
    return 0.7;
  }
}
