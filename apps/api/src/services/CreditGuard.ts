import { prisma } from '../db.js';

/**
 * Inverted Credit Guard
 * 
 * Logic:
 * - If hasCreditCard === false: Allow all requests (Zero financial risk).
 * - If hasCreditCard === true AND isFreeOnly === true: ONLY allow models explicitly flagged isFreeTier === true in the DB. Hard block others.
 * - If hasCreditCard === true AND monthlyBudget > 0: Track currentSpend. If limit reached, automatically flip isFreeOnly = true.
 */
export class CreditGuard {
  /**
   * Validates if a request to a specific model on a provider is allowed based on credit settings.
   */
  static async validateRequest(providerId: string, modelName: string): Promise<boolean> {
    const provider = await prisma.providerConfig.findUnique({
      where: { id: providerId },
      include: {
        Model: {
          where: { name: modelName },
          include: {
            capabilities: true
          }
        }
      }
    }) as any;

    if (!provider) {
      console.error(`[CreditGuard] Provider not found: ${providerId}`);
      return false;
    }

    // If no credit card is attached, we assume it's zero risk (either free provider or handled externally)
    if (!provider.hasCreditCard) {
      return true;
    }

    // If we are in free-only mode, check if the specific model is tagged as free tier
    if (provider.isFreeOnly) {
      const model = provider.Model[0];
      const isFree = (model?.capabilities as any)?.isFreeTier ?? false;

      if (!isFree) {
        console.warn(`[CreditGuard] Blocked: Provider ${providerId} is in isFreeOnly mode. Model ${modelName} is not a free tier model.`);
        return false;
      }
      return true;
    }

    // If budget is set and reached
    if (provider.monthlyBudget > 0 && provider.currentSpend >= provider.monthlyBudget) {
      console.info(`[CreditGuard] Budget limit reached for ${providerId} ($${provider.currentSpend}/$${provider.monthlyBudget}).`);

      // Automatically flip to free-only mode if not already
      await prisma.providerConfig.update({
        where: { id: providerId },
        data: { isFreeOnly: true } as any
      });

      // Re-verify if this specific request is for a free model
      const model = provider.Model[0];
      const isFree = (model?.capabilities as any)?.isFreeTier ?? false;

      if (!isFree) {
        console.warn(`[CreditGuard] Blocked: Budget reached for ${providerId}. Model ${modelName} is not free.`);
        return false;
      }
    }

    return true;
  }

  /**
   * Increments the spend for a provider. 
   * This should be called after a successful completion of an LLM request.
   */
  static async recordSpend(providerId: string, cost: number) {
    if (cost <= 0) return;

    try {
      await prisma.providerConfig.update({
        where: { id: providerId },
        data: {
          currentSpend: {
            increment: cost
          }
        } as any
      });
    } catch (error) {
      console.error(`[CreditGuard] Failed to record spend for ${providerId}:`, error);
    }
  }

  /**
   * Reset spending (e.g., at the start of a month)
   */
  static async resetMonthlySpend(providerId: string) {
    await prisma.providerConfig.update({
      where: { id: providerId },
      data: {
        currentSpend: 0,
        isFreeOnly: false // Reset free-only if we reset budget
      } as any
    });
  }
}
