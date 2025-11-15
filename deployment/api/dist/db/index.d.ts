import { Provider } from '../types.js';
export declare function createProvider(provider: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>): Promise<Provider>;
export declare function getProviderById(id: string): Promise<Provider | null>;
export declare function saveModelsForProvider(providerId: string, providerType: string, models: any[]): Promise<void>;
export declare function getAllProviders(): Promise<Provider[]>;
export declare function updateProvider(id: string, updates: Partial<Provider>): Promise<Provider | null>;
export declare function deleteProvider(id: string): Promise<void>;
export declare function initializeDatabase(): Promise<void>;
//# sourceMappingURL=index.d.ts.map