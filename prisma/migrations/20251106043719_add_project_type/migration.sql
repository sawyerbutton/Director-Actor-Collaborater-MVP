-- CreateEnum
CREATE TYPE "public"."ProjectType" AS ENUM ('SINGLE', 'MULTI_FILE');

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "projectType" "public"."ProjectType" NOT NULL DEFAULT 'SINGLE';

-- CreateIndex
CREATE INDEX "Project_projectType_idx" ON "public"."Project"("projectType");

-- CreateIndex
CREATE INDEX "Project_userId_projectType_idx" ON "public"."Project"("userId", "projectType");
