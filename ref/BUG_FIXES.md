# Bug Fixes Reference

**Last Updated**: 2025-11-09
**Status**: Production Ready

This document catalogs critical bug fixes and their solutions for future reference.

---

## Table of Contents

1. [Cross-File Analysis Display Issue](#cross-file-analysis-display-issue)
2. [React Key Warning](#react-key-warning)
3. [AI Analyzer Null Pointer Exception](#ai-analyzer-null-pointer-exception)
4. [Troubleshooting Guide](#troubleshooting-guide)

---

## Cross-File Analysis Display Issue

### Problem Description

**Date**: 2025-11-09
**Severity**: High
**Impact**: Users unable to view cross-file analysis results

**Symptoms**:
- API returns correct data with 12 cross-file findings
- Page displays "还未进行分析" (Not yet analyzed) empty state
- `summary.analyzedFiles` is `undefined` causing condition check to fail

### Root Cause

1. **Missing Type Definition**:
   ```typescript
   // types/diagnostic-report.ts (BEFORE)
   export interface DiagnosticSummary {
     totalFiles: number;
     // analyzedFiles field missing! ❌
     totalInternalErrors: number;
     totalCrossFileErrors: number;
   }
   ```

2. **Missing Data Population**:
   ```typescript
   // multi-file-analysis.service.ts (BEFORE)
   summary: calculateSummary(
     { internalFindings, crossFileFindings },
     files.length
     // No analyzedFiles parameter! ❌
   )
   ```

3. **Incorrect Frontend Logic**:
   ```typescript
   // Frontend condition (BEFORE)
   const shouldShowEmpty = summary.analyzedFiles === 0;
   // When analyzedFiles is undefined, this is false,
   // but we still show empty state
   ```

### Solution

**1. Add Field to Type Definition**:
```typescript
// types/diagnostic-report.ts
export interface DiagnosticSummary {
  totalFiles: number;
  analyzedFiles?: number;  // ✅ Added field
  totalInternalErrors: number;
  totalCrossFileErrors: number;
  // ...
}
```

**2. Update Helper Function**:
```typescript
// types/diagnostic-report.ts
export function calculateSummary(
  findings: Pick<DiagnosticFindings, 'internalFindings' | 'crossFileFindings'>,
  totalFiles: number,
  analyzedFiles?: number  // ✅ Added parameter
): DiagnosticSummary {
  return {
    totalFiles,
    analyzedFiles,  // ✅ Include in return
    // ...
  };
}
```

**3. Pass Analyzed File Count**:
```typescript
// lib/db/services/multi-file-analysis.service.ts
const convertedFiles = files.filter(f => f.jsonContent !== null);

summary: calculateSummary(
  { internalFindings, crossFileFindings },
  files.length,
  convertedFiles.length  // ✅ Pass analyzed count
)
```

**4. Improve Frontend Condition**:
```typescript
// app/multi-file/[projectId]/analysis/page.tsx
const shouldShowEmpty = !summary ||
                       !summary.analyzedFiles ||
                       summary.analyzedFiles === 0;
```

### Testing

```bash
# Test Scenario
9 total files, 8 converted successfully, 1 failed

# Expected Results
✅ API returns: analyzedFiles: 8
✅ Page displays 12 cross-file findings
✅ Summary cards show correct counts
```

### Files Modified

- `types/diagnostic-report.ts` (+3 lines)
- `lib/db/services/multi-file-analysis.service.ts` (+2 lines)
- `app/multi-file/[projectId]/analysis/page.tsx` (condition updated)

---

## React Key Warning

### Problem Description

**Date**: 2025-11-09
**Severity**: Medium
**Impact**: Console warnings, potential performance issues

**Symptoms**:
```
Warning: Each child in a list should have a unique "key" prop.
Check the render method of `CrossFileFindingsDisplay`.
at _c (card.tsx:18:11)
```

### Root Cause

**Missing ID Field in Data**:
```json
// API Response (BEFORE)
{
  "crossFileFindings": [
    {
      "type": "cross_file_timeline",
      "severity": "critical",
      "description": "...",
      "affectedFiles": [...]
      // No "id" field! ❌
    }
  ]
}
```

**AI Prompt Schema Lacks ID**:
```typescript
// lib/analysis/cross-file-ai-prompts.ts
// AI returns this structure:
{
  "findings": [
    {
      "type": "...",
      "severity": "...",
      // No id field in schema ❌
    }
  ]
}
```

**React Component Expects ID**:
```tsx
// components/analysis/cross-file-findings-display.tsx (BEFORE)
{findings.map((finding) => (
  <Card key={finding.id}>  {/* finding.id is undefined! ❌ */}
    {/* ... */}
  </Card>
))}
```

### Solution

**1. Generate Unique IDs in Service Layer**:
```typescript
// lib/db/services/multi-file-analysis.service.ts
async runCrossFileAnalysis(
  files: any[],
  config?: CrossFileCheckConfig
): Promise<CrossFileFinding[]> {
  const result = await analyzer.analyze(files);

  // ✅ Add unique IDs to findings
  const findingsWithIds = result.findings.map((finding, index) => ({
    ...finding,
    id: finding.id || `cross-file-${Date.now()}-${index}`
  }));

  return findingsWithIds;
}
```

**2. Update Type Definition**:
```typescript
// components/analysis/cross-file-findings-display.tsx
export interface CrossFileFinding {
  id: string;  // ✅ Required field
  type: 'cross_file_timeline' | 'cross_file_character' | ...;
  severity: 'high' | 'medium' | 'low';
  // ...
}
```

**3. Optimize React Component**:
```tsx
// Refactor to separate content rendering from Card wrapper
const renderFindingContent = (finding: CrossFileFinding) => (
  <div className="space-y-3">
    {/* Content */}
  </div>
);

// Use key on Card element
{findings.map((finding) => (
  <Card key={finding.id} className="...">
    <CardHeader>
      {renderFindingContent(finding)}
    </CardHeader>
  </Card>
))}
```

### ID Format

```
Pattern: cross-file-{timestamp}-{index}
Example: cross-file-1699564800000-0
         cross-file-1699564800000-1
         ...

Benefits:
✅ Unique across all findings
✅ Chronologically sortable
✅ Deterministic within same batch
✅ No database dependency
```

### Testing

```bash
# Before Fix
❌ Console: "Warning: Each child in a list should have a unique key prop"
❌ finding.id = undefined

# After Fix
✅ No console warnings
✅ finding.id = "cross-file-1699564800000-0"
✅ All findings have unique IDs
```

### Files Modified

- `lib/db/services/multi-file-analysis.service.ts` (+7 lines)
- `components/analysis/cross-file-findings-display.tsx` (refactored 80 lines)

---

## AI Analyzer Null Pointer Exception

### Problem Description

**Date**: 2025-11-09
**Severity**: High
**Impact**: Analysis crashes when encountering unconverted files

**Symptoms**:
```
TypeError: Cannot read properties of null (reading 'metadata')
    at AICrossFileAnalyzer.checkTimeline
```

### Root Cause

**Unfiltered Null Values**:
```typescript
// lib/analysis/ai-cross-file-analyzer.ts (BEFORE)
protected async checkTimeline(scripts: ParsedScriptContent[]) {
  // Directly access scripts without filtering ❌
  const prompt = buildTimelineCheckPrompt(
    scripts.map(s => ({
      fileId: s.fileId,
      filename: s.filename,
      jsonContent: s.jsonContent  // Can be null! ❌
    }))
  );
}
```

**AI Prompt Builder Assumes Valid Data**:
```typescript
// Prompt builder tries to access metadata
s.jsonContent.metadata.sceneCount  // Crashes if jsonContent is null! ❌
```

**Database Allows Null jsonContent**:
```prisma
// prisma/schema.prisma
model ScriptFile {
  jsonContent   Json?  // Nullable field ✅
  conversionStatus String @default("pending")
  conversionError  String?
}
```

### Solution

**1. Filter Null Values in All Check Methods**:
```typescript
// lib/analysis/ai-cross-file-analyzer.ts
protected async checkTimeline(scripts: ParsedScriptContent[]) {
  // ✅ Filter out scripts with null jsonContent
  const validScripts = scripts.filter(s =>
    s.jsonContent !== null && s.jsonContent !== undefined
  );

  if (!this.useAI || validScripts.length < 2) {
    return super.checkTimeline(validScripts);
  }

  try {
    console.log(
      `[AICrossFileAnalyzer] Running AI timeline check for`,
      `${validScripts.length} files (filtered from ${scripts.length} total)`
    );

    const prompt = buildTimelineCheckPrompt(
      validScripts.map(s => ({
        fileId: s.fileId,
        filename: s.filename,
        jsonContent: s.jsonContent  // ✅ Now guaranteed to be non-null
      }))
    );
    // ...
  } catch (error) {
    // ✅ Fallback to rule-based analyzer
    return super.checkTimeline(validScripts);
  }
}
```

**2. Apply Same Pattern to All Methods**:
```typescript
// Apply to all 4 check methods:
- checkTimeline()
- checkCharacter()
- checkPlot()
- checkSetting()
```

**3. Add Logging for Debugging**:
```typescript
console.log(
  `[AICrossFileAnalyzer] Running AI timeline check for`,
  `${validScripts.length} files (filtered from ${scripts.length} total)`
);
```

### Testing

```bash
# Test Scenario
9 total files:
- 8 files: conversionStatus = "completed", jsonContent = {...}
- 1 file: conversionStatus = "failed", jsonContent = null

# Before Fix
❌ TypeError: Cannot read properties of null
❌ Analysis crashes
❌ No results returned

# After Fix
✅ Logs: "Running AI timeline check for 8 files (filtered from 9 total)"
✅ Analysis completes successfully
✅ 12 cross-file findings returned
✅ No crashes
```

### Files Modified

- `lib/analysis/ai-cross-file-analyzer.ts` (+16 lines across 4 methods)

---

## Troubleshooting Guide

### Issue: Page Shows "Not Yet Analyzed" Despite Successful Analysis

**Check**:
1. API response contains `analyzedFiles` field
2. `analyzedFiles > 0`
3. Browser console for frontend errors

**Solution**:
```bash
# Check API response
curl http://localhost:3000/api/v1/projects/{id}/report | grep analyzedFiles

# Expected: "analyzedFiles": 8 (or any number > 0)
```

### Issue: React Key Warnings in Console

**Check**:
1. All findings have `id` field
2. IDs are unique
3. Component uses `key={finding.id}`

**Solution**:
```bash
# Check findings data structure
curl http://localhost:3000/api/v1/projects/{id}/report | \
  python3 -m json.tool | grep -A 5 '"id"'

# Each finding should have an id like "cross-file-1699564800000-0"
```

### Issue: Analysis Crashes with TypeError

**Check**:
1. Files with `jsonContent === null`
2. AI analyzer filtering logic
3. Conversion status of all files

**Solution**:
```bash
# Check file conversion status
curl http://localhost:3000/api/v1/projects/{id}/files | \
  python3 -m json.tool | grep -E '(filename|conversionStatus|jsonContent)'

# Fix unconverted files
npm run tsx scripts/convert-pending-files.ts
```

### Issue: Missing Cross-File Findings

**Check**:
1. At least 2 files successfully converted
2. AI analyzer enabled (`useAI: true`)
3. DEEPSEEK_API_KEY configured
4. API logs for errors

**Solution**:
```bash
# Check analyzed files count
curl http://localhost:3000/api/v1/projects/{id}/files/stats

# Expected: analyzedFiles >= 2

# Check server logs for AI errors
# Look for: "[AICrossFileAnalyzer] Running AI timeline check for X files"
```

---

## Prevention Checklist

### Before Releasing New Features

- [ ] Add null checks for all nullable database fields
- [ ] Generate unique IDs for all list items
- [ ] Update TypeScript interfaces when adding fields
- [ ] Test with incomplete/failed data scenarios
- [ ] Verify API response structure matches frontend expectations
- [ ] Check React DevTools for key warnings
- [ ] Test with different data sizes (0, 1, many items)

### Code Review Checklist

- [ ] All `.map()` calls have unique `key` props
- [ ] Nullable fields are filtered before processing
- [ ] Type definitions match actual data structure
- [ ] Frontend conditions handle `undefined` values
- [ ] Error boundaries catch component errors
- [ ] Console has no warnings in development mode

---

## Related Documentation

- [Multi-File Analysis Reference](./MULTI_FILE_ANALYSIS.md)
- [API Reference](./API_REFERENCE.md)
- [Frontend Components Reference](./FRONTEND_COMPONENTS.md)
- [Testing Guide](./TESTING_GUIDE.md)
