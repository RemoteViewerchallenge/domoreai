import { pgTable, text, boolean, integer, timestamp, jsonb, doublePrecision, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --- Core Configuration ---

export const providerConfigs = pgTable('ProviderConfig', {
  id: text('id').primaryKey(),
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
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  modelId: text('model_id').notNull(),
  providerId: text('provider_id').notNull(),
  // We keep these for quick lookup/display without joining
  modelName: text('model_name'), 
  isFree: boolean('is_free').default(false),
  costPer1k: doublePrecision('cost_per_1k'),

  // Triple-Layer System
  providerData: jsonb('provider_data').default({}),
  aiData: jsonb('ai_data').default({}),
  specs: jsonb('specs').default({}),
  
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    unq: uniqueIndex('model_registry_provider_id_model_id_key').on(table.providerId, table.modelId),
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

export const projects = pgTable('projects', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('planning').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const jobs = pgTable('jobs', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: text('projectId').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('not_started').notNull(), // 'not_started', 'in_progress', 'completed', 'failed'
  priority: text('priority').default('medium').notNull(), // 'low', 'medium', 'high', 'critical'
  roleId: text('roleId'),
  parallelGroup: text('parallelGroup'),
  dependsOnJobId: text('dependsOnJobId'),
  startedAt: timestamp('startedAt'),
  completedAt: timestamp('completedAt'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  jobId: text('jobId').notNull(),
  description: text('description'),
  status: text('status').default('not_started').notNull(),
  startedAt: timestamp('startedAt'),
  completedAt: timestamp('completedAt'),
  completionData: jsonb('completionData'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const errands = pgTable('errands', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  taskId: text('taskId').notNull(),
  description: text('description'),
  status: text('status').default('not_started').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  completedAt: timestamp('completedAt'),
});
