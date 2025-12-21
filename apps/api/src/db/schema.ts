import { pgTable, text, boolean, integer, timestamp, jsonb, doublePrecision, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

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
  activeTableName: text('activeTableName').default('model_registry').notNull(),
  strategies: jsonb('strategies').default([]),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// --- Model Registry (The "Phonebook") ---
// Minimal info to route the request: Who has it? What's it called?
// --- Model Registry (The "Phonebook") ---
// Minimal info to route the request: Who has it? What's it called?
export const modelRegistry = pgTable('model_registry', {
  id: text('id').primaryKey(), // CUID
  providerId: text('provider_id').notNull(),
  modelId: text('model_id').notNull(),
  modelName: text('model_name').notNull(),
  
  // The Triple Layer
  providerData: jsonb('provider_data').default('{}'), // Layer 1: Raw
  aiData: jsonb('ai_data').default('{}'),             // Layer 2: Knowledge
  // Note: 'specs' column is deprecated but kept for safety if needed
  specs: jsonb('specs').default('{}'),

  capabilityTags: text('capability_tags').array(), // Used for fast filtering
  source: text('source'), // INDEX, INFERENCE, MANUAL

  isActive: boolean('is_active').default(true),
  isFree: boolean('is_free').default(false),
  costPer1k: doublePrecision('cost_per_1k'),
  
  firstSeenAt: timestamp('first_seen_at').defaultNow(),
  lastSeenAt: timestamp('last_seen_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  unq: uniqueIndex('model_registry_provider_id_model_id_key').on(t.providerId, t.modelId),
}));

// [NEW] The Capabilities Table (Layer 3)
export const modelCapabilities = pgTable('ModelCapabilities', {
  id: text('id').primaryKey(),
  modelId: text('modelId').notNull().unique(), // Foreign Key to modelRegistry.id
  
  // Features
  hasVision: boolean('hasVision').default(false),
  hasAudioInput: boolean('hasAudioInput').default(false),
  hasAudioOutput: boolean('hasAudioOutput').default(false),
  hasTTS: boolean('hasTTS').default(false),
  hasImageGen: boolean('hasImageGen').default(false),
  hasReasoning: boolean('hasReasoning').default(false),
  isMultimodal: boolean('isMultimodal').default(false),
  supportsFunctionCalling: boolean('supportsFunctionCalling').default(false),
  supportsJsonMode: boolean('supportsJsonMode').default(false),
  
  // Limits
  contextWindow: integer('contextWindow').default(4096),
  maxOutput: integer('maxOutput').default(4096),
  
  // Technical Specs
  tokenizer: text('tokenizer'),
  paramCount: text('paramCount'),
  
  // Rate Limits
  requestsPerMinute: integer('requestsPerMinute'),
  tokensPerMinute: integer('tokensPerMinute'),
  
  updatedAt: timestamp('updatedAt').defaultNow(),
});

// [NEW] Relations
export const modelRelations = relations(modelRegistry, ({ one }) => ({
  provider: one(providerConfigs, {
    fields: [modelRegistry.providerId],
    references: [providerConfigs.id],
  }),
  capabilities: one(modelCapabilities, {
    fields: [modelRegistry.id],
    references: [modelCapabilities.modelId],
  }),
}));

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
