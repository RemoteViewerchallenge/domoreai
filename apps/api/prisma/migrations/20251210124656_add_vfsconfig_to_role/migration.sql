-- AlterTable
ALTER TABLE "Role" ADD COLUMN "vfsConfig" JSONB;

-- Add comment describing the vfsConfig structure
COMMENT ON COLUMN "Role"."vfsConfig" IS 'VFS Context Configuration for C.O.R.E. context building. Structure: { selectedPaths: string[], maxFileSize?: number, excludePatterns?: string[] }';
