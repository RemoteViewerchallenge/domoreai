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

// Provider-specific tables removed: model details are consolidated into `modelRegistry`'s JSON columns.

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
