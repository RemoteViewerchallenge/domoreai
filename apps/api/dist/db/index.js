import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import crypto from 'crypto';
const prisma = new PrismaClient();
export const db = prisma;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16; // For AES, this is always 16
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error('FATAL: ENCRYPTION_KEY is not set or is not a 64-character hex string. Please set a strong 32-byte key (as 64 hex chars) in your environment variables.');
    process.exit(1);
}
// --- Database Connection Pool ---
const pool = new Pool({
    connectionString: process.env.PG_CONNECTION,
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
// --- Encryption/Decryption Functions ---
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.createSecretKey(Buffer.from(ENCRYPTION_KEY, 'hex'));
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
function decrypt(text) {
    // If the text is null, empty, or undefined, there's nothing to decrypt.
    if (!text) {
        return '';
    }
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const key = crypto.createSecretKey(Buffer.from(ENCRYPTION_KEY, 'hex'));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
// --- CRUD Operations for Providers ---
export async function createProvider(provider) {
    // apiKey can be optional for providers like Llama
    const encryptedApiKey = provider.apiKey ? encrypt(provider.apiKey) : null;
    const client = await pool.connect();
    try {
        const res = await client.query(`INSERT INTO providers (name, base_url, api_key, provider_type) VALUES ($1, $2, $3, $4) RETURNING *`, [provider.name, provider.baseUrl || null, encryptedApiKey, provider.providerType]);
        const newProvider = {
            ...res.rows[0],
            apiKey: res.rows[0].api_key ? decrypt(res.rows[0].api_key) : '', // Decrypt for immediate return
            baseUrl: res.rows[0].base_url,
            isHealthy: res.rows[0].is_healthy,
            lastCheckedAt: res.rows[0].last_checked_at,
            createdAt: res.rows[0].created_at,
            models: [], // Initialize with empty models array
            providerType: res.rows[0].provider_type,
            updatedAt: res.rows[0].updated_at,
        };
        return newProvider;
    }
    finally {
        client.release();
    }
}
export async function updateModel(modelId, providerType, updates) {
    const client = await pool.connect();
    try {
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const setClauses = fields.map((field, i) => `"${field}" = $${i + 1}`).join(', ');
        let tableName = '';
        switch (providerType) {
            case 'openai':
                tableName = 'openai_models';
                break;
            case 'vertex-studio':
                tableName = 'google_models';
                break;
            case 'mistral':
                tableName = 'mistral_models';
                break;
            default:
                throw new Error(`Unsupported provider type: ${providerType}`);
        }
        const query = `UPDATE ${tableName} SET ${setClauses} WHERE id = $${fields.length + 1}`;
        await client.query(query, [...values, modelId]);
    }
    finally {
        client.release();
    }
}
export async function getProviderById(id) {
    const client = await pool.connect();
    try {
        const res = await client.query(`SELECT * FROM providers WHERE id = $1`, [id]);
        if (res.rows.length === 0) {
            return null;
        }
        const provider = {
            ...res.rows[0],
            apiKey: res.rows[0].api_key ? decrypt(res.rows[0].api_key) : '',
            providerType: res.rows[0].provider_type,
            baseUrl: res.rows[0].base_url,
            isHealthy: res.rows[0].is_healthy,
            lastCheckedAt: res.rows[0].last_checked_at,
            createdAt: res.rows[0].created_at,
            models: res.rows[0].models || [], // Directly use the JSONB column
            updatedAt: res.rows[0].updated_at,
        };
        return provider;
    }
    finally {
        client.release();
    }
}
export async function saveModelsForProvider(providerId, providerType, models) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        switch (providerType) {
            case 'openai': {
                const existingModelsRes = await client.query(`SELECT model_id FROM openai_models WHERE provider_id = $1`, [providerId]);
                const existingModelIds = new Set(existingModelsRes.rows.map(r => r.model_id));
                const newModelIds = new Set(models.map(m => m.id));
                // Insert new models
                for (const model of models) {
                    if (!existingModelIds.has(model.id)) {
                        await client.query(`INSERT INTO openai_models (provider_id, model_id, object, created, owned_by) VALUES ($1, $2, $3, $4, $5)`, [providerId, model.id, model.object, model.created, model.owned_by]);
                    }
                }
                // Delete old models
                for (const modelId of existingModelIds) {
                    if (!newModelIds.has(modelId)) {
                        await client.query(`DELETE FROM openai_models WHERE provider_id = $1 AND model_id = $2`, [providerId, modelId]);
                    }
                }
                break;
            }
            case 'vertex-studio': {
                const existingModelsRes = await client.query(`SELECT name FROM google_models WHERE provider_id = $1`, [providerId]);
                const existingModelNames = new Set(existingModelsRes.rows.map(r => r.name));
                const newModelNames = new Set(models.map(m => m.name));
                // Insert new models
                for (const model of models) {
                    if (!existingModelNames.has(model.name)) {
                        await client.query(`INSERT INTO google_models (provider_id, name, version, display_name, description) VALUES ($1, $2, $3, $4, $5)`, [providerId, model.name, model.version, model.displayName, model.description]);
                    }
                }
                // Delete old models
                for (const modelName of existingModelNames) {
                    if (!newModelNames.has(modelName)) {
                        await client.query(`DELETE FROM google_models WHERE provider_id = $1 AND name = $2`, [providerId, modelName]);
                    }
                }
                break;
            }
            case 'mistral': {
                const existingModelsRes = await client.query(`SELECT model_id FROM mistral_models WHERE provider_id = $1`, [providerId]);
                const existingModelIds = new Set(existingModelsRes.rows.map(r => r.model_id));
                const newModelIds = new Set(models.map(m => m.id));
                // Insert new models
                for (const model of models) {
                    if (!existingModelIds.has(model.id)) {
                        await client.query(`INSERT INTO mistral_models (provider_id, model_id, object, created, owned_by) VALUES ($1, $2, $3, $4, $5)`, [providerId, model.id, model.object, model.created, model.owned_by]);
                    }
                }
                // Delete old models
                for (const modelId of existingModelIds) {
                    if (!newModelIds.has(modelId)) {
                        await client.query(`DELETE FROM mistral_models WHERE provider_id = $1 AND model_id = $2`, [providerId, modelId]);
                    }
                }
                break;
            }
            default:
                console.warn(`No specific model table handler for provider type: ${providerType}`);
                break;
        }
        await client.query('COMMIT');
        console.log(`Successfully synchronized models for provider ${providerId}`);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error saving models for provider ${providerId}:`, error);
        throw error;
    }
    finally {
        client.release();
    }
}
export async function getAllProviders() {
    const client = await pool.connect();
    try {
        // This query uses a CASE statement to join with the correct models table
        // based on the provider_type and aggregate the results into a JSON array.
        const query = `
      SELECT 
        p.*,
        CASE
          WHEN p.provider_type = 'openai' THEN (SELECT json_agg(om) FROM openai_models om WHERE om.provider_id = p.id)
          WHEN p.provider_type = 'vertex-studio' THEN (SELECT json_agg(gm) FROM google_models gm WHERE gm.provider_id = p.id)
          WHEN p.provider_type = 'mistral' THEN (SELECT json_agg(mm) FROM mistral_models mm WHERE mm.provider_id = p.id)
          -- Add other provider types here in the future
          ELSE '[]'::json
        END as models
      FROM providers p
      GROUP BY p.id
    `;
        const res = await client.query(query);
        return res.rows.map((row) => {
            return {
                ...row,
                apiKey: row.api_key ? decrypt(row.api_key) : '',
            };
        });
    }
    finally {
        client.release();
    }
}
export async function updateProvider(id, updates) {
    const client = await pool.connect();
    try {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (updates.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(updates.name);
        }
        if (updates.baseUrl !== undefined) {
            fields.push(`base_url = $${paramIndex++}`);
            values.push(updates.baseUrl);
        }
        if (updates.apiKey !== undefined) {
            fields.push(`api_key = $${paramIndex++}`);
            values.push(encrypt(updates.apiKey));
        }
        if (updates.isHealthy !== undefined) {
            fields.push(`is_healthy = $${paramIndex++}`);
            values.push(updates.isHealthy);
        }
        if (updates.lastCheckedAt !== undefined) {
            fields.push(`last_checked_at = $${paramIndex++}`);
            values.push(updates.lastCheckedAt);
        }
        if (fields.length === 0) {
            return getProviderById(id); // No updates to apply
        }
        values.push(id); // Add id for WHERE clause
        const query = `UPDATE providers SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
        const res = await client.query(query, values);
        if (res.rows.length === 0) {
            return null;
        }
        const updatedProvider = {
            ...res.rows[0],
            apiKey: decrypt(res.rows[0].api_key),
            baseUrl: res.rows[0].base_url,
            isHealthy: res.rows[0].is_healthy,
            lastCheckedAt: res.rows[0].last_checked_at,
            createdAt: res.rows[0].created_at,
            updatedAt: res.rows[0].updated_at,
        };
        return updatedProvider;
    }
    finally {
        client.release();
    }
}
export async function deleteProvider(id) {
    const client = await pool.connect();
    try {
        await client.query(`DELETE FROM providers WHERE id = $1`, [id]);
    }
    finally {
        client.release();
    }
}
// --- Database Initialization ---
export async function initializeDatabase() {
    const client = await pool.connect();
    try {
        const schemaSql = `
      CREATE TABLE IF NOT EXISTS providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        base_url VARCHAR(255), -- Base URL is now optional
        provider_type VARCHAR(255) NOT NULL,
        api_key TEXT, -- API key is now optional
        is_healthy BOOLEAN DEFAULT FALSE,
        last_checked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_providers_name ON providers (name);

      -- Structured table for OpenAI models
      CREATE TABLE IF NOT EXISTS openai_models (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
          model_id VARCHAR(255) NOT NULL,
          object VARCHAR(255),
          created BIGINT,
          owned_by VARCHAR(255),
          rpm INTEGER,
          tpm INTEGER,
          rpd INTEGER,
          is_enabled BOOLEAN DEFAULT FALSE
      );

      -- Structured table for Google models
      CREATE TABLE IF NOT EXISTS google_models (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(255),
          display_name VARCHAR(255),
          description TEXT,
          rpm INTEGER,
          tpm INTEGER,
          rpd INTEGER,
          is_enabled BOOLEAN DEFAULT FALSE
      );

      -- Structured table for Mistral models (schema is similar to OpenAI)
      CREATE TABLE IF NOT EXISTS mistral_models (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
          model_id VARCHAR(255) NOT NULL,
          object VARCHAR(255),
          created BIGINT,
          owned_by VARCHAR(255),
          rpm INTEGER,
          tpm INTEGER,
          rpd INTEGER,
          is_enabled BOOLEAN DEFAULT FALSE
      );
    `;
        await client.query(schemaSql);
        // Add the provider_type column if it doesn't exist, to handle migrations from older schema
        const alterTableSql = `
      ALTER TABLE providers
      ADD COLUMN IF NOT EXISTS provider_type VARCHAR(255);
    `;
        await client.query(alterTableSql);
        // Alter the base_url column to be nullable to handle providers without a base URL
        const alterBaseUrlSql = `
      ALTER TABLE providers ALTER COLUMN base_url DROP NOT NULL;
    `;
        await client.query(alterBaseUrlSql);
        // Alter the api_key column to be nullable
        const alterApiKeySql = `
      ALTER TABLE providers ALTER COLUMN api_key DROP NOT NULL;
    `;
        await client.query(alterApiKeySql);
        console.log('Database initialized: providers table ensured.');
    }
    catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=index.js.map