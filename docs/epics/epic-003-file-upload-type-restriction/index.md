# Epic 003: File Upload Type Restriction - Story Index

## Epic Overview
Restrict file upload functionality to only accept TXT and Markdown formats, removing support for screenplay-specific formats.

## Stories

### ✅ [Story 001: Update Frontend File Type Restrictions](./story-001-frontend-restrictions.md)
- **Status:** Ready for Development
- **Effort:** 3-5 hours
- **Priority:** High (Must be done first)
- **Description:** Modify upload components to only accept .txt, .md, and .markdown files

### ✅ [Story 002: Update Parser to Support Only TXT and Markdown](./story-002-parser-updates.md)
- **Status:** Ready for Development
- **Effort:** 5-6 hours
- **Priority:** High (Can be done in parallel with Story 001)
- **Description:** Remove parser support for screenplay formats while maintaining TXT and Markdown processing

### ✅ [Story 003: Update E2E Tests and Documentation](./story-003-tests-documentation.md)
- **Status:** Ready for Development
- **Effort:** 5-7 hours
- **Priority:** Medium (Should be done after Stories 001 and 002)
- **Description:** Update all tests and documentation to reflect the new file type restrictions

## Implementation Order

1. **Phase 1 (Parallel):** Story 001 and Story 002 can be developed simultaneously by different developers
2. **Phase 2:** Story 003 should be completed after both Story 001 and Story 002 are merged

## Total Estimated Effort
- **Minimum:** 13 hours
- **Maximum:** 18 hours
- **Recommended Team:** 2 developers working in parallel can complete in 1-2 days

## Dependencies
- No external dependencies
- No database migrations required
- No API contract changes

## Risks
- **Low Risk:** Changes are configuration-based and easily reversible
- **Main Concern:** Clear communication to users about format restrictions

## Success Metrics
- Zero regression in TXT file processing
- Zero regression in Markdown file processing
- 100% of screenplay format uploads properly rejected
- All tests passing
- Documentation updated and accurate

## Quick Links
- [Epic README](./README.md) - Full epic details and requirements
- [Story 001](./story-001-frontend-restrictions.md) - Frontend restrictions
- [Story 002](./story-002-parser-updates.md) - Parser updates
- [Story 003](./story-003-tests-documentation.md) - Tests and documentation