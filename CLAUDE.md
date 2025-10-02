# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScriptAI MVP - An AI-powered script analysis system that detects and fixes logical errors in screenplays using a three-agent collaborative AI architecture. Built with Next.js 14, TypeScript, PostgreSQL/Prisma, and DeepSeek API.

**Current Architecture**: Database-backed V1 API with async job queue system (migrated from localStorage in Epic 004)

**Important Note**: The README describes the original MVP implementation. The current production system now uses the V1 API architecture described in this file. localStorage has been completely removed.

## Essential Commands

### Development
```bash
npm run dev                  # Start development server on localhost:3000
DISABLE_RATE_LIMIT=true npm run dev  # Start without rate limiting (development)
npm run build               # Build for production
npm run start               # Start production server
npm run check:all           # Run typecheck, lint, and build in sequence
```

### Testing
```bash
npm test                     # Run unit tests (Jest)
npm test -- path/to/test.spec.ts    # Run specific test file
npm test -- -t "test description"   # Run test by description
npm run test:watch          # Run tests in watch mode
npm run test:e2e            # Run E2E tests (Playwright)
npm run test:e2e:headed     # Run E2E tests with visible browser
npm run typecheck           # Run TypeScript type checking
npm run lint                # Run ESLint
```

### Database Operations
```bash
npx prisma db push          # Push schema changes to database
npx prisma migrate dev --name [name]  # Create and apply migrations
npx prisma studio           # Open Prisma Studio GUI
npx prisma generate         # Generate Prisma Client
npx prisma db seed          # Seed database with demo user and test data
```

### Local PostgreSQL Setup
```bash
# Start PostgreSQL container (if not running)
docker run -d --name director-postgres \
  -e POSTGRES_USER=director_user \
  -e POSTGRES_PASSWORD=director_pass_2024 \
  -e POSTGRES_DB=director_actor_db \
  -p 5432:5432 postgres:16-alpine

# Initialize database
npx prisma db push
```

## Architecture Overview

### Five-Act Workflow State Machine
The system implements a five-act workflow for script analysis:
- `INITIALIZED` → `ACT1_RUNNING` → `ACT1_COMPLETE` → `ITERATING` → `SYNTHESIZING` → `COMPLETED`

### Core AI Agents
1. **ConsistencyGuardian** (`lib/agents/consistency-guardian.ts`)
   - Detects 5 error types: timeline, character, plot, dialogue, scene inconsistencies
   - Chinese language prompts for Chinese output
   - Parallel chunk processing for performance

2. **RevisionExecutive** (`lib/agents/revision-executive.ts`)
   - Generates contextual fixes for detected errors
   - Validates and sanitizes AI outputs

3. **Incremental Analyzer** (change-driven analysis)
   - Maintains consistency after script modifications
   - Delta-based optimization

### API Architecture (V1)
- **Async Job Queue**: `lib/api/workflow-queue.ts` manages Act 1 analysis jobs
  - Processes jobs in background every 3 seconds
  - Single-instance pattern (WorkflowQueue.getInstance())
  - Automatic retry on failure
- **Status Polling**: Frontend polls job status every 2 seconds
  - Client: `v1ApiService.pollJobStatus()` in `lib/services/v1-api-service.ts`
  - Server: `GET /api/v1/analyze/jobs/:jobId`
- **Database Persistence**: PostgreSQL via Prisma ORM
  - All state persisted server-side (no client storage)
- **Middleware Stack**: Rate limiting, CORS, security headers, validation

### Database Models
- `User`: Authentication and ownership
- `Project`: Script projects with workflow status
- `ScriptVersion`: Version control for scripts
- `AnalysisJob`: Async job tracking
- `DiagnosticReport`: Analysis results

## Environment Configuration

### Required Environment Variables
```bash
# Database (Local PostgreSQL)
DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
DIRECT_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"

# DeepSeek API
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com

# Development
DISABLE_RATE_LIMIT=true  # Optional: disable rate limiting in development
```

## Key Implementation Details

### Chinese Language Support
- AI prompts configured for Chinese output in `lib/agents/prompts/consistency-prompts.ts`
- Error detection rules use Chinese indicators in `lib/agents/types.ts`

### Rate Limiting Configuration
- Development: 100 requests/minute (or disabled with env var)
- Production: 10 requests/minute
- Configured in `lib/api/middleware/rate-limit.ts`

### File Upload Restrictions
- **Accepted**: `.txt`, `.md`, `.markdown` only
- **Rejected**: `.fdx`, `.fountain`, `.docx`
- Validation in both frontend and backend

### Demo User
- ID: `demo-user`
- Created automatically via seed script or manual insertion
- Required for project creation due to foreign key constraints

## Common Development Scenarios

### After Cloning the Repository
```bash
npm install
docker run -d --name director-postgres -e POSTGRES_USER=director_user -e POSTGRES_PASSWORD=director_pass_2024 -e POSTGRES_DB=director_actor_db -p 5432:5432 postgres:16-alpine
npx prisma db push
npx prisma db seed  # Creates demo-user
DISABLE_RATE_LIMIT=true npm run dev
```

### Testing V1 API Flow (Current Production Flow)
1. **Dashboard Flow** (http://localhost:3000/dashboard):
   - Upload script (.txt/.md/.markdown)
   - Click "开始AI分析" button
   - System creates project and starts analysis automatically
   - Redirects to analysis page with polling

2. **Analysis Page** (http://localhost:3000/analysis/:projectId):
   - Polls job status every 2 seconds
   - Shows progress bar and status (QUEUED → PROCESSING → COMPLETED)
   - Displays diagnostic report when complete
   - Allows accept/reject of error suggestions

3. **V1 Demo Page** (http://localhost:3000/v1-demo):
   - Alternative testing interface
   - Manual control over project creation and analysis triggering

### Adding New API Endpoints
1. Create route in `app/api/v1/[endpoint]/route.ts`
2. Use `withMiddleware()` wrapper
3. Implement Zod schema validation
4. Use `createApiResponse()` for responses
5. Add service in `lib/db/services/`

### Modifying AI Analysis Prompts
- System prompts: `lib/agents/prompts/consistency-prompts.ts`
- Error detection rules: `lib/agents/types.ts`
- Ensure Chinese language consistency

## Critical File Locations

### Frontend (Client-Side)
- **Pages**: `app/dashboard/page.tsx`, `app/analysis/[id]/page.tsx`, `app/revision/page.tsx`
- **V1 API Client**: `lib/services/v1-api-service.ts` - Main service for all V1 API calls
- **State Management**: `lib/stores/analysis-store.ts`, `revision-store.ts` (now in-memory only, no persistence)

### Backend (Server-Side)
- **V1 API Routes**: `app/api/v1/*/route.ts`
  - `projects/route.ts` - Project CRUD
  - `analyze/route.ts` - Start analysis
  - `analyze/jobs/[jobId]/route.ts` - Job status polling
  - `projects/[id]/status/route.ts` - Workflow status
  - `projects/[id]/report/route.ts` - Diagnostic report
- **Workflow Queue**: `lib/api/workflow-queue.ts` - Background job processor
- **AI Agents**: `lib/agents/consistency-guardian.ts`, `revision-executive.ts`
- **Database Services**: `lib/db/services/*.service.ts`
- **Script Parsers**: `lib/parser/script-parser.ts`, `lib/parser/markdown-script-parser.ts`

### Documentation
- **Epic 004**: `docs/epics/epic-004-architecture-migration/` - Architecture migration details
- **Test Results**: `docs/epics/epic-004-architecture-migration/TEST_RESULTS.md`

## Known Issues and Solutions

### Database Connection Errors
If Supabase is unreachable, switch to local PostgreSQL (see Local PostgreSQL Setup above)

### Foreign Key Constraint Errors
Ensure demo-user exists: `npx prisma db seed`

### CSS Styles Missing
Clear Next.js cache: `rm -rf .next node_modules/.cache && npm run dev`

### TypeScript Build Errors
- Parser methods are synchronous (no async/await)
- `parseScriptClient` returns `ParsedScript` directly, not Promise

### Rate Limiting in Development
Use `DISABLE_RATE_LIMIT=true npm run dev` to bypass rate limits during testing

## Important Conventions

### Data Flow Pattern (Post Epic 004)
1. **Client** → Calls `v1ApiService` methods
2. **v1ApiService** → Fetches from `/api/v1/*` endpoints
3. **API Route** → Uses database services from `lib/db/services/`
4. **Database Service** → Interacts with Prisma ORM
5. **Result** → Flows back through same chain

**DO NOT** use localStorage anywhere - all data persists server-side.

### Async Job Pattern
For long-running operations:
1. Create job via `POST /api/v1/analyze`
2. Job gets queued in database (JobStatus: QUEUED)
3. WorkflowQueue processes job in background (JobStatus: PROCESSING)
4. Client polls `GET /api/v1/analyze/jobs/:jobId` every 2 seconds
5. When complete (JobStatus: COMPLETED), fetch results

### Type Definitions
- **LogicError**: Used for analysis errors (NOT AnalysisError)
- **DiagnosticReport**: Contains findings from ConsistencyGuardian
- **WorkflowStatus**: Tracks five-act workflow state machine
- **JobStatus**: Tracks individual job states (QUEUED/PROCESSING/COMPLETED/FAILED)

### Testing Conventions
- Core V1 API tests: `tests/integration/v1-api-flow.test.ts`, `tests/unit/v1-api-service.test.ts`
- Use `mockResolvedValue()` for continuous polling, not `mockResolvedValueOnce()`
- Set proper timeouts (10-15 seconds) for async tests
- Always call `v1ApiService.clearState()` in test cleanup