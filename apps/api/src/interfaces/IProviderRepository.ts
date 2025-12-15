export interface IProviderRepository {
  findProviderConfigByLabel(label: string): Promise<any>;
  findProviderConfigById(id: string): Promise<any>;
  createProviderConfig(values: any): Promise<void>;
  getEnabledProviderConfigs(): Promise<any[]>;
  upsertModel(data: any): Promise<void>;
}
