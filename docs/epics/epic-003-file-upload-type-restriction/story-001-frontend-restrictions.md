# Story 001: Update Frontend File Type Restrictions - Brownfield Addition

## User Story

As a **content creator**,
I want **the upload interface to only accept TXT and Markdown files**,
So that **I can focus on supported content formats and avoid confusion with unsupported screenplay formats**.

## Story Context

### Existing System Integration

- **Integrates with:** DragDropUpload component, ScriptUpload wrapper, EnhancedScriptUpload component
- **Technology:** React, TypeScript, Next.js 14, shadcn/ui components
- **Follows pattern:** Existing validation and error handling patterns in upload components
- **Touch points:**
  - `/components/upload/DragDropUpload.tsx` (primary component)
  - `/components/analysis/script-upload.tsx` (wrapper component)
  - `/components/analysis/enhanced-script-upload.tsx` (enhanced wrapper)
  - `/app/dashboard/page.tsx` (integration point)

## Acceptance Criteria

### Functional Requirements

1. **Update Default Accept Array:**
   - Change default `accept` prop from `['.txt', '.md', '.markdown', '.fdx', '.fountain']` to `['.txt', '.md', '.markdown']`
   - Ensure this change applies to DragDropUpload component

2. **File Validation Logic:**
   - Files with extensions `.fdx` and `.fountain` are rejected during validation
   - Clear error message displayed: "文件格式不支持。支持的格式: .txt, .md, .markdown"
   - Validation occurs for both drag-drop and file picker selection

3. **UI Text Updates:**
   - Update help text to show "支持 .txt, .md, .markdown 格式"
   - Remove any references to screenplay formats in UI messages
   - Ensure both Chinese and English error messages are accurate

### Integration Requirements

4. **Existing Upload Functionality:**
   - TXT file uploads continue to work without changes
   - Markdown file uploads (.md and .markdown) continue to work
   - Multi-file upload still functions for supported formats

5. **Component Integration:**
   - All components using DragDropUpload receive updated restrictions
   - Props interface remains unchanged (only default values change)
   - Existing error handling patterns are maintained

6. **Dashboard Integration:**
   - Dashboard page correctly displays upload component with new restrictions
   - Upload flow from dashboard remains smooth and functional

### Quality Requirements

7. **Test Coverage:**
   - Update component tests to verify new file type restrictions
   - Add test cases for rejection of `.fdx` and `.fountain` files
   - Ensure existing tests for supported formats still pass

8. **Error Handling:**
   - Error messages are user-friendly and actionable
   - Validation provides immediate feedback (no server round-trip needed)
   - Mixed file selection (valid + invalid) handled gracefully

9. **Performance:**
   - Validation performance remains instantaneous
   - No additional processing overhead introduced

## Technical Notes

### Implementation Approach

1. **Primary Changes in DragDropUpload.tsx:**
```typescript
// Line 28 - Update default accept array
accept = ['.txt', '.md', '.markdown'],  // Remove: '.fdx', '.fountain'

// Line 49 - Validation message update
return `文件 "${file.name}" 格式不支持。支持的格式: ${accept.join(', ')}`;
```

2. **Components to Review:**
   - Check if script-upload.tsx or enhanced-script-upload.tsx override the accept prop
   - Verify dashboard integration doesn't hardcode file types

### Existing Pattern Reference

- Follow current validation pattern in `validateFile` method (lines 41-59)
- Use existing error state management pattern
- Maintain current internationalization approach for messages

### Key Constraints

- Cannot break existing uploaded files functionality
- Must maintain backward compatibility with component props interface
- Error messages must support both English and Chinese

## Definition of Done

- [x] Default accept array updated to only include `.txt`, `.md`, `.markdown`
- [x] File validation rejects screenplay formats with clear messages
- [x] UI help text updated throughout components
- [x] Component tests updated and passing
- [x] Manual testing confirms:
  - TXT files upload successfully
  - Markdown files upload successfully
  - FDX files are rejected with error message
  - Fountain files are rejected with error message
  - Multi-file scenarios work correctly
- [x] No regression in existing upload functionality
- [x] Code reviewed and follows existing patterns

## Risk and Compatibility Check

### Minimal Risk Assessment

- **Primary Risk:** Users attempting to upload previously supported screenplay files
- **Mitigation:** Clear, helpful error messages explaining the format change
- **Rollback:** Simply revert the accept array to include removed formats

### Compatibility Verification

- [x] No breaking changes to component APIs (only default prop values change)
- [x] No database changes required
- [x] UI changes follow existing shadcn/ui patterns
- [x] Performance impact is negligible (fewer formats to check)

## Testing Checklist

### Unit Tests to Update
- `/tests/__tests__/components/upload/DragDropUpload.test.tsx`
- `/tests/__tests__/components/analysis/script-upload.test.tsx`

### Test Scenarios
1. Upload single .txt file - should succeed
2. Upload single .md file - should succeed
3. Upload single .markdown file - should succeed
4. Upload single .fdx file - should fail with error
5. Upload single .fountain file - should fail with error
6. Upload multiple mixed files - should partially succeed with clear feedback
7. Drag and drop unsupported file - should show error immediately
8. File picker with unsupported file - should show error immediately

## Estimated Effort

- **Development:** 2-3 hours
- **Testing:** 1-2 hours
- **Total:** 3-5 hours (fits single session requirement)