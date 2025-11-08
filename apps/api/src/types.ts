export interface Provider {
  id: string;
  name: string;
  providerType: string;
  baseUrl: string;
  apiKey: string; // This will be encrypted in the database
  isHealthy: boolean;
  lastCheckedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  models: any[];
}
