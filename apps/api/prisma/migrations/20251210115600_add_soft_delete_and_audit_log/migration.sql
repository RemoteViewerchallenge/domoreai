-- Add soft delete columns to critical tables
ALTER TABLE "ProviderConfig" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "model_registry" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "Role" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "ModelConfig" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "WorkOrderCard" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Create AuditLog table
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'system',
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_tableName_recordId_idx" ON "AuditLog"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
