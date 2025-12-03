import { pgTable, text, boolean, integer, timestamp, jsonb, doublePrecision, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --- Core Configuration ---

export const providerConfigs = pgTable('ProviderConfig', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  label: text('label').notNull(),
  type: text('type').notNull(),
  apiKey: text('apiKey').notNull(),
  baseURL: text('baseURL'),
  isEnabled: boolean('isEnabled').default(true).notNull(),
  requestsPerMinute: integer('requestsPerMinute'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const orchestratorConfigs = pgTable('OrchestratorConfig', {
  id: text('id').primaryKey().default('global'),
  activeTableName: text('activeTableName').default('unified_models').notNull(),
  strategies: jsonb('strategies').default([]),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// --- Model Registry (The "Phonebook") ---
// Minimal info to route the request: Who has it? What's it called?
export const modelRegistry = pgTable('model_registry', {
  modelId: text('model_id').notNull(),
  providerId: text('provider_id').notNull(),
  // We keep these for quick lookup/display without joining
  modelName: text('model_name'), 
  isFree: boolean('is_free').default(false),
  costPer1k: doublePrecision('cost_per_1k'),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.modelId, table.providerId] }),
  };
});

// --- Provider Specific Tables ---
// "The rest of the data stays in its own provider table"

export const openAIModels = pgTable('openai_models', {
  modelId: text('model_id').primaryKey(),
  contextWindow: integer('context_window'),
  supportsVision: boolean('supports_vision').default(false),
  supportsFunctionCalling: boolean('supports_function_calling').default(false),
  rawData: jsonb('raw_data'),
});

export const anthropicModels = pgTable('anthropic_models', {
  modelId: text('model_id').primaryKey(),
  maxTokens: integer('max_tokens'),
  supportsVision: boolean('supports_vision').default(false),
  rawData: jsonb('raw_data'),
});

export const googleModels = pgTable('google_models', {
  modelId: text('model_id').primaryKey(),
  inputTokenLimit: integer('input_token_limit'),
  outputTokenLimit: integer('output_token_limit'),
  supportsGeminiTools: boolean('supports_gemini_tools').default(false),
  rawData: jsonb('raw_data'),
});

export const openRouterModels = pgTable('openrouter_models', {
  modelId: text('model_id').primaryKey(),
  contextLength: integer('context_length'),
  pricing: jsonb('pricing'),
  topProvider: jsonb('top_provider'),
  rawData: jsonb('raw_data'),
});

// Generic fallback for others
export const genericProviderModels = pgTable('generic_provider_models', {
  modelId: text('model_id').notNull(),
  providerId: text('provider_id').notNull(),
  rawData: jsonb('raw_data'),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.modelId, table.providerId] }),
  };
});

export const modelUsage = pgTable('ModelUsage', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('userId').notNull(),
  modelConfigId: text('modelConfigId').notNull(),
  roleId: text('roleId').notNull(),
  promptTokens: integer('promptTokens').notNull(),
  completionTokens: integer('completionTokens').notNull(),
  cost: doublePrecision('cost').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});
