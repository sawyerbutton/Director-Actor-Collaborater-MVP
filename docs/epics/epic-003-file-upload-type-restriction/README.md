# Epic 003: File Upload Type Restriction - Brownfield Enhancement

## Epic Goal

Restrict file upload functionality in the dashboard to only accept TXT and Markdown formats (.txt, .md, .markdown) while removing support for screenplay-specific formats, ensuring both upload validation and parsing logic are aligned with these restrictions.

## Epic Description

### Existing System Context

- **Current relevant functionality:** The DragDropUpload component currently accepts multiple file formats including `.txt`, `.md`, `.markdown`, `.fdx`, and `.fountain`
- **Technology stack:** Next.js 14, TypeScript, React with shadcn/ui components
- **Integration points:**
  - `components/upload/DragDropUpload.tsx` - Main upload component
  - `components/analysis/script-upload.tsx` - Script-specific upload wrapper
  - `lib/parser/script-parser.ts` - Core parsing logic
  - `app/dashboard/page.tsx` - Dashboard integration point

### Enhancement Details

**What's being added/changed:**
- Modify the accepted file types array from `['.txt', '.md', '.markdown', '.fdx', '.fountain']` to `['.txt', '.md', '.markdown']`
- Update file validation logic to reject `.fdx` and `.fountain` formats
- Remove or disable parsing support for screenplay-specific formats
- Update UI messages and documentation to reflect the new restrictions

**How it integrates:**
- The changes will be made directly to the existing `DragDropUpload` component props
- Parser will be updated to only support text and markdown processing
- Validation will occur at both frontend (component level) and backend (parser level)

**Success criteria:**
- Users can only upload `.txt`, `.md`, and `.markdown` files
- Attempting to upload `.fdx` or `.fountain` files results in clear error messages
- Existing parsing logic correctly handles only the supported formats
- All tests pass with the new restrictions in place

## Stories

### Story 1: Update Frontend File Type Restrictions
**Description:** Modify the DragDropUpload component and related upload components to only accept TXT and Markdown files, updating the default accept array and all UI messages.

**Acceptance Criteria:**
- [ ] Default accept array changed to `['.txt', '.md', '.markdown']`
- [ ] File validation rejects `.fdx` and `.fountain` files with appropriate error messages
- [ ] UI help text updated to show only supported formats
- [ ] Component tests updated to verify new restrictions

### Story 2: Update Parser to Support Only TXT and Markdown
**Description:** Modify the script parser to remove support for screenplay-specific formats and ensure it only processes TXT and Markdown files correctly.

**Acceptance Criteria:**
- [ ] Parser no longer attempts to process `.fdx` or `.fountain` formats
- [ ] Markdown converter remains fully functional
- [ ] Plain text processing continues to work correctly
- [ ] Parser tests updated to reflect new supported formats

### Story 3: Update E2E Tests and Documentation
**Description:** Update all end-to-end tests, integration tests, and relevant documentation to reflect the new file type restrictions.

**Acceptance Criteria:**
- [ ] E2E tests updated to test only supported formats
- [ ] Test fixtures using `.fdx` or `.fountain` replaced or removed
- [ ] Error handling tests verify rejection of unsupported formats
- [ ] User-facing documentation updated if applicable

## Compatibility Requirements

- [x] Existing APIs remain unchanged (only validation rules change)
- [x] Database schema changes are backward compatible (no schema changes needed)
- [x] UI changes follow existing patterns (using existing error handling patterns)
- [x] Performance impact is minimal (reducing supported formats may improve performance)

## Risk Mitigation

**Primary Risk:** Existing users may have screenplay files they expect to upload
**Mitigation:**
- Clear error messages explaining the format restriction
- Suggest converting screenplay formats to markdown before upload
- Document the change in release notes

**Rollback Plan:**
- The change is implemented via configuration arrays that can be easily reverted
- No database migrations or destructive changes
- Can revert by restoring the original accept arrays in components

## Definition of Done

- [ ] All stories completed with acceptance criteria met
- [ ] Existing functionality for TXT and Markdown files verified through testing
- [ ] Integration points working correctly with new restrictions
- [ ] Documentation updated appropriately
- [ ] No regression in existing features for supported file types
- [ ] All unit tests passing
- [ ] All E2E tests updated and passing
- [ ] Code reviewed and approved
- [ ] Deployed to staging and verified

## Validation Checklist

### Scope Validation
- [x] Epic can be completed in 3 stories maximum
- [x] No architectural documentation is required
- [x] Enhancement follows existing patterns
- [x] Integration complexity is manageable

### Risk Assessment
- [x] Risk to existing system is low
- [x] Rollback plan is feasible
- [x] Testing approach covers existing functionality
- [x] Team has sufficient knowledge of integration points

### Completeness Check
- [x] Epic goal is clear and achievable
- [x] Stories are properly scoped
- [x] Success criteria are measurable
- [x] Dependencies are identified

## Story Manager Handoff

**Story Manager Handoff:**

Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running Next.js 14, TypeScript, React, and shadcn/ui
- Integration points: DragDropUpload component, script-parser module, dashboard page, and all related tests
- Existing patterns to follow: Current validation patterns, error handling mechanisms, component prop interfaces
- Critical compatibility requirements: Maintain backward compatibility for already uploaded files, preserve existing API contracts
- Each story must include verification that existing functionality for TXT and Markdown files remains intact

The epic should maintain system integrity while delivering a more focused file upload experience that restricts uploads to only TXT and Markdown formats.

## Implementation Notes

### Technical Details
- The `accept` prop in `DragDropUpload` component defaults are hardcoded and need to be updated
- Multiple components may be importing and overriding these defaults
- Parser has a `MarkdownToScriptConverter` that should remain functional
- Test fixtures may need updating to remove screenplay format examples

### Testing Considerations
- Verify drag-and-drop functionality still works with the restricted formats
- Ensure file validation provides user-friendly error messages in both English and Chinese
- Test multi-file upload scenarios with mixed supported and unsupported formats
- Verify that the parser correctly handles edge cases in TXT and Markdown files

### Migration Path
- No data migration needed as this is a validation change only
- Existing uploaded files in the system are not affected
- Consider adding a utility script to identify any existing `.fdx` or `.fountain` files in the database for future reference