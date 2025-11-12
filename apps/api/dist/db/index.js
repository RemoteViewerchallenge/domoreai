import pg from 'pg';
import * as crypto from 'crypto';
const { Pool } = pg;
// --- Configuration for Encryption ---
/**
 * The encryption key used for securing provider credentials.
 * It must be a 64-character hex string representing a 32-byte key.
 * @type {string}
 */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
/**
 * The length of the initialization vector (IV) for AES encryption.
 * @type {number}
 */
const IV_LENGTH = 16; // For AES, this is always 16
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error('FATAL: ENCRYPTION_KEY is not set or is not a 64-character hex string. Please set a strong 32-byte key (as 64 hex chars) in your environment variables.');
    process.exit(1);
}
// --- Database Connection Pool ---
/**
 * The connection pool for the PostgreSQL database.
 * @type {pg.Pool}
 */
const pool = new Pool({
    connectionString: process.env.PG_CONNECTION,
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
// --- Encryption/Decryption Functions ---
/**
 * Encrypts a given text using AES-256-CBC.
 * @param {string} text - The text to encrypt.
 * @returns {string} The encrypted text, formatted as 'iv:encrypted_text'.
 */
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.createSecretKey(Buffer.from(ENCRYPTION_KEY, 'hex'));
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
/**
 * Decrypts a given text that was encrypted with the `encrypt` function.
 * @param {string} text - The encrypted text, formatted as 'iv:encrypted_text'.
 * @returns {string} The decrypted text.
 */
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
/**
 * Creates a new provider in the database.
 * @param {Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>} provider - The provider data to create.
 * @returns {Promise<Provider>} The newly created provider.
 */
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
/**
 * Retrieves a provider by its ID.
 * @param {string} id - The ID of the provider to retrieve.
 * @returns {Promise<Provider | null>} The provider object, or null if not found.
 */
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
/**
 * Saves the models for a given provider, replacing any existing models.
 * @param {string} providerId - The ID of the provider.
 * @param {string} providerType - The type of the provider.
 * @param {any[]} models - The array of models to save.
 * @returns {Promise<void>}
 */
export async function saveModelsForProvider(providerId, providerType, models) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        switch (providerType) {
            case 'openai':
                await client.query(`DELETE FROM openai_models WHERE provider_id = $1`, [providerId]);
                for (const model of models) {
                    await client.query(`INSERT INTO openai_models (provider_id, model_id, object, created, owned_by) VALUES ($1, $2, $3, $4, $5)`, [providerId, model.id, model.object, model.created, model.owned_by]);
                }
                break;
            case 'vertex-studio':
                await client.query(`DELETE FROM google_models WHERE provider_id = $1`, [providerId]);
                for (const model of models) {
                    await client.query(`INSERT INTO google_models (provider_id, name, version, display_name, description) VALUES ($1, $2, $3, $4, $5)`, [providerId, model.name, model.version, model.displayName, model.description]);
                }
                break;
            case 'mistral':
                await client.query(`DELETE FROM mistral_models WHERE provider_id = $1`, [providerId]);
                for (const model of models) {
                    await client.query(`INSERT INTO mistral_models (provider_id, model_id, object, created, owned_by) VALUES ($1, $2, $3, $4, $5)`, [providerId, model.id, model.object, model.created, model.owned_by]);
                }
                break;
            default:
                console.warn(`No specific model table handler for provider type: ${providerType}`);
                break;
        }
        await client.query('COMMIT');
        console.log(`Successfully repopulated models for provider ${providerId}`);
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
/**
 * Retrieves all providers from the database, along with their associated models.
 * @returns {Promise<Provider[]>} A list of all providers.
 */
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
/**
 * Updates a provider's information in the database.
 * @param {string} id - The ID of the provider to update.
 * @param {Partial<Provider>} updates - An object containing the fields to update.
 * @returns {Promise<Provider | null>} The updated provider object, or null if not found.
 */
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
/**
 * Deletes a provider from the database.
 * @param {string} id - The ID of the provider to delete.
 * @returns {Promise<void>}
 */
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
/**
 * Initializes the database by creating the necessary tables and applying any required migrations.
 * @returns {Promise<void>}
 */
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
          provider_name VARCHAR(255),
          model_id VARCHAR(255) NOT NULL,
          object VARCHAR(255),
          created BIGINT,
          owned_by VARCHAR(255)
      );

      -- Structured table for Google models
      CREATE TABLE IF NOT EXISTS google_models (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
          provider_name VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          version VARCHAR(255),
          display_name VARCHAR(255),
          description TEXT
      );

      -- Structured table for Mistral models (schema is similar to OpenAI)
      CREATE TABLE IF NOT EXISTS mistral_models (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
          provider_name VARCHAR(255),
          model_id VARCHAR(255) NOT NULL,
          object VARCHAR(255),
          created BIGINT,
          owned_by VARCHAR(255)
      );
    `;
        await client.query(schemaSql);
        // Add the provider_type column if it doesn't exist, to handle migrations from older schema
        await client.query(`
      ALTER TABLE openai_models ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255);
      ALTER TABLE google_models ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255);
      ALTER TABLE mistral_models ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255);
    `);
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
