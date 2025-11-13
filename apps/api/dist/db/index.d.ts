import { Provider } from '../types.js';
/**
 * Creates a new provider configuration in the database.
 * The API key is encrypted before being stored.
 * @param {Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>} provider - The provider data to create.
 * @returns {Promise<Provider>} The newly created provider object, with the API key decrypted.
 */
export declare function createProvider(provider: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>): Promise<Provider>;
/**
 * Retrieves a provider by its ID.
 * Decrypts the API key before returning the provider.
 * @param {string} id - The UUID of the provider to retrieve.
 * @returns {Promise<Provider | null>} The provider object, or null if not found.
 */
export declare function getProviderById(id: string): Promise<Provider | null>;
/**
 * Saves the list of models for a specific provider.
 * This function uses a transaction to delete the old models and insert the new ones,
 * ensuring atomicity. It dispatches to the correct structured model table based on the provider type.
 * @param {string} providerId - The UUID of the provider.
 * @param {string} providerType - The type of the provider (e.g., 'openai', 'vertex-studio').
 * @param {any[]} models - An array of model objects to save.
 * @throws {Error} If there is an error during the database transaction.
 */
export declare function saveModelsForProvider(providerId: string, providerType: string, models: any[]): Promise<void>;
/**
 * Retrieves all provider configurations from the database.
 * This function uses a complex query with a CASE statement to join with the appropriate
 * provider-specific model table and aggregates the models into a JSON array.
 * @returns {Promise<Provider[]>} An array of provider objects, each including its list of models.
 */
export declare function getAllProviders(): Promise<Provider[]>;
/**
 * Updates a provider's configuration in the database.
 * This function dynamically builds the UPDATE query based on the fields provided in the `updates` object.
 * The API key is encrypted before being stored.
 * @param {string} id - The UUID of the provider to update.
 * @param {Partial<Provider>} updates - An object containing the fields to update.
 * @returns {Promise<Provider | null>} The updated provider object, or null if not found.
 */
export declare function updateProvider(id: string, updates: Partial<Provider>): Promise<Provider | null>;
/**
 * Deletes a provider from the database.
 * @param {string} id - The UUID of the provider to delete.
 * @returns {Promise<void>}
 */
export declare function deleteProvider(id: string): Promise<void>;
/**
 * Initializes the database by creating the necessary tables and indexes if they do not exist.
 * This function also includes migration logic to add new columns to existing tables,
 * ensuring backward compatibility.
 * @returns {Promise<void>}
 * @throws {Error} If there is an error during database initialization.
 */
export declare function initializeDatabase(): Promise<void>;
//# sourceMappingURL=index.d.ts.map