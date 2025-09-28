# Story 002: Update Parser to Support Only TXT and Markdown - Brownfield Addition

## User Story

As a **system administrator**,
I want **the parser to only process TXT and Markdown files**,
So that **the system maintains consistency between upload restrictions and processing capabilities**.

## Story Context

### Existing System Integration

- **Integrates with:** ScriptParser class, MarkdownToScriptConverter, file processing pipeline
- **Technology:** TypeScript, Node.js, Text processing libraries
- **Follows pattern:** Existing parser architecture with preprocessor, sanitizer, and converter patterns
- **Touch points:**
  - `/lib/parser/script-parser.ts` (main parser class)
  - `/lib/parser/markdown-script-parser.ts` (dedicated markdown parser)
  - `/lib/parser/converters/markdown-to-script.ts` (markdown converter)
  - API routes that invoke parsing

## Acceptance Criteria

### Functional Requirements

1. **Remove Screenplay Format Support:**
   - Parser no longer attempts to process `.fdx` format files
   - Parser no longer attempts to process `.fountain` format files
   - Any screenplay-specific parsing logic is disabled or removed

2. **Maintain TXT Processing:**
   - Plain text files continue to be parsed correctly
   - Text preprocessing remains functional
   - Scene and character detection works for text scripts

3. **Maintain Markdown Processing:**
   - Markdown files (.md, .markdown) continue to be parsed correctly
   - MarkdownToScriptConverter remains fully functional
   - Markdown-specific features (headers, formatting) are preserved

### Integration Requirements

4. **Parser Interface Compatibility:**
   - Public `parse()` method signature remains unchanged
   - Public `parseFile()` method signature remains unchanged
   - Public `parseMarkdown()` method continues to work

5. **Error Handling:**
   - Attempting to parse unsupported formats returns clear error
   - Error message: "Unsupported file format. Only .txt, .md, and .markdown files are supported"
   - Existing error handling patterns are maintained

6. **API Integration:**
   - API routes using the parser continue to function
   - Response format for parsing errors remains consistent
   - No breaking changes to parser output structure

### Quality Requirements

7. **Test Coverage:**
   - Update parser tests to remove screenplay format test cases
   - Add explicit tests for unsupported format rejection
   - Ensure TXT and Markdown parsing tests remain comprehensive

8. **Performance:**
   - Parsing performance for supported formats unchanged or improved
   - No memory leaks introduced by removing format support
   - Startup time not adversely affected

9. **Code Quality:**
   - Remove dead code related to screenplay formats
   - Maintain clear separation of concerns
   - Follow existing code organization patterns

## Technical Notes

### Implementation Approach

1. **Update ScriptParser class:**
```typescript
// In parseFile method - add format validation
public parseFile(content: Buffer | string, filename: string): ParsedScript {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();

  // Only support .txt, .md, .markdown
  if (!['.txt', '.md', '.markdown'].includes(ext)) {
    throw new Error('Unsupported file format. Only .txt, .md, and .markdown files are supported');
  }

  // Continue with existing parsing logic
  // ...
}
```

2. **Review and Update:**
   - Check for any FDX-specific parsing logic
   - Check for any Fountain-specific parsing logic
   - Ensure markdown detection logic remains intact

### Existing Pattern Reference

- Follow error handling pattern in `parse()` method (lines 27-39)
- Maintain sanitization approach in `sanitizer.sanitizeInput()`
- Keep parser context structure unchanged

### Key Constraints

- Cannot break existing TXT file parsing
- Cannot break existing Markdown file parsing
- Must maintain backward compatibility for API consumers
- Parser output structure must remain consistent

## Definition of Done

- [x] Parser rejects .fdx files with clear error message
- [x] Parser rejects .fountain files with clear error message
- [x] TXT file parsing continues to work correctly
- [x] Markdown file parsing continues to work correctly
- [x] Parser tests updated and passing
- [x] Manual testing confirms:
  - TXT content is parsed successfully
  - Markdown content is parsed successfully
  - Screenplay formats are rejected appropriately
  - Error messages are clear and actionable
- [x] No regression in parsing quality for supported formats
- [x] Dead code related to screenplay formats removed
- [x] Code reviewed and follows existing patterns

## Risk and Compatibility Check

### Minimal Risk Assessment

- **Primary Risk:** Breaking existing parsing functionality for supported formats
- **Mitigation:** Comprehensive testing of TXT and Markdown parsing paths
- **Rollback:** Git revert of parser changes if issues detected

### Compatibility Verification

- [x] No breaking changes to public parser methods
- [x] Parser output structure remains unchanged
- [x] Error handling follows existing patterns
- [x] Performance characteristics maintained or improved

## Testing Checklist

### Unit Tests to Update
- `/tests/__tests__/lib/parser/script-parser.test.ts`
- `/tests/__tests__/parser/markdown-script-parser.test.ts`
- Any screenplay-specific parser tests (remove or update)

### Test Scenarios
1. Parse valid TXT content - should succeed with correct structure
2. Parse valid Markdown content - should succeed with correct structure
3. Parse with .fdx extension - should throw error
4. Parse with .fountain extension - should throw error
5. Parse complex markdown with multiple scenes - should maintain structure
6. Parse plain text with dialogue - should detect correctly
7. Parse empty file - should handle gracefully
8. Parse malformed content - should sanitize appropriately

### Integration Tests
1. API endpoint with TXT upload - should process successfully
2. API endpoint with Markdown upload - should process successfully
3. API endpoint with FDX upload - should return error response
4. API endpoint with Fountain upload - should return error response

## Estimated Effort

- **Development:** 3-4 hours
- **Testing:** 2 hours
- **Total:** 5-6 hours (fits single session with focused work)