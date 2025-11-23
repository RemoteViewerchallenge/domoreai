/*
  Warnings:

  - You are about to drop the `Provider` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Model" DROP CONSTRAINT "Model_providerId_fkey";

-- DropForeignKey
ALTER TABLE "ModelConfig" DROP CONSTRAINT "ModelConfig_providerId_fkey";

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "defaultFrequencyPenalty" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "defaultMaxTokens" INTEGER DEFAULT 2048,
ADD COLUMN     "defaultPresencePenalty" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "defaultResponseFormat" JSONB,
ADD COLUMN     "defaultSeed" INTEGER,
ADD COLUMN     "defaultStop" JSONB,
ADD COLUMN     "defaultTemperature" DOUBLE PRECISION DEFAULT 0.7,
ADD COLUMN     "defaultTopP" DOUBLE PRECISION DEFAULT 1.0,
ADD COLUMN     "terminalRestrictions" JSONB;

-- DropTable
DROP TABLE "Provider";

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "baseURL" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawDataLake" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawDataLake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlattenedTable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlattenedTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FlattenedTable_name_key" ON "FlattenedTable"("name");

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelConfig" ADD CONSTRAINT "ModelConfig_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
