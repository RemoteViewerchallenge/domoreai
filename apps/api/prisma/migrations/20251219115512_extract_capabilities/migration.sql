/*
  Warnings:

  - You are about to drop the column `capabilities` on the `model_registry` table. All the data in the column will be lost.
  - You are about to drop the column `pricing_config` on the `model_registry` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ModelSource" AS ENUM ('INDEX', 'INFERENCE', 'MANUAL');

-- AlterTable
ALTER TABLE "OrchestrationStep" ADD COLUMN     "lastConfidence" DOUBLE PRECISION,
ADD COLUMN     "minConfidence" DOUBLE PRECISION DEFAULT 0.8,
ADD COLUMN     "subOrchestrationId" TEXT,
ADD COLUMN     "tier" TEXT DEFAULT 'Worker';

-- AlterTable
ALTER TABLE "RawDataLake" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "processed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RoleCategory" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "model_registry" DROP COLUMN "capabilities",
DROP COLUMN "pricing_config",
ADD COLUMN     "capability_tags" TEXT[] DEFAULT ARRAY['text']::TEXT[],
ADD COLUMN     "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source" "ModelSource" NOT NULL DEFAULT 'INDEX';

-- CreateTable
CREATE TABLE "ModelCapabilities" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "contextWindow" INTEGER DEFAULT 4096,
    "maxOutput" INTEGER DEFAULT 4096,
    "hasVision" BOOLEAN NOT NULL DEFAULT false,
    "hasAudioInput" BOOLEAN NOT NULL DEFAULT false,
    "hasAudioOutput" BOOLEAN NOT NULL DEFAULT false,
    "isMultimodal" BOOLEAN NOT NULL DEFAULT false,
    "supportsFunctionCalling" BOOLEAN NOT NULL DEFAULT false,
    "supportsJsonMode" BOOLEAN NOT NULL DEFAULT false,
    "tokenizer" TEXT,
    "paramCount" TEXT,
    "requestsPerMinute" INTEGER,
    "tokensPerMinute" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelCapabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileIndex" (
    "filePath" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileIndex_pkey" PRIMARY KEY ("filePath")
);

-- CreateTable
CREATE TABLE "VectorEmbedding" (
    "id" TEXT NOT NULL,
    "vector" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VectorEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModelCapabilities_modelId_key" ON "ModelCapabilities"("modelId");

-- CreateIndex
CREATE INDEX "VectorEmbedding_filePath_idx" ON "VectorEmbedding"("filePath");

-- CreateIndex
CREATE INDEX "RawDataLake_provider_processed_idx" ON "RawDataLake"("provider", "processed");

-- CreateIndex
CREATE INDEX "RawDataLake_ingestedAt_idx" ON "RawDataLake"("ingestedAt");

-- CreateIndex
CREATE INDEX "model_registry_provider_id_last_seen_at_idx" ON "model_registry"("provider_id", "last_seen_at");

-- AddForeignKey
ALTER TABLE "ModelCapabilities" ADD CONSTRAINT "ModelCapabilities_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "model_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleCategory" ADD CONSTRAINT "RoleCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RoleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationStep" ADD CONSTRAINT "OrchestrationStep_subOrchestrationId_fkey" FOREIGN KEY ("subOrchestrationId") REFERENCES "Orchestration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
