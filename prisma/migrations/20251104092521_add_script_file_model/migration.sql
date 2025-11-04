-- CreateEnum
CREATE TYPE "public"."WorkflowStatus" AS ENUM ('INITIALIZED', 'ACT1_RUNNING', 'ACT1_COMPLETE', 'ITERATING', 'SYNTHESIZING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('ACT1_ANALYSIS', 'SYNTHESIS', 'ITERATION', 'EXPORT');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ActType" AS ENUM ('ACT2_CHARACTER', 'ACT3_WORLDBUILDING', 'ACT4_PACING', 'ACT5_THEME');

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "workflowStatus" "public"."WorkflowStatus" NOT NULL DEFAULT 'INITIALIZED';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "password" TEXT;

-- CreateTable
CREATE TABLE "public"."ScriptVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "changeLog" TEXT,
    "synthesisMetadata" JSONB,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnalysisJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "public"."JobType" NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'QUEUED',
    "result" JSONB,
    "error" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiagnosticReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "findings" JSONB NOT NULL,
    "summary" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RevisionDecision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "act" "public"."ActType" NOT NULL,
    "focusName" TEXT NOT NULL,
    "focusContext" JSONB NOT NULL,
    "proposals" JSONB NOT NULL,
    "userChoice" TEXT,
    "generatedChanges" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisionDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScriptFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "episodeNumber" INTEGER,
    "rawContent" TEXT NOT NULL,
    "jsonContent" JSONB,
    "contentHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "conversionStatus" TEXT NOT NULL DEFAULT 'pending',
    "conversionError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScriptVersion_projectId_idx" ON "public"."ScriptVersion"("projectId");

-- CreateIndex
CREATE INDEX "ScriptVersion_projectId_version_idx" ON "public"."ScriptVersion"("projectId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptVersion_projectId_version_key" ON "public"."ScriptVersion"("projectId", "version");

-- CreateIndex
CREATE INDEX "AnalysisJob_projectId_idx" ON "public"."AnalysisJob"("projectId");

-- CreateIndex
CREATE INDEX "AnalysisJob_status_idx" ON "public"."AnalysisJob"("status");

-- CreateIndex
CREATE INDEX "AnalysisJob_type_idx" ON "public"."AnalysisJob"("type");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticReport_projectId_key" ON "public"."DiagnosticReport"("projectId");

-- CreateIndex
CREATE INDEX "DiagnosticReport_projectId_idx" ON "public"."DiagnosticReport"("projectId");

-- CreateIndex
CREATE INDEX "RevisionDecision_projectId_idx" ON "public"."RevisionDecision"("projectId");

-- CreateIndex
CREATE INDEX "RevisionDecision_act_idx" ON "public"."RevisionDecision"("act");

-- CreateIndex
CREATE INDEX "RevisionDecision_projectId_act_idx" ON "public"."RevisionDecision"("projectId", "act");

-- CreateIndex
CREATE INDEX "ScriptFile_projectId_idx" ON "public"."ScriptFile"("projectId");

-- CreateIndex
CREATE INDEX "ScriptFile_projectId_episodeNumber_idx" ON "public"."ScriptFile"("projectId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptFile_projectId_filename_key" ON "public"."ScriptFile"("projectId", "filename");

-- CreateIndex
CREATE INDEX "Project_workflowStatus_idx" ON "public"."Project"("workflowStatus");

-- AddForeignKey
ALTER TABLE "public"."ScriptVersion" ADD CONSTRAINT "ScriptVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnalysisJob" ADD CONSTRAINT "AnalysisJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiagnosticReport" ADD CONSTRAINT "DiagnosticReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RevisionDecision" ADD CONSTRAINT "RevisionDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScriptFile" ADD CONSTRAINT "ScriptFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
