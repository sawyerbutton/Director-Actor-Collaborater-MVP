# Story 003: Update E2E Tests and Documentation - Brownfield Addition

## User Story

As a **development team member**,
I want **all tests and documentation to reflect the new file type restrictions**,
So that **the codebase remains maintainable and new team members understand the supported formats**.

## Story Context

### Existing System Integration

- **Integrates with:** Playwright E2E tests, Jest unit tests, integration test suites, project documentation
- **Technology:** Playwright, Jest, TypeScript, Markdown documentation
- **Follows pattern:** Existing test structure and documentation standards
- **Touch points:**
  - `/tests/e2e/` (E2E test files)
  - `/tests/__tests__/` (unit and integration tests)
  - `/tests/fixtures/` (test data files)
  - Project documentation files (README, API docs)

## Acceptance Criteria

### Functional Requirements

1. **Update E2E Tests:**
   - Remove or update tests that upload `.fdx` or `.fountain` files
   - Add explicit tests for rejection of unsupported formats
   - Ensure all upload flow tests use only TXT or Markdown files

2. **Update Test Fixtures:**
   - Remove `.fdx` and `.fountain` test fixture files
   - Replace with equivalent `.txt` or `.md` fixtures where needed
   - Update fixture references in all test files

3. **Update Unit Tests:**
   - Remove unit tests specific to screenplay formats
   - Add tests verifying format restriction enforcement
   - Update mock data to use only supported formats

### Integration Requirements

4. **Test Suite Consistency:**
   - All test suites pass with green status
   - No skipped tests due to format changes
   - Test coverage metrics maintained or improved

5. **Documentation Updates:**
   - API documentation reflects supported file formats
   - README files updated with new format restrictions
   - Component documentation shows correct accept arrays

6. **CI/CD Compatibility:**
   - All tests pass in CI pipeline
   - No broken test dependencies
   - Build process completes successfully

### Quality Requirements

7. **Test Coverage:**
   - Error path testing for unsupported formats
   - Happy path testing for supported formats
   - Edge case coverage (empty files, large files, special characters)

8. **Documentation Quality:**
   - Clear explanation of supported formats
   - Migration notes for users with screenplay files
   - Examples use only TXT and Markdown formats

9. **Maintainability:**
   - Test code follows existing patterns
   - Documentation is searchable and well-organized
   - Clear comments explain format restrictions

## Technical Notes

### Implementation Approach

1. **E2E Test Updates:**
```typescript
// upload-complete-flow.spec.ts
test('should reject unsupported file formats', async ({ page }) => {
  // Attempt to upload .fdx file
  // Verify error message appears
  // Confirm file is not processed
});

test('should accept markdown files', async ({ page }) => {
  // Upload .md file
  // Verify successful processing
});
```

2. **Files to Review and Update:**
   - `/tests/e2e/upload-complete-flow.spec.ts`
   - `/tests/e2e/intelligent-repair.spec.ts`
   - `/tests/e2e/tests/script-analysis.spec.ts`
   - Test fixtures directory structure

3. **Documentation Files:**
   - Main README.md
   - API documentation
   - CLAUDE.md instructions
   - Component-specific docs

### Existing Pattern Reference

- Follow Playwright test patterns in existing E2E tests
- Use existing Jest test utilities and helpers
- Maintain current documentation formatting standards

### Key Constraints

- Cannot reduce overall test coverage
- Must maintain test execution time within acceptable limits
- Documentation must remain accurate and helpful

## Definition of Done

- [x] All E2E tests updated to use only supported formats
- [x] Test fixtures cleaned up (no screenplay format files)
- [x] Unit tests updated and passing
- [x] Integration tests updated and passing
- [x] Documentation reflects new format restrictions
- [x] CI pipeline passes all checks
- [x] Manual verification confirms:
  - E2E tests accurately test the new restrictions
  - Documentation is clear and helpful
  - No broken references to removed formats
- [x] Test coverage report shows no regression
- [x] Code reviewed and follows testing best practices

## Risk and Compatibility Check

### Minimal Risk Assessment

- **Primary Risk:** Missing test coverage for edge cases
- **Mitigation:** Systematic review of all test files and scenarios
- **Rollback:** Tests can be reverted independently of application code

### Compatibility Verification

- [x] No changes to test infrastructure required
- [x] CI/CD pipeline configuration unchanged
- [x] Test commands remain the same
- [x] Documentation build process unaffected

## Testing Checklist

### E2E Tests to Update
1. `/tests/e2e/upload-complete-flow.spec.ts`
   - Update file upload tests
   - Add format rejection tests
   - Remove screenplay format tests

2. `/tests/e2e/intelligent-repair.spec.ts`
   - Update test data files
   - Ensure repair tests use supported formats

3. `/tests/e2e/tests/script-analysis.spec.ts`
   - Update analysis tests for supported formats only

### Unit Tests to Update
1. Component tests in `/tests/__tests__/components/`
2. Parser tests in `/tests/__tests__/lib/parser/`
3. Service tests that involve file processing

### Documentation Updates
1. **README.md**
   - Supported file formats section
   - Getting started examples

2. **API Documentation**
   - Upload endpoint format restrictions
   - Error response examples

3. **CLAUDE.md**
   - Update file type information
   - Add migration notes if needed

### Test Scenarios to Verify
1. Upload TXT via drag-drop - success
2. Upload MD via file picker - success
3. Upload MARKDOWN via API - success
4. Upload FDX - rejected with error
5. Upload FOUNTAIN - rejected with error
6. Bulk upload with mixed formats - partial success with clear feedback
7. Empty file upload - appropriate handling
8. Large file upload - size limits work correctly

## Migration Guide Section

Create a brief migration guide for documentation:

```markdown
### Format Restriction Changes

As of version X.X.X, the system only supports:
- Plain text files (.txt)
- Markdown files (.md, .markdown)

Previously supported screenplay formats (.fdx, .fountain) are no longer accepted.

**For users with screenplay files:**
1. Convert your screenplay to Markdown format
2. Use a text export option from your screenplay software
3. Contact support for assistance with format conversion
```

## Estimated Effort

- **Test Updates:** 3-4 hours
- **Documentation Updates:** 1-2 hours
- **Verification & Review:** 1 hour
- **Total:** 5-7 hours (can be completed in focused session)