/**
 * @interface Provider
 * @description Defines the structure for a provider configuration, including its credentials, health status, and associated models.
 */
export interface Provider {
  /**
   * @property {string} id - The unique identifier for the provider.
   */
  id: string;
  /**
   * @property {string} name - The user-defined name for the provider instance.
   */
  name: string;
  /**
   * @property {string} providerType - The type of provider (e.g., 'openai', 'mistral').
   */
  providerType: string;
  /**
   * @property {string} baseUrl - The base URL for the provider's API.
   */
  baseUrl: string;
  /**
   * @property {string} apiKey - The API key for the provider. This will be encrypted in the database.
   */
  apiKey: string; // This will be encrypted in the database
  /**
   * @property {boolean} isHealthy - A flag indicating if the provider is currently reachable.
   */
  isHealthy: boolean;
  /**
   * @property {Date | null} lastCheckedAt - The timestamp of the last health check.
   */
  lastCheckedAt: Date | null;
  /**
   * @property {Date} createdAt - The timestamp of when the provider was created.
   */
  createdAt: Date;
  /**
   * @property {Date} updatedAt - The timestamp of the last update.
   */
  updatedAt: Date;
  /**
   * @property {any[]} models - A list of models associated with the provider.
   */
  models: any[];
}
