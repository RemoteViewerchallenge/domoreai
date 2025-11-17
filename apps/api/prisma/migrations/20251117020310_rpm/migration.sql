-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "requestsPerMinute" INTEGER;

-- CreateTable
CREATE TABLE "ModelConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "maxTokens" INTEGER,
    "temperature" DOUBLE PRECISION,

    CONSTRAINT "ModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelUsage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "modelConfigId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "cost" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "ModelUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PreferredModels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_PreferredModels_AB_unique" ON "_PreferredModels"("A", "B");

-- CreateIndex
CREATE INDEX "_PreferredModels_B_index" ON "_PreferredModels"("B");

-- AddForeignKey
ALTER TABLE "ModelConfig" ADD CONSTRAINT "ModelConfig_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelConfig" ADD CONSTRAINT "ModelConfig_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelUsage" ADD CONSTRAINT "ModelUsage_modelConfigId_fkey" FOREIGN KEY ("modelConfigId") REFERENCES "ModelConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelUsage" ADD CONSTRAINT "ModelUsage_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PreferredModels" ADD CONSTRAINT "_PreferredModels_A_fkey" FOREIGN KEY ("A") REFERENCES "ModelConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PreferredModels" ADD CONSTRAINT "_PreferredModels_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
