# Deprecation Notice

## File: `iteration-api.test.ts.DEPRECATED`

This test file has been **deprecated and replaced** by `iteration-api-route-handlers.test.ts`.

### Why was it deprecated?

The original test file used real HTTP `fetch()` calls to `http://localhost:3001/api/v1/*`, which had several problems:

1. **fetch() was undefined in Jest** - Even with `@jest-environment node`, fetch wasn't available
2. **Required dev server** - Tests needed Next.js dev server running on specific port
3. **Non-deterministic** - Port might change (3000→3001→3002...), breaking tests
4. **CI/CD incompatible** - Can't run in automated pipelines

### What replaced it?

**New file**: `iteration-api-route-handlers.test.ts` (✅ 9/9 tests passing)

**Approach**: Tests route handlers directly using `NextRequest`:
```typescript
import { POST as proposeHandler } from '@/app/api/v1/iteration/propose/route';

const request = new NextRequest('...', { /* config */ });
const response = await proposeHandler(request);
```

**Benefits**:
- ✅ No dev server required
- ✅ Tests real route handler code
- ✅ Fast and reliable
- ✅ CI/CD friendly
- ✅ Proper mocking of AI agents

### Test Coverage

Both files tested the same endpoints:
- `POST /api/v1/iteration/propose` (3 tests)
- `POST /api/v1/iteration/execute` (3 tests)
- `GET /api/v1/projects/:id/decisions` (3 tests)

**Old**: 0/9 passing (fetch undefined)
**New**: 9/9 passing ✅

### Can I delete the old file?

Yes, but it's kept as `.DEPRECATED` for reference. Feel free to delete after reviewing the new implementation.

### Related Documentation

- `tests/integration/ITERATION_API_TEST_NOTES.md` - Problem analysis
- `docs/COMPREHENSIVE_TESTING_STRATEGY.md` - Testing strategy (Section 8.4)

---

**Deprecated**: 2025-10-02
**Replaced by**: `iteration-api-route-handlers.test.ts`
