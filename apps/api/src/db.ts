import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../data/db.json');

export interface ProviderConfig {
  id: string;
  label: string;
  type: string;
  apiKey: string;
  baseURL?: string | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Database {
  providerConfig: ProviderConfig[];
  rawDataLake: any[];
  models: any[];
}

class SimpleDB {
  public data: Database = {
    providerConfig: [],
    rawDataLake: [],
    models: []
  };

  async init() {
    try {
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
      const fileContent = await fs.readFile(DB_PATH, 'utf-8');
      this.data = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist, use empty data
      await this.save();
    }
  }

  public async save() {
    await fs.writeFile(DB_PATH, JSON.stringify(this.data, null, 2));
  }

  providerConfig = {
    findMany: async (opts?: any) => {
      return this.data.providerConfig;
    },
    findUnique: async (opts: { where: { id: string } }) => {
      return this.data.providerConfig.find(p => p.id === opts.where.id) || null;
    },
    create: async (opts: { data: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const newConfig: ProviderConfig = {
        ...opts.data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.data.providerConfig.push(newConfig);
      await this.save();
      return newConfig;
    },
    delete: async (opts: { where: { id: string } }) => {
      const index = this.data.providerConfig.findIndex(p => p.id === opts.where.id);
      if (index === -1) throw new Error('Provider not found');
      const deleted = this.data.providerConfig.splice(index, 1)[0];
      await this.save();
      return deleted;
    }
  };

  rawDataLake = {
    findMany: async (opts?: any) => {
      return this.data.rawDataLake;
    },
    create: async (opts: { data: any }) => {
      const newRecord = {
        ...opts.data,
        id: crypto.randomUUID()
      };
      this.data.rawDataLake.push(newRecord);
      await this.save();
      return newRecord;
    },
    delete: async (opts: { where: { id: string } }) => {
      const index = this.data.rawDataLake.findIndex(r => r.id === opts.where.id);
      if (index === -1) throw new Error('Record not found');
      const deleted = this.data.rawDataLake.splice(index, 1)[0];
      await this.save();
      return deleted;
    }
  };

  model = {
    upsert: async (opts: any) => {
      const existing = this.data.models.find(
        m => m.providerId === opts.where.providerId_modelId.providerId && 
             m.modelId === opts.where.providerId_modelId.modelId
      );
      
      if (existing) {
        Object.assign(existing, opts.update);
        await this.save();
        return existing;
      } else {
        const newModel = {
          ...opts.create,
          id: crypto.randomUUID()
        };
        this.data.models.push(newModel);
        await this.save();
        return newModel;
      }
    }
  };

  role = {
    findUnique: async (opts: { where: { id: string } }) => {
      // Mock implementation for now since we don't have roles in JSON DB yet
      return {
        id: opts.where.id,
        name: 'Mock Role',
        basePrompt: 'You are a helpful assistant.',
      };
    }
  };

  async $disconnect() {
    // No-op for file-based storage
  }
}

export const db = new SimpleDB();
await db.init();