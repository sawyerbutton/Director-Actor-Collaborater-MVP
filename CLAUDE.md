# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScriptAI MVP - An AI-powered script analysis system that detects and fixes logical errors in screenplays using three collaborative AI agents. Built with Next.js 14, TypeScript, and DeepSeek API.

**Current Status**: Production-ready with file type restrictions (only .txt, .md, .markdown supported)

## Essential Commands

### Development
```bash
npm run dev                  # Start development server on localhost:3000
npm run build               # Build for production
npm run start               # Start production server
```

### Testing
```bash
npm test                     # Run unit tests (Jest)
npm run test:watch          # Run tests in watch mode
npm run test:e2e            # Run E2E tests (Playwright)
npm run test:e2e:ui         # Run E2E tests with UI
npm run test:e2e:debug      # Run E2E tests in debug mode
npm run test:e2e:headed     # Run E2E tests in headed mode (visible browser)
npm run test:e2e:report     # Show Playwright test report
npm run typecheck           # Run TypeScript type checking
npm run lint                # Run ESLint
npm run check:all           # Run typecheck, lint, and build in sequence
```

### Database
```bash
npx prisma db push          # Push schema changes to database
npx prisma migrate dev      # Create and apply migrations
npx prisma migrate deploy   # Apply migrations in production
npx prisma migrate reset    # Reset database and reapply migrations
npx prisma studio           # Open Prisma Studio GUI
npx prisma generate         # Generate Prisma Client
npx prisma db seed          # Seed database with initial data

# Alternative npm scripts for database operations:
npm run db:generate         # Same as npx prisma generate
npm run db:migrate:dev      # Same as npx prisma migrate dev
npm run db:migrate:deploy   # Same as npx prisma migrate deploy
npm run db:migrate:reset    # Same as npx prisma migrate reset
npm run db:seed            # Same as npx prisma db seed
npm run db:studio          # Same as npx prisma studio
```

### Deployment Verification
```bash
bash scripts/deployment/quick-deploy-check.sh    # Quick deployment check
bash scripts/deployment/pre-deploy-check.sh      # Detailed pre-deployment check
```

## Architecture Overview

### Three-Agent AI System
The core of the application is a collaborative AI system with three specialized agents:

1. **Consistency Guardian** (`lib/agents/consistency-guardian.ts`)
   - Detects 5 types of logical errors: character, timeline, scene, plot, dialogue consistency
   - Uses DeepSeek API for analysis
   - Implements parallel processing for performance
   - Returns confidence scores for each detected issue

2. **Revision Executive** (`lib/agents/revision-executive.ts`)
   - Generates contextual fixes for detected errors
   - Validates AI output for security
   - Works with Incremental Analyzer for continuous consistency

3. **Incremental Analyzer** (Part of change-driven analysis system)
   - Maintains consistency after script changes
   - Delta-based analysis optimization
   - Version control for script changes

### API Architecture
- **Next.js 14 App Router** with serverless API routes
- **Middleware Pipeline**: Rate limiting, CORS, security headers, validation
- **Job Queue System**: Async processing with status polling for AI analysis
- **Standardized Response Format**: All APIs use `createApiResponse()` wrapper

### State Management
- **Zustand stores** with persistence for client state
- **Analysis Store**: Manages script analysis state and results
- **Revision Store**: Tracks modification history and undo/redo

### Database Structure
- **PostgreSQL** with Prisma ORM
- **Models**: User, Project, Analysis
- **Connection Pooling**: Uses Supabase pooler for serverless environment
- **Direct URL**: Separate connection for migrations

## Project Structure

```
/app                # Next.js App Router
  /api/v1          # API routes (analyze, export, projects)
  /(dashboard)     # Main application pages
/lib               # Core business logic
  /agents          # AI agent implementations
  /api             # External API integrations (DeepSeek)
  /db              # Database services and client
  /parser          # Script parsing logic
  /services        # Business services (export, revision tracking)
  /stores          # Zustand state management
/components        # React components
/config           # Configuration files (jest, playwright, tailwind)
/tests            # All test files organized by type
/scripts          # Deployment and utility scripts
/docs             # Documentation
/env              # Environment variable examples
/prisma           # Database schema and migrations
```

## Environment Variables

Required for deployment:
- `DATABASE_URL` - Supabase pooler connection (port 6543, includes ?pgbouncer=true)
- `DIRECT_URL` - Supabase direct connection (port 5432, for migrations)
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `DEEPSEEK_API_URL` - DeepSeek API endpoint (default: https://api.deepseek.com)
- `NEXTAUTH_URL` - NextAuth URL for authentication (e.g., http://localhost:3000)
- `NEXTAUTH_SECRET` - NextAuth secret for JWT signing
- `NEXT_PUBLIC_APP_URL` - Public app URL for client-side operations

## Deployment Configuration

### Vercel Deployment
- Build command includes Prisma generation: `npx prisma generate && npm run build`
- Region: Singapore (sin1) for proximity to Asia
- Function timeouts configured per route in `vercel.json`

### Supabase Database
- Use "ORMs → Prisma" tab to get correct connection strings
- Transaction pooler for `DATABASE_URL` (port 6543)
- Direct connection for `DIRECT_URL` (port 5432)
- Remove brackets from password if present in connection string

## Key Implementation Details

### File Upload Restrictions (BREAKING CHANGE)
- **Only accepts**: `.txt`, `.md`, `.markdown` files
- **Rejected formats**: `.fdx`, `.fountain`, `.docx` (no longer supported)
- Validation occurs at both frontend (`DragDropUpload` component) and backend (`ScriptParser`)
- Clear error messages shown for unsupported formats

### AI Analysis Flow
1. Script upload → Parse to structured format (with format validation)
2. Consistency Guardian analyzes in parallel batches
3. Results cached with TTL for performance
4. Revision Executive generates fixes on-demand
5. Intelligent repair system applies accepted changes with LLM

### Security Measures
- XSS prevention via DOMPurify sanitization
- Request size validation (10MB limit)
- Rate limiting on API endpoints
- Input validation with Zod schemas
- AI output validation before display

### Performance Optimizations
- Virtual scrolling for large scripts
- Parallel AI analysis with chunking
- Database indexing on frequently queried fields
- Caching layer for analysis results
- Async job queue for long-running tasks

## Testing Strategy

### Unit Tests
- Located in `tests/__tests__/`
- Cover all core modules (agents, parser, API clients)
- Run with `npm test`

### E2E Tests
- Located in `tests/e2e/`
- Cover full user journeys (upload, analyze, modify, export)
- WSL-optimized configuration included
- Run with `npm run test:e2e`

## Common Development Tasks

### Running a Single Test
```bash
npm test -- path/to/test.spec.ts           # Run specific test file
npm test -- -t "test description"          # Run test by description
npm run test:e2e -- path/to/e2e.spec.ts   # Run specific E2E test
```

### Adding a New API Endpoint
1. Create route in `app/api/v1/[endpoint]/route.ts`
2. Use `withMiddleware()` wrapper for standard middleware
3. Implement Zod schema for validation
4. Use `createApiResponse()` for consistent responses
5. Add corresponding service in `lib/db/services/`

### Modifying AI Agents
1. Agent implementations in `lib/agents/`
2. Prompts in `lib/agents/prompts/`
3. Update types in `types/analysis.ts`
4. Test with mock DeepSeek responses

### Updating Database Schema
1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name [migration_name]`
3. Update corresponding services in `lib/db/services/`
4. Generate client with `npx prisma generate`

## Critical File Locations

- API route handlers: `app/api/v1/*/route.ts`
- AI agents: `lib/agents/consistency-guardian.ts`, `revision-executive.ts`
- Script parser: `lib/parser/script-parser.ts`, `lib/parser/markdown-script-parser.ts`
- Parser converters: `lib/parser/converters/markdown-to-script.ts`
- Upload components: `components/upload/DragDropUpload.tsx`, `components/analysis/enhanced-script-upload.tsx`
- Database services: `lib/db/services/*.service.ts`
- Client stores: `lib/stores/analysis-store.ts`, `revision-store.ts`
- Deployment scripts: `scripts/deployment/*.sh`
- Environment config: `.env`, `env/.env.production.example`
- Test utilities: `tests/setup/*.ts`, `tests/__mocks__/*.ts`

## Known Issues and Solutions

### TypeScript Build Errors
If encountering `Promise<ParsedScript>` type errors:
- Parser methods are now synchronous (no async/await needed)
- `parseScriptClient` returns `ParsedScript` directly, not a Promise

### Diagnostic Scripts
The following scripts are excluded from TypeScript compilation:
- `scripts/diagnose-repair-failure.ts`
- `scripts/simple-diagnosis.ts`
- `scripts/test-repair-fix.ts`

These are utility scripts for debugging and don't affect the main application build.