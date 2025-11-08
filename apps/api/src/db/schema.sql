CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  api_key TEXT NOT NULL, -- Encrypted API key
  is_healthy BOOLEAN DEFAULT FALSE,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional: Add an index to the name column for faster lookups
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers (name);
