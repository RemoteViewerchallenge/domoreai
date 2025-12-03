-- AlterTable
ALTER TABLE "Model" ADD COLUMN     "isUncensored" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supportedParameters" JSONB,
ADD COLUMN     "supportsJson" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supportsTools" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ModelConfig" ADD COLUMN     "adjustedParameters" JSONB;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "criteria" JSONB,
ADD COLUMN     "domainKnowledge" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "needsImageGeneration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsJson" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsTools" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsUncensored" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tone" TEXT,
ADD COLUMN     "tools" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "SavedQuery" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "targetTable" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rootPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderCard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "workspaceId" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL DEFAULT '.',
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "sshConfigId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SshConfig" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 22,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SshConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "projectId" TEXT NOT NULL,
    "roleId" TEXT,
    "dependsOnJobId" TEXT,
    "parallelGroup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completionData" JSONB,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Errand" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Errand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orchestration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Orchestration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestrationStep" (
    "id" TEXT NOT NULL,
    "orchestrationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "roleId" TEXT,
    "roleName" TEXT,
    "stepType" TEXT NOT NULL DEFAULT 'sequential',
    "condition" JSONB,
    "inputMapping" JSONB,
    "outputMapping" JSONB,
    "maxRetries" INTEGER NOT NULL DEFAULT 0,
    "retryDelay" INTEGER,
    "timeout" INTEGER,
    "parallelGroup" TEXT,
    "validationRules" JSONB,
    "contextKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrchestrationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestrationExecution" (
    "id" TEXT NOT NULL,
    "orchestrationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "input" JSONB NOT NULL,
    "output" JSONB,
    "context" JSONB NOT NULL DEFAULT '{}',
    "stepLogs" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "userId" TEXT,

    CONSTRAINT "OrchestrationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedQuery_name_key" ON "SavedQuery"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Job_dependsOnJobId_key" ON "Job"("dependsOnJobId");

-- CreateIndex
CREATE INDEX "Job_projectId_status_idx" ON "Job"("projectId", "status");

-- CreateIndex
CREATE INDEX "Job_roleId_idx" ON "Job"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Orchestration_name_key" ON "Orchestration"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OrchestrationStep_orchestrationId_order_key" ON "OrchestrationStep"("orchestrationId", "order");

-- CreateIndex
CREATE INDEX "OrchestrationExecution_orchestrationId_status_idx" ON "OrchestrationExecution"("orchestrationId", "status");

-- CreateIndex
CREATE INDEX "OrchestrationExecution_startedAt_idx" ON "OrchestrationExecution"("startedAt");

-- AddForeignKey
ALTER TABLE "WorkOrderCard" ADD CONSTRAINT "WorkOrderCard_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_dependsOnJobId_fkey" FOREIGN KEY ("dependsOnJobId") REFERENCES "Job"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Errand" ADD CONSTRAINT "Errand_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationStep" ADD CONSTRAINT "OrchestrationStep_orchestrationId_fkey" FOREIGN KEY ("orchestrationId") REFERENCES "Orchestration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationExecution" ADD CONSTRAINT "OrchestrationExecution_orchestrationId_fkey" FOREIGN KEY ("orchestrationId") REFERENCES "Orchestration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
