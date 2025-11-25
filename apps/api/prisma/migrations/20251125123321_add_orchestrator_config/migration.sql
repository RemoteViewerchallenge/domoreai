-- CreateTable
CREATE TABLE "TableMapping" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestratorConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "activeTableName" TEXT NOT NULL DEFAULT 'unified_models',
    "strategies" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrchestratorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TableMapping_tableName_key" ON "TableMapping"("tableName");
