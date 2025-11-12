/**
 * Represents a session token for the Virtual File System (VFS).
 * It's a string that uniquely identifies a user's VFS session.
 */
export type VfsSessionToken = string;

/**
 * Represents an LLM provider configuration stored in the database.
 */
export interface Provider {
  /** The unique identifier for the provider. */
  id: string;
  /** The display name of the provider. */
  name: string;
  /** The type of the provider (e.g., 'openai', 'mistral'). */
  providerType: string;
  /** The base URL for the provider's API. */
  baseUrl: string;
  /** The API key for the provider. This is encrypted in the database. */
  apiKey: string;
  /** A flag indicating if the provider is currently healthy and accessible. */
  isHealthy: boolean;
  /** The timestamp of the last health check. */
  lastCheckedAt: Date | null;
  /** The timestamp when the provider was created. */
  createdAt: Date;
  /** The timestamp when the provider was last updated. */
  updatedAt: Date;
  /** An array of models available from this provider. */
  models: any[];
}
