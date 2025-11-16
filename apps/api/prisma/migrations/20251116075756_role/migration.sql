-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "baseURL" TEXT NOT NULL,
    "encryptedApiKey" TEXT,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "rateLimit" TEXT,
    "contextWindow" INTEGER,
    "hasVision" BOOLEAN NOT NULL DEFAULT false,
    "hasReasoning" BOOLEAN NOT NULL DEFAULT false,
    "hasCoding" BOOLEAN NOT NULL DEFAULT false,
    "providerData" JSONB NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrompt" TEXT NOT NULL,
    "minContext" INTEGER,
    "maxContext" INTEGER,
    "needsVision" BOOLEAN NOT NULL DEFAULT false,
    "needsReasoning" BOOLEAN NOT NULL DEFAULT false,
    "needsCoding" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_baseURL_key" ON "Provider"("baseURL");

-- CreateIndex
CREATE UNIQUE INDEX "Model_providerId_modelId_key" ON "Model"("providerId", "modelId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
