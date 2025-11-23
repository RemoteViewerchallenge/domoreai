/*
  Warnings:

  - You are about to drop the column `rateLimit` on the `Model` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Model" DROP COLUMN "rateLimit",
ADD COLUMN     "costPer1k" DOUBLE PRECISION,
ADD COLUMN     "limitRequestRate" INTEGER,
ADD COLUMN     "limitWindow" INTEGER;

-- AlterTable
ALTER TABLE "ProviderConfig" ADD COLUMN     "requestsPerMinute" INTEGER;
