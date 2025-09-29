# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScriptAI MVP - An AI-powered script analysis system that detects and fixes logical errors in screenplays using a three-agent collaborative AI architecture. Built with Next.js 14, TypeScript, PostgreSQL/Prisma, and DeepSeek API.

**Current Architecture**: Database-backed V1 API with async job queue system (migrated from localStorage in Epic 004)

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
- **Status Polling**: Frontend polls `/api/v1/analyze/:jobId/status`
- **Database Persistence**: PostgreSQL via Prisma ORM
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

### Testing V1 API Flow
1. Visit http://localhost:3000/v1-demo
2. Create project → Upload script → Start analysis
3. Poll status until complete → View diagnostic report

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

- **V1 API Routes**: `app/api/v1/*/route.ts`
- **Workflow Queue**: `lib/api/workflow-queue.ts`
- **AI Agents**: `lib/agents/consistency-guardian.ts`, `revision-executive.ts`
- **Database Services**: `lib/db/services/*.service.ts`
- **Script Parsers**: `lib/parser/script-parser.ts`, `lib/parser/markdown-script-parser.ts`
- **State Management**: `lib/stores/analysis-store.ts`, `revision-store.ts`
- **Test Documentation**: `docs/epics/epic-004-architecture-migration/`

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