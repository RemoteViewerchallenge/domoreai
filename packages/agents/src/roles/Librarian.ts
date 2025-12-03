
export class Librarian {
  /**
   * Step 1: Extraction
   * "Review this failed interaction. Extract the root cause of the error."
   */
  static getExtractionPrompt(failedInteraction: string): string {
    return `Review this failed interaction. Extract the root cause of the error.\n\nInteraction:\n${failedInteraction}`;
  }

  /**
   * Step 2: Generalization
   * "Convert this specific error into a general rule for future agents. Format: WHEN <trigger> DO <action>."
   */
  static getGeneralizationPrompt(rootCause: string): string {
    return `Convert this specific error into a general rule for future agents. Format: WHEN <trigger> DO <action>.\n\nRoot Cause:\n${rootCause}`;
  }

  /**
   * Step 3: Deduplication
   * This logic is typically handled by the caller (e.g., checking against vector DB or existing rules).
   * But we can provide a prompt to compare rules if needed.
   */
  static getDeduplicationPrompt(newRule: string, existingRules: string[]): string {
    return `Compare the new rule with existing rules. If it's a duplicate or covered by an existing rule, return "DUPLICATE". Otherwise, return "NEW".\n\nNew Rule:\n${newRule}\n\nExisting Rules:\n${existingRules.join('\n')}`;
  }
}
