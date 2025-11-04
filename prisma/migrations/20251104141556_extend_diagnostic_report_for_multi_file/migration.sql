-- AlterTable
ALTER TABLE "public"."DiagnosticReport" ADD COLUMN     "analyzedFileIds" TEXT[],
ADD COLUMN     "checkType" TEXT NOT NULL DEFAULT 'internal_only',
ADD COLUMN     "crossFileErrorCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "internalErrorCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "DiagnosticReport_checkType_idx" ON "public"."DiagnosticReport"("checkType");

-- CreateIndex
CREATE INDEX "DiagnosticReport_internalErrorCount_idx" ON "public"."DiagnosticReport"("internalErrorCount");

-- CreateIndex
CREATE INDEX "DiagnosticReport_crossFileErrorCount_idx" ON "public"."DiagnosticReport"("crossFileErrorCount");
