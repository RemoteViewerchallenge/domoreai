export interface Provider {
    id: string;
    name: string;
    providerType: string;
    baseUrl: string;
    apiKey: string;
    isHealthy: boolean;
    lastCheckedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    models: any[];
}
