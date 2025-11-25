import axios from 'axios';

export class CreditGuard {
  static async checkOpenRouterBalance(apiKey: string): Promise<number | null> {
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/credits', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      return response.data?.data?.total_credits || 0;
    } catch (error) {
      console.error('[Guard] Failed to check credits:', error);
      return null;
    }
  }
}
