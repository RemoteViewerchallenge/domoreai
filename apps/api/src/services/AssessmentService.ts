import { db } from "../db.js";
import { ProviderManager } from "./ProviderManager.js";

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

    // Use a smart model
    const models = await ProviderManager.getAllModels();
    const smartModel = models.find(m => m.id.includes('gpt-4') || m.id.includes('claude-3') || m.id.includes('gemini-1.5-pro')) || models[0];
    if (!smartModel) return;

    const provider = ProviderManager.getProvider(smartModel.providerId);
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

  static async getAverageQuality(modelId: string): Promise<number> {
    // Placeholder: In the future, this will query the 'assessments' table
    // to find the average pass rate for this model.
    // For now, we assume neutral quality (0.7)
    return 0.7;
  }
}
