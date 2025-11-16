/**
 * Represents an LLM provider.
 */
export interface LLMProvider {
  /** The unique identifier for the provider. */
  id: string;
  /** The name of the provider. */
  name:string;
  /** The display name of the provider. */
  displayName: string;
  /** A list of models available from the provider. */
  models: string[];
  /** The configuration schema for the provider. */
  configSchema: {
    [key: string]: {
      type: string;
      required: boolean;
      description: string;
    };
  };
}

/**
 * Represents a request to an LLM for a completion.
 */
export interface LLMCompletionRequest {
  /** The prompt to send to the LLM. */
  prompt: string;
<<<<<<< HEAD
  /** The maximum number of tokens to generate. */
=======
  providerId: string;
  modelId: string;
>>>>>>> feature-rate-limiter
  maxTokens?: number;
  /** The temperature to use for the completion. */
  temperature?: number;
  /** Additional configuration for the request. */
  config?: { [key: string]: any };
}