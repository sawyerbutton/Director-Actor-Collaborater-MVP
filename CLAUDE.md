# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScriptAI MVP - An AI-powered script analysis system that detects and fixes logical errors in screenplays using three collaborative AI agents. Built with Next.js 14, TypeScript, and DeepSeek API.

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
npm run typecheck           # Run TypeScript type checking
npm run lint                # Run ESLint
```

### Database
```bash
npx prisma db push          # Push schema changes to database
npx prisma migrate dev      # Create and apply migrations
npx prisma studio           # Open Prisma Studio GUI
npx prisma generate         # Generate Prisma Client
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

### AI Analysis Flow
1. Script upload → Parse to structured format
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
- Script parser: `lib/parser/script-parser.ts`
- Database services: `lib/db/services/*.service.ts`
- Client stores: `lib/stores/analysis-store.ts`, `revision-store.ts`
- Deployment scripts: `scripts/deployment/*.sh`
- Environment config: `.env`, `env/.env.production.example`