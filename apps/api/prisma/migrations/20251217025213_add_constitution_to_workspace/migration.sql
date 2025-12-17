-- AddConstitutionToWorkspace
ALTER TABLE "Workspace" ADD COLUMN "codeRules" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "glossary" JSONB DEFAULT '{}'::jsonb;
