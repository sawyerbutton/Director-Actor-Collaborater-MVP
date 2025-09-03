# 🔄 Sprint Change Proposal: Test Suite Type System Migration

**Date:** 2025-09-03  
**Prepared by:** Sarah (Product Owner)  
**Change ID:** SCP-001-TEST-MIGRATION  
**Status:** APPROVED ✅

## 📊 Analysis Summary

### Issue Identification
During Story 1.4 (Change-Driven Continuous Consistency Analysis) implementation, we refactored the core type system to improve type safety and interface clarity. This breaking change left ~60+ TypeScript errors in our test suite, preventing test execution while production code continues to function correctly.

### Root Cause
- Type refactoring: `Script` → `ParsedScript` 
- Enum consolidation: Removed values like `PLOT_HOLE`, `CHARACTER_INCONSISTENCY`
- Property naming: `character` → `characterName`, `message` → `description`
- Test files were not updated during the refactoring sprint

### Impact Analysis
- **Production:** ✅ No impact - builds and deploys successfully
- **Development:** ⚠️ Cannot run automated tests
- **CI/CD:** ❌ Would fail if tests are required
- **Future Work:** 🔄 Risk of undetected regressions

## 🎯 Recommended Path Forward

**Selected Approach:** Direct Adjustment with Smart Optimizations

We will fix the test files to align with the new type system rather than reverting the improvements. This maintains code quality gains while addressing technical debt.

## 📝 Specific Proposed Edits

### 1. Test File Type Imports
**Files:** All test files in `__tests__/lib/analysis/`

**Change From:**
```typescript
import { Script } from '@/types/script';
```

**Change To:**
```typescript
import { ParsedScript } from '@/types/script';
```

### 2. LogicErrorType Enum Usage
**Files:** 
- `__tests__/lib/analysis/diff-reporter.test.ts`
- `__tests__/lib/analysis/integration.test.ts`
- `__tests__/lib/analysis/result-merger.test.ts`

**Change From:**
```typescript
type: LogicErrorType.PLOT_HOLE
type: LogicErrorType.CHARACTER_INCONSISTENCY
type: LogicErrorType.DIALOGUE_INCONSISTENCY
type: LogicErrorType.TIMELINE_CONFLICT
```

**Change To:**
```typescript
// Use existing enum values or create test-specific mocks
type: LogicErrorType.PLOT_CONTINUITY
type: LogicErrorType.CHARACTER_CONSISTENCY
type: LogicErrorType.DIALOGUE_CONSISTENCY  
type: LogicErrorType.TIMELINE_CONSISTENCY
```

### 3. Error Property Names
**Files:** All test files with LogicError objects

**Change From:**
```typescript
message: "Error message"
```

**Change To:**
```typescript
description: "Error message"
```

### 4. AnalysisReport Structure
**Files:** Test files expecting old report structure

**Change From:**
```typescript
report.errors
report.metadata
report.totalErrors
```

**Change To:**
```typescript
report.detailedAnalysis?.errors
report.detailedAnalysis?.analysisMetadata
report.detailedAnalysis?.totalErrors
```

### 5. Create Test Utilities
**New File:** `__tests__/test-utils/mock-factories.ts`

```typescript
export const createMockParsedScript = (): ParsedScript => ({
  metadata: {
    parseVersion: '1.0.0',
    parseTime: new Date(),
    language: 'en',
    originalLength: 0
  },
  scenes: [],
  characters: [],
  dialogues: [],
  actions: [],
  totalDialogues: 0,
  totalActions: 0
});

export const createMockAnalysisReport = (): AnalysisReport => ({
  summary: {
    overallConsistency: 'good',
    criticalIssues: 0,
    totalIssues: 0,
    primaryConcerns: []
  },
  detailedAnalysis: {
    scriptId: 'test-id',
    analyzedAt: new Date(),
    totalErrors: 0,
    errors: [],
    errorsByType: {},
    errorsBySeverity: {},
    analysisMetadata: {
      processingTime: 0,
      modelUsed: 'test',
      version: '1.0.0'
    }
  },
  recommendations: [],
  confidence: 0.95
});
```

### 6. TypeScript Configuration
**File:** `tsconfig.json` (already updated)

✅ Already includes `"target": "es2015"` for Map iteration support

## 📅 High-Level Action Plan

### Immediate Actions (Priority 1)
1. Create mock factory utilities for tests
2. Update all import statements from `Script` to `ParsedScript`
3. Replace deprecated enum values with existing ones
4. Fix property name mismatches

### Follow-up Actions (Priority 2)
1. Run `npx tsc --noEmit` to verify all type errors resolved
2. Run `npm test` to ensure tests execute
3. Fix any runtime test failures
4. Update test documentation

### Future Considerations
- Add pre-commit hooks to run type checking
- Include tests in CI/CD pipeline once fixed
- Consider test-driven development for future stories

## 🎯 PRD MVP Impact

**No changes to MVP scope required.** This is technical debt that:
- Does not block MVP features
- Does not change user-facing functionality  
- Should be resolved before Epic B development begins

## 🤝 Agent Handoff Plan

### Primary Owner: Developer Agent
- Execute the test file migrations
- Verify all tests pass
- Commit fixes with clear messages

### Support Roles:
- **QA Agent:** Validate test coverage after fixes
- **SM Agent:** Track as technical debt story
- **PO Agent:** Ensure doesn't impact Epic B planning

## ✅ Success Criteria

1. `npx tsc --noEmit` runs without errors
2. `npm test` executes successfully (even if some tests fail)
3. No regression in production build
4. Test utilities created for future test writing

## 📋 Change Checklist Completion

- [x] **Section 1:** Trigger & Context understood
- [x] **Section 2:** Epic Impact assessed (minimal)
- [x] **Section 3:** Artifact conflicts analyzed (none)
- [x] **Section 4:** Path forward selected (Direct Adjustment)
- [x] **Section 5:** Sprint Change Proposal created
- [x] **Section 6:** Final review and approval obtained

## Approval

**Approved by:** User  
**Approval Date:** 2025-09-03  
**Next Action:** Handoff to Developer Agent for implementation