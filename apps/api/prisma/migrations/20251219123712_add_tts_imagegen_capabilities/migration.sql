-- AlterTable
ALTER TABLE "ModelCapabilities" ADD COLUMN     "hasImageGen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasTTS" BOOLEAN NOT NULL DEFAULT false;
