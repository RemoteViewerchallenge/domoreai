-- Add missing hasReasoning column to ModelCapabilities table
ALTER TABLE "ModelCapabilities" 
ADD COLUMN IF NOT EXISTS "hasReasoning" BOOLEAN NOT NULL DEFAULT false;
