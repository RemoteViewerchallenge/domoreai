-- CreateTable: CoorpNode
CREATE TABLE "CoorpNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "parentId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CoorpNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CoorpEdge
CREATE TABLE "CoorpEdge" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "isDirected" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CoorpEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoorpNode_type_idx" ON "CoorpNode"("type");

-- CreateIndex
CREATE INDEX "CoorpNode_parentId_idx" ON "CoorpNode"("parentId");

-- CreateIndex
CREATE INDEX "CoorpNode_isActive_idx" ON "CoorpNode"("isActive");

-- CreateIndex
CREATE INDEX "CoorpEdge_sourceId_idx" ON "CoorpEdge"("sourceId");

-- CreateIndex
CREATE INDEX "CoorpEdge_targetId_idx" ON "CoorpEdge"("targetId");

-- CreateIndex
CREATE INDEX "CoorpEdge_type_idx" ON "CoorpEdge"("type");

-- CreateIndex
CREATE INDEX "CoorpEdge_isActive_idx" ON "CoorpEdge"("isActive");

-- CreateIndex (Unique constraint to prevent duplicate edges)
CREATE UNIQUE INDEX "CoorpEdge_sourceId_targetId_type_key" ON "CoorpEdge"("sourceId", "targetId", "type");

-- AddForeignKey
ALTER TABLE "CoorpNode" ADD CONSTRAINT "CoorpNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CoorpNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoorpEdge" ADD CONSTRAINT "CoorpEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CoorpNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoorpEdge" ADD CONSTRAINT "CoorpEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "CoorpNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
