/**
 * @interface LLMCompletionRequest
 * @description Defines the structure for an LLM completion request, including the prompt and optional parameters.
 */
export interface LLMCompletionRequest {
  /**
   * @property {string} prompt - The prompt to send to the LLM.
   */
  prompt: string;
  /**
   * @property {number} [maxTokens] - The maximum number of tokens to generate.
   */
  maxTokens?: number;
  /**
   * @property {number} [temperature] - The temperature for the completion.
   */
  temperature?: number;
  /**
   * @property {Record<string, any>} [config] - Additional configuration for the request.
   */
  config?: Record<string, any>; // Added for dynamic configuration
}

/**
 * @interface LLMProvider
 * @description Defines the structure for an LLM provider, including its identifier, name, model list, and configuration schema.
 */
export interface LLMProvider {
  /**
   * @property {string} id - Unique ID for the configured provider instance.
   */
  id: string; // Unique ID for the configured provider instance
  /**
   * @property {string} displayName - User-defined name for the provider instance.
   */
  displayName: string; // User-defined name for the provider instance
  /**
   * @property {string} name - The type of provider (e.g., 'openai', 'mistral').
   */
  name: string; // The type of provider (e.g., 'openai', 'mistral')
  /**
   * @property {string[]} models - A list of models available from the provider.
   */
  models: string[];
  /**
   * @property {Record<string, any>} [configSchema] - Optional schema for UI to generate config fields.
   */
  configSchema?: Record<string, any>; // Optional schema for UI to generate config fields
}

/**
 * @interface LLMAdapter
 * @description Defines the interface for an LLM adapter, which handles communication with a specific LLM provider.
 */
export interface LLMAdapter {
  /**
   * @property {string} providerName - The name of the provider.
   */
  providerName: string;
  /**
   * @property {string[]} models - A list of models available from the provider.
   */
  models: string[];
  /**
   * @method generateCompletion
   * @description Generates a completion for a given request.
   * @param {LLMCompletionRequest} request - The completion request.
   * @returns {Promise<string>} A promise that resolves with the generated completion.
   */
  generateCompletion(request: LLMCompletionRequest): Promise<string>;
}
