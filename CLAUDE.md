# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Reference Documentation

**Quick Links** - Comprehensive reference guides in `/ref` directory:

- **[Architecture Overview](ref/ARCHITECTURE_OVERVIEW.md)** - ✨ **NEW** - High-level system architecture, tech stack, performance characteristics, and quick navigation
- **[AI Agents Reference](ref/AI_AGENTS.md)** - Complete guide to all 6 AI agents (ConsistencyGuardian, CharacterArchitect, RulesAuditor, PacingStrategist, ThematicPolisher, RevisionExecutive)
- **[API Reference](ref/API_REFERENCE.md)** - Complete V1 API documentation with all endpoints, request/response formats, error handling
- **[Database Schema Reference](ref/DATABASE_SCHEMA.md)** - Prisma models, services, migrations, queries, and optimization tips
- **[Multi-File Analysis Reference](ref/MULTI_FILE_ANALYSIS.md)** - Cross-file consistency checking, AI-assisted decision making, batch analysis (Sprint 3)
- **[Bug Fixes Reference](ref/BUG_FIXES.md)** - ✨ **NEW** - Critical bug fixes, root causes, solutions, and prevention checklist
- **[Frontend Components Reference](ref/FRONTEND_COMPONENTS.md)** - Pages, workspace components, UI library, API client, and state management
- **[Testing Guide](ref/TESTING_GUIDE.md)** - Unit testing, integration testing, E2E testing patterns, and conventions
- **[Deployment Guide](ref/DEPLOYMENT_GUIDE.md)** - Vercel deployment, Supabase setup, monitoring, troubleshooting, and scaling
- **[Workflow Reference](ref/WORKFLOW_REFERENCE.md)** - Complete five-act workflow system with state machine, agents, and synthesis

**Detailed Architecture (250+ pages)** - In-depth technical documentation in `/docs/architecture`:

- **[Main Index](docs/architecture/SYSTEM_ARCHITECTURE_COMPLETE.md)** - Navigation hub for all architecture documentation
- **[Business Flow](docs/architecture/01_BUSINESS_FLOW.md)** (70+ pages) - Product positioning, user journey, five-act workflow, decision points
- **[Database Architecture](docs/architecture/02_DATABASE_ARCHITECTURE.md)** (40+ pages) - Schema design, indexes, query patterns, transactions, migrations
- **[Frontend Architecture](docs/architecture/03_FRONTEND_ARCHITECTURE.md)** (40+ pages) - React components, state management, API communication, performance
- **[Backend API Architecture](docs/architecture/04_BACKEND_API_ARCHITECTURE.md)** (45+ pages) - API routes, middleware, async jobs, error handling, Serverless patterns
- **[LLM Integration](docs/architecture/05_LLM_INTEGRATION.md)** (40+ pages) - DeepSeek API, 6 AI agents, prompt chains (P4-P13), JSON validation
- **[Deployment Architecture](docs/architecture/06_DEPLOYMENT_ARCHITECTURE.md)** (30+ pages) - Local setup, Vercel deployment, Supabase config, monitoring, troubleshooting

**When to Use Reference Docs:**
- ✅ Learning the codebase for the first time → Start with **Architecture Overview** or **Workflow Reference**
- ✅ Understanding system design → Read **Detailed Architecture** docs
- ✅ Implementing new features → Check **AI Agents** + **API Reference** + relevant architecture doc
- ✅ Debugging issues → Check **Bug Fixes Reference** + **Deployment Architecture** troubleshooting
- ✅ Writing tests → Follow **Testing Guide** patterns
- ✅ Deploying to production → Follow **Deployment Guide** + **Deployment Architecture**
- ✅ Working with multi-file analysis → Check **Multi-File Analysis Reference** (Sprint 3)
- ✅ Fixing bugs → Check **Bug Fixes Reference** for known issues and solutions

**This File (CLAUDE.md):**
- Quick start guide and essential commands
- Critical gotchas and conventions
- Common development scenarios
- Pointers to detailed documentation

## 🚀 Quick Start (5 Minutes)

**First time in this codebase? Start here:**

```bash
# 1. Clone and install
npm install

# 2. Start PostgreSQL (Docker)
docker run -d --name director-postgres \
  -e POSTGRES_USER=director_user \
  -e POSTGRES_PASSWORD=director_pass_2024 \
  -e POSTGRES_DB=director_actor_db \
  -p 5432:5432 postgres:16-alpine

# 3. Setup environment (.env file)
# DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
# DEEPSEEK_API_KEY=your_key_here
# DISABLE_RATE_LIMIT=true

# 4. Initialize database
npx prisma db push && npx prisma db seed

# 5. Start development server
npm run dev  # Visit http://localhost:3000/dashboard
```

**Critical Gotchas:**
- ❌ Never throw errors in API handlers (Serverless compatibility) - always return JSON
- ❌ Never use localStorage - all data is server-side
- ✅ Always use `v1ApiService` for API calls (client-side)
- ✅ Always use async job pattern for long operations (ACT1, ACT2-5, Synthesis)
- ✅ Run `npx prisma generate` after schema changes
- ✅ Check CLAUDE.md when stuck - it contains all architecture details

## Project Overview

ScriptAI MVP - An AI-powered script analysis system that detects and fixes logical errors in screenplays using a five-act interactive workflow and DeepSeek API. Built with Next.js 14, TypeScript, PostgreSQL/Prisma, and async job queue architecture.

**Current Architecture**: Database-backed V1 API with async job queue system (migrated from localStorage in Epic 004)

**Important**: The README describes the original MVP implementation. The current production system uses the V1 API architecture described in this file. localStorage has been completely removed.

## Essential Commands

### Development
```bash
npm run dev                  # Start development server (default: localhost:3000, auto-increments if port busy)
DISABLE_RATE_LIMIT=true npm run dev  # Start without rate limiting (development)
npm run build               # Build for production
npm run start               # Start production server
npm run check:all           # Run typecheck, lint, and build in sequence
```

**Note**: If port 3000 is occupied, Next.js will automatically try port 3001, 3002, etc. Update URLs accordingly.

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

### 🎯 Product Positioning & Value Proposition

**Core Philosophy**: ScriptAI is an **AI Creative Assistant** for screenwriters, not an error-fixing tool. The system provides differentiated value across two distinct phases:

#### **Phase 1: ACT1 - Quick Logic Repair (修Bug)**
- **Focus**: Fix objective logical errors (timeline contradictions, character inconsistencies)
- **Speed**: 5-10 minutes for most scripts
- **Output**: V1 script with logical consistency
- **User Decision**: Use repaired script directly OR continue to creative enhancement

#### **Phase 2: ACT2-5 - Creative Enhancement (创作升级)**
- **Focus**: Deepen artistic quality beyond logical correctness
- **Value Transformation**:
  - **ACT2**: Flat characters → Three-dimensional characters (growth arcs, inner conflicts)
  - **ACT3**: Reasonable worldbuilding → Compelling worldbuilding (rich details, dramatic tension)
  - **ACT4**: Smooth pacing → Riveting pacing (suspense, emotional intensity)
  - **ACT5**: Surface story → Spiritual depth (thematic resonance, emotional penetration)
- **Output**: V2+ scripts with progressive artistic enhancement

**Key Distinction**:
- ACT1 makes your script **correct** (logical repair)
- ACT2-5 make your script **great** (creative enhancement)

This differentiated positioning ensures users understand each phase serves a distinct purpose in the creative journey.

### Five-Act Workflow State Machine
The system implements a five-act interactive workflow for script analysis:
- `INITIALIZED` → `ACT1_RUNNING` → `ACT1_COMPLETE` → `ITERATING` → `SYNTHESIZING` → `COMPLETED`

**Act 1 (Logic Repair)**: ConsistencyGuardian detects 5 logic error types for quick fixes
**Act 2 (Character Depth Creation)**: CharacterArchitect deepens character arcs and psychological complexity
**Act 3 (Worldbuilding Enrichment)**: RulesAuditor enriches setting details and dramatic potential
**Act 4 (Pacing Enhancement)**: PacingStrategist optimizes rhythm and dramatic tension
**Act 5 (Spiritual Depth)**: ThematicPolisher enhances thematic resonance and emotional core
**Synthesis (Epic 007)**: SynthesisEngine merges all decisions into final script (V2) with conflict resolution and style preservation

### Core AI Agents

**Positioning Note**: All ACT2-5 agents are **creative enhancement oriented**, not error-fixing tools. They help screenwriters deepen artistic quality beyond logical correctness.

1. **ConsistencyGuardian** (`lib/agents/consistency-guardian.ts`) - Epic 004 | **ACT1 Logic Repair**
   - Detects 5 logic error types: timeline, character, plot, dialogue, scene inconsistencies
   - Chinese language prompts for Chinese output
   - Parallel chunk processing for performance
   - Purpose: Quick logical error detection and repair (5-10 minutes)

2. **CharacterArchitect** (`lib/agents/character-architect.ts`) - Epic 005 | **ACT2 Character Depth Creation**
   - Implements P4-P6 prompt chain for character arc deepening
   - P4: Analyze character growth potential (not contradiction fixing)
   - P5: Generate 2 creative development paths (渐进式 vs 戏剧性)
   - P6: Execute "Show, Don't Tell" transformation for dramatic presentation
   - **Value**: Transforms flat characters → three-dimensional characters with growth arcs
   - Returns structured JSON with DeepSeek `response_format: { type: 'json_object' }`

3. **RulesAuditor** (`lib/agents/rules-auditor.ts`) - Epic 006 | **ACT3 Worldbuilding Enrichment**
   - Implements P7-P9 prompt chain for worldbuilding enhancement
   - P7: Analyze worldbuilding depth potential (not audit inconsistencies)
   - P8: Generate enrichment paths with dramatic ripple effects
   - P9: Execute setting-theme integration for thematic resonance
   - **Value**: Transforms reasonable worldbuilding → compelling worldbuilding with rich details

4. **PacingStrategist** (`lib/agents/pacing-strategist.ts`) - Epic 006 | **ACT4 Pacing Enhancement**
   - Implements P10-P11 prompt chain for rhythm optimization
   - P10: Analyze pacing enhancement opportunities (not identify issues)
   - P11: Generate pacing enhancement strategies (suspense, climax, tension)
   - **Value**: Transforms smooth pacing → riveting pacing with dramatic tension

5. **ThematicPolisher** (`lib/agents/thematic-polisher.ts`) - Epic 006 | **ACT5 Spiritual Depth**
   - Implements P12-P13 prompt chain for thematic resonance
   - P12: Enhance character spiritual depth (not de-label generic traits)
   - P13: Define empathy core and thematic resonance (not fears/beliefs fixing)
   - **Value**: Transforms surface story → spiritual depth with emotional penetration

6. **RevisionExecutive** (`lib/agents/revision-executive.ts`)
   - Generates contextual fixes for detected errors
   - Validates and sanitizes AI outputs

7. **CrossFileAdvisor** (`lib/agents/cross-file-advisor.ts`) - Sprint 3 | **Multi-File Decision Support**
   - AI-powered resolution strategy generator for cross-file issues
   - Generates 2-3 actionable solutions per finding
   - Provides impact analysis and difficulty ratings
   - **Value**: Helps resolve timeline, character, plot, and setting inconsistencies across multiple script files
   - Returns structured ResolutionAdvice with recommended solution index

8. **SynthesisEngine** (`lib/synthesis/synthesis-engine.ts`) - Epic 007
   - Orchestrates complete synthesis workflow
   - Integrates decisions from all 5 acts
   - Detects and resolves conflicts automatically
   - Preserves original script style (6-dimensional analysis)
   - Supports chunking for long scripts (>6000 tokens)
   - Generates V2 script with confidence scoring

### Multi-File Analysis System (Sprint 3) ✨ NEW

**Purpose**: Extend single-file analysis to handle multiple script files (episodes), detecting **cross-file consistency issues** that span across different files.

See **[Multi-File Analysis Reference](ref/MULTI_FILE_ANALYSIS.md)** for complete documentation.

#### Key Components

1. **CrossFileAnalyzer** (`lib/analysis/cross-file-analyzer.ts`)
   - Base class for cross-file consistency checking
   - **DefaultCrossFileAnalyzer**: Implements 4 check types
     - `checkTimeline()`: Timeline inconsistencies across episodes
     - `checkCharacter()`: Character introduction and naming issues
     - `checkPlot()`: Plot thread continuity problems
     - `checkSetting()`: Location description conflicts

2. **CrossFileAdvisor** (`lib/agents/cross-file-advisor.ts`)
   - AI-powered resolution strategy generator
   - Generates 2-3 solutions per finding
   - Provides impact analysis and difficulty ratings
   - Type-specific prompts (timeline, character, plot, setting)

3. **MultiFileAnalysisService** (`lib/db/services/multi-file-analysis.service.ts`)
   - Service layer for multi-file analysis operations
   - `analyzeProject()`: Full project analysis (internal + cross-file)
   - `analyzeCrossFileIssues()`: Cross-file only analysis
   - `getCrossFileFindings()`: Query cross-file findings
   - `getGroupedCrossFileFindings()`: Query findings grouped by type

#### API Endpoints (Sprint 3)

- `POST /api/v1/projects/[id]/analyze/cross-file` - Run cross-file analysis
- `GET /api/v1/projects/[id]/cross-file-findings?grouped=true` - Get findings

#### Cross-File Finding Types

```typescript
type CrossFileFindingType =
  | 'cross_file_timeline'    // Timeline inconsistencies
  | 'cross_file_character'   // Character issues
  | 'cross_file_plot'        // Plot continuity
  | 'cross_file_setting';    // Location conflicts
```

#### Quick Example

```typescript
// Run cross-file analysis
const { findings } = await multiFileAnalysisService.analyzeCrossFileIssues(
  projectId,
  {
    checkTypes: ['cross_file_timeline', 'cross_file_character'],
    minConfidence: 0.75,
  }
);

// Generate AI resolution strategies
const advisor = createCrossFileAdvisor(apiKey);
const advice = await advisor.generateAdvice(findings[0], scriptContexts);

console.log(`Analysis: ${advice.analysis}`);
console.log(`Solutions: ${advice.solutions.length}`);
console.log(`Recommended: ${advice.recommendedSolutionIndex}`);
```

#### UI Integration (Sprint 3 - **NEW 2025-11-06**)

Complete frontend workflow for multi-file projects:

**Project Type Segregation**:
- Database: `ProjectType` enum (SINGLE, MULTI_FILE) added to schema
- API: GET /api/v1/projects supports `projectType` filter parameter
- Dual business logic: Single-file (ACT1-5 + Synthesis) vs Multi-file (Cross-file checking only)

**4-Page Workflow**:
1. **`/multi-file`** - Project List
   - Displays all MULTI_FILE projects with file count and status
   - Badge system for workflow status
   - Create new project button

2. **`/multi-file/new`** - Create Project (3-Step Wizard)
   - Step 1: Project info form (title, description)
   - Step 2: File upload with MultiFileUploader component (max 50 files)
   - Step 3: Success page with navigation

3. **`/multi-file/[projectId]`** - Project Management
   - Two-tab interface: "文件管理" + "分析操作"
   - Integrates FileListManager for file CRUD
   - Button to trigger cross-file analysis
   - Shows file count and analysis requirements

4. **`/multi-file/[projectId]/analysis`** - Analysis Results
   - Dual-tab results: "跨文件分析" + "单文件内部"
   - Summary cards: Total files, analyzed files, internal errors, cross-file errors
   - Uses CrossFileFindingsDisplay component for rich findings visualization
   - Refresh analysis button
   - Empty states for no findings

**Dashboard Integration**:
- Gradient blue card in right sidebar promoting multi-file analysis
- 3 feature highlights with checkmarks
- Direct navigation to /multi-file

**Technical Notes**:
- Multi-file projects don't support ACT2-5 iteration or Synthesis
- Content field optional for MULTI_FILE projects (empty string)
- After schema changes, run `npx prisma generate` and restart dev server

### API Architecture (V1 - Current Production System)

#### Async Job Queue System
- **WorkflowQueue** (`lib/api/workflow-queue.ts`): Singleton pattern managing background jobs
  - Processes jobs every 3 seconds
  - Handles Act 1 analysis with ConsistencyGuardian
  - Handles synthesis jobs with SynthesisEngine (Epic 007)
  - Updates WorkflowStatus state machine
  - Stores DiagnosticReport in database

#### Serverless (Vercel) Compatibility Architecture **NEW 2025-10-09**

**Problem**: Traditional `setInterval()` background processing doesn't work in Serverless environments (Vercel, AWS Lambda) because:
- Functions terminate after request completion
- All timer callbacks (`setInterval`, `setImmediate`) are cleared on termination
- Jobs remained stuck in QUEUED/PROCESSING state indefinitely

**Solution**: Dual-mode WorkflowQueue with active polling pattern

**Architecture Components**:

1. **Environment Detection** (`lib/api/workflow-queue.ts:25-47`):
   ```typescript
   const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

   if (!isServerless) {
     // Traditional server: background processing with setInterval
     this.processInterval = setInterval(() => {
       this.processNext();
     }, 3000);
   } else {
     // Serverless: manual trigger mode
     console.log('⚡ WorkflowQueue: Serverless mode - use manual processing');
   }
   ```

2. **Manual Processing Endpoint** (`app/api/v1/analyze/process/route.ts`):
   - `POST /api/v1/analyze/process` - Manually triggers job processing
   - Called by frontend during polling loop
   - Returns: `{ processed: 0|1, message: string }`
   - Used in Serverless environments to trigger job execution

3. **Active Polling Pattern** (`lib/services/v1-api-service.ts:305-307`):
   ```typescript
   async pollJobStatus(jobId: string) {
     while (attempts < MAX_POLL_ATTEMPTS) {
       // Trigger processing BEFORE checking status (Serverless compatibility)
       await this.triggerProcessing();

       const status = await this.getJobStatus(jobId);
       // ... polling logic
     }
   }
   ```

4. **Analysis Page Integration** (`app/analysis/[id]/page.tsx:57-59`):
   ```typescript
   // Ensure processing is triggered even for initial page load
   await v1ApiService.triggerProcessing();
   const status = await v1ApiService.getJobStatus(jobId);
   ```

**Key Methods**:
- `workflowQueue.processNextManually()` - Public method for manual processing
- `v1ApiService.triggerProcessing()` - Client-side trigger with silent failure
- Both traditional and Serverless modes use the same processing logic

**Debugging Tool**: `scripts/debug-act1-analysis.ts`
- Diagnoses stuck jobs (QUEUED/PROCESSING)
- Checks environment variables
- Analyzes job timing
- Provides manual intervention steps
- Usage: `npx tsx scripts/debug-act1-analysis.ts [jobId]`

**Performance**:
- No performance impact on traditional servers (still uses setInterval)
- Serverless: Jobs processed within 5 seconds of being queued (polling interval)
- Compatible with both environments without code changes

#### Status Polling Pattern
- Frontend polls job status every 5 seconds (reduced from 2s on 2025-10-02)
- Client: `v1ApiService.pollJobStatus()` in `lib/services/v1-api-service.ts`
- Server: `GET /api/v1/analyze/jobs/:jobId`
- **Serverless**: Each poll triggers `POST /api/v1/analyze/process` first
- Supports long-running AI operations without blocking

#### Database Persistence
- PostgreSQL via Prisma ORM
- All state persisted server-side (NO client storage)
- Key models: User, Project, ScriptVersion, AnalysisJob, DiagnosticReport, RevisionDecision

#### Middleware Stack
- Rate limiting (disabled in dev with `DISABLE_RATE_LIMIT=true`)
- CORS, security headers
- Zod validation for all inputs
- Comprehensive error handling

### Database Models (Prisma Schema)

**Project**: Central model with `workflowStatus` enum tracking five-act progress
**ScriptVersion**: Versioned script storage with changeLog, synthesisMetadata (Epic 007), and confidence score
**AnalysisJob**: Async job tracking with JobType (ACT1_ANALYSIS, SYNTHESIS, ITERATION, EXPORT)
**DiagnosticReport**: Act 1 findings with structured JSON
**RevisionDecision**: User decisions during Acts 2-5 with proposals and generatedChanges
**ActType enum**: `ACT2_CHARACTER`, `ACT3_WORLDBUILDING`, `ACT4_PACING`, `ACT5_THEME`

### Key API Endpoints

#### V1 Core Endpoints (Epic 004)
- `POST /api/v1/projects` - Create new project with script
- `GET /api/v1/projects` - List user projects
- `GET /api/v1/projects/[id]` - Get project details (**CRITICAL**: Added 2025-10-09 to fix iteration page 404 errors)
- `POST /api/v1/analyze` - Start Act 1 analysis (returns jobId)
- `POST /api/v1/analyze/process` - Manual job processing trigger (**NEW 2025-10-09**: Serverless compatibility)
- `GET /api/v1/analyze/jobs/:jobId` - Poll job status
- `GET /api/v1/projects/[id]/status` - Get workflow status
- `GET /api/v1/projects/[id]/report` - Get diagnostic report

#### V1 ACT1 Repair Endpoint (NEW 2025-10-10)
- `POST /api/v1/projects/[id]/apply-act1-repair` - Apply ACT1 AI repair to project
  - Input: repairedScript, acceptedErrors[], metadata
  - Creates ScriptVersion V1 (or next version)
  - Updates Project.content with repaired script
  - Updates WorkflowStatus to ITERATING (enables ACT2-5)
  - **Critical**: Always returns JSON (never throws, even on error)
  - **Error Handling**: Content-type checking, HTML fallback, comprehensive logging
  - See `docs/fixes/ACT1_REPAIR_API_DEBUGGING.md` for troubleshooting

#### V1 Iteration Endpoints (Epic 005 & 006 + Async Queue - 2025-10-10)
- `POST /api/v1/iteration/propose` - Generate AI proposals for focus area (**ASYNC JOB**)
  - Supports: `ACT2_CHARACTER`, `ACT3_WORLDBUILDING`, `ACT4_PACING`, `ACT5_THEME`
  - Input: projectId, act, focusName, contradiction, scriptContext
  - **Output**: jobId for polling (< 1 second response)
  - **Pattern**: Create ITERATION job → Poll status → Retrieve proposals when COMPLETED
  - **Processing Time**: 30-60 seconds (background processing)
  - **Serverless Compatible**: Uses dynamic imports for code splitting
  - See `docs/fixes/ACT2_ASYNC_QUEUE_IMPLEMENTATION.md` for architecture
- `GET /api/v1/iteration/jobs/[jobId]` - Poll ITERATION job status (**NEW 2025-10-10**)
  - Returns: jobId, status (QUEUED/PROCESSING/COMPLETED/FAILED), progress, result, error
  - **Result structure** (when COMPLETED):
    - decisionId: string
    - focusContext: object
    - proposals: array (2 proposals for ACT2-5)
    - recommendation: string (recommended proposal ID)
  - **ACT2**: Returns 2 character proposals with pros/cons
  - **ACT3**: Returns worldbuilding solutions with ripple effects
  - **ACT4**: Returns pacing restructure strategies
  - **ACT5**: Returns enhanced character profile
- `POST /api/v1/iteration/execute` - Execute selected proposal
  - Input: decisionId, proposalChoice (0 or 1, or higher for Acts 3-5)
  - Updates RevisionDecision with userChoice and generatedChanges
  - **ACT2**: Executes "Show Don't Tell" transformation (P6)
  - **ACT3**: Executes setting-theme alignment (P9)
  - **ACT4**: Directly applies selected pacing strategy
  - **ACT5**: Defines character core fears/beliefs (P13)
- `GET /api/v1/projects/:id/decisions` - List all decisions for project
  - Supports filtering by act type
  - Returns execution statistics

#### V1 Synthesis Endpoints (Epic 007)
- `POST /api/v1/synthesize` - Trigger script synthesis
  - Input: projectId, options (preserveOriginalStyle, conflictResolution, changeIntegrationMode, includeChangeLog, validateCoherence)
  - Output: jobId for polling
  - Creates SYNTHESIS job in queue
  - Updates workflow status to SYNTHESIZING
- `GET /api/v1/synthesize/:jobId/status` - Poll synthesis job status
  - Returns job status, versionId (when complete), confidence score
- `GET /api/v1/projects/:id/versions` - List all script versions
- `GET /api/v1/versions/:id` - Get specific version details
- `GET /api/v1/versions/:id/diff/:targetId` - Compare two versions
- `POST /api/v1/export` - Export script in format (TXT, MD, DOCX)
- `GET /api/v1/export/:jobId` - Download exported file

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

### Vercel Deployment (Quick Reference)

**Prerequisites:**
- Vercel Pro Plan or higher (for 60s function timeouts)
- Supabase account for production database

**Deployment Steps:**
```bash
# 1. Set up Supabase database
# DATABASE_URL="postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# DIRECT_URL="postgresql://...@pooler.supabase.com:5432/postgres"

# 2. Configure vercel.json
# All AI endpoints need 60s timeout (analyze, process, propose, execute, synthesize)

# 3. Build and deploy
npx prisma generate && npm run build
vercel --prod

# 4. Post-deployment
npx prisma migrate deploy
npx prisma db seed  # Creates demo-user
```

**Critical Configuration:**
- ⚠️ Hobby Plan has 10s timeout limit - will cause 504 errors on large scripts
- ✅ Use Supabase Connection Pooler (pgbouncer=true) for Serverless
- ✅ Do NOT include `prisma db push` in build command (no DB access during build)

**Full Documentation**: `docs/VERCEL_DEPLOYMENT_CHECKLIST.md`

## Key Implementation Details

### Chinese Language Support
- All AI prompts configured for Chinese output
- Prompt files: `lib/agents/prompts/*-prompts.ts`
  - `consistency-prompts.ts` - Act 1 (ConsistencyGuardian)
  - `character-architect-prompts.ts` - Act 2 (CharacterArchitect)
  - `rules-auditor-prompts.ts` - Act 3 (RulesAuditor)
  - `pacing-strategist-prompts.ts` - Act 4 (PacingStrategist)
  - `thematic-polisher-prompts.ts` - Act 5 (ThematicPolisher)
- Synthesis prompts (`lib/synthesis/prompt-builder.ts`) preserve Chinese style and tone
- Style analyzer optimized for Chinese language patterns
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

### Complete UI Workflow (Production-Ready)

The system now has a **complete UI implementation** for the full five-act workflow:

#### Step 1: Dashboard (http://localhost:3001/dashboard)
1. Upload script (.txt/.md/.markdown, 500-10000 lines)
2. Click "开始AI分析" button
3. System creates project and starts Act 1 analysis automatically
4. Redirects to analysis page with polling

#### Step 2: Analysis Page (http://localhost:3001/analysis/:projectId)
1. Polls job status every 2 seconds
2. Shows progress bar and status (QUEUED → PROCESSING → COMPLETED)
3. Displays Act 1 diagnostic report with 5 error types
4. Click "进入迭代工作区" to proceed to Acts 2-5

#### Step 3: Iteration Page (http://localhost:3001/iteration/:projectId) ✨ NEW
**Complete Acts 2-5 interactive workflow:**
1. Select Act (2/3/4/5) using ActProgressBar
2. Choose focus problem from Act 1 findings (FindingsSelector)
   - **Act-Specific Filtering (2025-10-10)**: Each Act only shows relevant finding types
     - ACT2: Character contradictions only
     - ACT3: Scene and plot issues only
     - ACT4: Timeline issues only
     - ACT5: Character and dialogue issues only
   - **Enhanced UX (2025-10-09)**: Selected finding has 5 visual indicators (border, background, checkmark, badge, text color)
   - Selection context summary shown in Alert component before submission
   - Larger submit button for better visibility
   - Empty state message if no findings match current Act
3. Click "获取AI解决方案提案" to get 2 AI proposals (async job, 30-60s processing)
4. Review proposals with pros/cons (ProposalComparison)
5. Select and execute a proposal
6. View generated changes (ChangesDisplay)
7. Repeat for more problems or switch Acts
8. View decision history in "决策历史" tab
9. When ready, click "生成最终剧本 (N)" button in header (N = decisions count)

#### Step 4: Synthesis Page (http://localhost:3001/synthesis/:projectId) ✨ NEW
**Generate final V2 script:**
1. Configure synthesis options in dialog:
   - Preserve original style (6-dimensional analysis)
   - Conflict resolution strategy (auto_reconcile recommended)
   - Include change log
   - Validate coherence
2. Click "开始合成" to trigger synthesis
3. Monitor 10-step synthesis progress (real-time polling):
   - Grouping → Conflict Detection → Resolution → Style Analysis
   - Prompt Building → Chunking → AI Generation → Merging
   - Validation → Version Creation
4. View V2 result in 3 tabs:
   - **最终剧本 (V2)**: Full synthesized script with metadata
   - **修改日志**: Detailed change log
   - **版本对比**: V1 vs V2 side-by-side comparison
5. Export as TXT or MD format

**Complete Flow**: Dashboard → Act 1 → Iteration (Acts 2-5) → Synthesis → Export

**Time Estimates**:
- Small scripts (<1000 lines): 2-5 minutes total
- Medium scripts (1000-3000 lines): 5-15 minutes total
- Large scripts (3000-10000 lines): 10-30 minutes total

### Testing Iteration Workflows (Epic 005 & 006)

#### Act 2 - Character Arc (CharacterArchitect)
1. Complete Act 1 analysis first (get diagnostic report)
2. Call `POST /api/v1/iteration/propose` with `act: "ACT2_CHARACTER"`
3. Review 2 AI-generated proposals with pros/cons
4. Call `POST /api/v1/iteration/execute` with selected proposal (0 or 1)
5. Receive dramatic actions (P6 "Show Don't Tell" transformation)

#### Act 3 - Worldbuilding (RulesAuditor)
1. Call `POST /api/v1/iteration/propose` with `act: "ACT3_WORLDBUILDING"`
2. Receive worldbuilding inconsistencies (P7) and solutions (P8)
3. Call `POST /api/v1/iteration/execute` with selected solution
4. Receive setting-theme alignment strategies (P9)

#### Act 4 - Pacing (PacingStrategist)
1. Call `POST /api/v1/iteration/propose` with `act: "ACT4_PACING"`
2. Receive pacing analysis (P10) and restructure strategies (P11)
3. Call `POST /api/v1/iteration/execute` with selected strategy
4. Strategy is directly applied (no additional AI call)

#### Act 5 - Theme (ThematicPolisher)
1. Call `POST /api/v1/iteration/propose` with `act: "ACT5_THEME"`
2. Receive enhanced character profile (P12 - de-labeling and depth)
3. Call `POST /api/v1/iteration/execute` with profile choice
4. Receive character core definition (P13 - fears, beliefs, empathy hooks)

#### View Decision History
- Query `GET /api/v1/projects/:id/decisions` to view all decisions
- Filter by act type to see specific workflow results

### Testing Synthesis Workflow (Epic 007)

#### Synthesis Flow
1. Complete Acts 1-5 with at least one decision in each act
2. Call `POST /api/v1/synthesize` with projectId
3. Poll `GET /api/v1/synthesize/:jobId/status` every 2 seconds
4. When status is COMPLETED, retrieve versionId
5. Access synthesized script (V2) via version endpoints

#### Conflict Detection
- Synthesis automatically detects 6 conflict types:
  - Character contradictions (Act 2 vs Act 5)
  - Timeline overlaps (Act 4 vs other acts)
  - Setting inconsistencies (Act 3 vs others)
  - Plot conflicts (Act 2 vs Act 4)
  - Dialogue mismatches
  - Theme divergence (Act 5 vs others)
- Auto-resolution strategies: `latest_takes_precedence`, `merge_compatible`, `prioritize_by_severity`, `auto_reconcile`
- Manual review required for high-severity conflicts

#### Version Comparison
1. Get all versions: `GET /api/v1/projects/:id/versions`
2. Compare V1 and V2: `GET /api/v1/versions/:v2Id/diff/:v1Id`
3. Review additions, deletions, modifications
4. Check affected scenes and characters

#### Export Script
1. Trigger export: `POST /api/v1/export` with versionId and format (TXT/MD/DOCX)
2. Poll status: `GET /api/v1/export/:jobId`
3. Download when ready
4. Exports include metadata and change logs (if requested)

### Adding New API Endpoints
1. Create route in `app/api/v1/[endpoint]/route.ts`
2. Use `withMiddleware()` wrapper from `lib/api/middleware`
3. Implement Zod schema validation
4. Use `createApiResponse()` for responses
5. Add service in `lib/db/services/`

### API Error Handling Pattern (CRITICAL - Updated 2025-10-10)

**Problem**: In Serverless environments (Vercel), throwing errors inside API handlers causes Next.js to return HTML error pages instead of JSON, breaking frontend error handling.

**Solution**: Always return JSON responses, never throw errors

**Correct Pattern**:
```typescript
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // Validation
      const body = await request.json();
      const result = schema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          createErrorResponse('VALIDATION_ERROR', result.error.message),
          { status: 400 }
        );
      }

      // Business logic
      const data = await someOperation();

      return NextResponse.json(
        createApiResponse(data),
        { status: 200 }
      );
    } catch (error) {
      // ✅ ALWAYS return JSON, NEVER throw
      console.error('[Operation] Error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : { error: String(error) };

      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', errorMessage, errorDetails),
        { status: 500 }
      );
    }
  });
}
```

**Frontend Error Handling**:
```typescript
const response = await fetch('/api/v1/endpoint', { ... });

if (!response.ok) {
  // ✅ Check content-type before parsing
  let errorMessage = '操作失败';
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      errorMessage = error.error?.message || error.error || '操作失败';
    } else {
      // Handle HTML error pages
      const text = await response.text();
      errorMessage = text || `服务器错误 (${response.status})`;
    }
  } catch (e) {
    errorMessage = `服务器错误 (${response.status})`;
  }
  throw new Error(errorMessage);
}
```

**Key Points**:
- Use `try-catch` to wrap all handler logic
- Return `NextResponse.json(createErrorResponse(...))` for all errors
- Never use `throw` inside handlers (except for validation that returns early)
- Frontend must check `content-type` header before parsing JSON
- Add comprehensive logging with `console.error()` for debugging
- See `app/api/v1/projects/[id]/apply-act1-repair/route.ts` for reference implementation

### Modifying AI Agent Prompts

**Important**: All ACT2-5 agent prompts follow **creative enhancement** philosophy, not error-fixing. See Epic 005/006 implementations for reference.

#### Act-Specific Prompt Files
- **Act 1**: `lib/agents/prompts/consistency-prompts.ts` - Logic error detection (repair-oriented)
- **Act 2**: `lib/agents/prompts/character-architect-prompts.ts` - Character depth creation (creative-oriented)
- **Act 3**: `lib/agents/prompts/rules-auditor-prompts.ts` - Worldbuilding enrichment (creative-oriented)
- **Act 4**: `lib/agents/prompts/pacing-strategist-prompts.ts` - Pacing enhancement (creative-oriented)
- **Act 5**: `lib/agents/prompts/thematic-polisher-prompts.ts` - Spiritual depth (creative-oriented)

#### Prompt Design Principles (ACT2-5)

**Positioning**:
- ❌ **Avoid**: "修复错误"、"解决矛盾"、"审计问题"、"识别缺陷"
- ✅ **Use**: "深化创作"、"丰富细节"、"增强张力"、"优化体验"、"精神共鸣"

**Tone**:
- Frame as **creative mentor** (创作导师), not bug fixer
- Focus on **artistic value** and **dramatic potential**, not correctness
- Emphasize **enhancement opportunities**, not problems

**Key Declaration** (must include in system prompts):
```
重要：你不是在"修复错误"，而是在"深化创作"。即使逻辑一致，也可以通过增强使其更具艺术价值。
```

#### Prompt Requirements
- All prompts must output Chinese language
- Use `response_format: { type: 'json_object' }` in DeepSeek API calls
- Return structured JSON matching interface types
- Include validation methods in agent classes
- ACT2-5 prompts must emphasize **creative enhancement**, not error fixing

## Critical File Locations

### Frontend (Client-Side)
- **Pages**:
  - `app/dashboard/page.tsx` - Script upload entry point
  - `app/analysis/[id]/page.tsx` - Act 1 diagnostic results
  - `app/iteration/[projectId]/page.tsx` - Acts 2-5 iteration workspace (Epic 005 UI)
  - `app/synthesis/[projectId]/page.tsx` - Synthesis V2 generation (Epic 007 UI)
- **V1 API Client**: `lib/services/v1-api-service.ts` - Main service for all V1 API calls
- **Workspace Components** (Epic 005): `components/workspace/`
  - `act-progress-bar.tsx` - Five-act progress visualization
  - `findings-selector.tsx` - Act 1 diagnostic results selector
  - `proposal-comparison.tsx` - Side-by-side proposal comparison
  - `changes-display.tsx` - Dramatic actions display
- **Synthesis Components** (Epic 007): `components/synthesis/`
  - `synthesis-trigger-dialog.tsx` - Synthesis configuration modal
  - `synthesis-progress.tsx` - 10-step progress tracker with real-time updates

### Backend (Server-Side)
- **V1 API Routes**: `app/api/v1/*/route.ts`
  - `projects/route.ts` - Project CRUD (list and create)
  - `projects/[id]/route.ts` - Get single project details (**NEW 2025-10-09**)
  - `projects/[id]/apply-act1-repair/route.ts` - Apply ACT1 repair to project (**NEW 2025-10-10**)
  - `analyze/route.ts` - Start Act 1 analysis
  - `analyze/process/route.ts` - Manual job processing trigger (**NEW 2025-10-09**: Serverless compatibility)
  - `analyze/jobs/[jobId]/route.ts` - Job status polling
  - `projects/[id]/status/route.ts` - Workflow status
  - `projects/[id]/report/route.ts` - Diagnostic report
  - `iteration/propose/route.ts` - Generate proposals (Epic 005)
  - `iteration/execute/route.ts` - Execute selected proposal (Epic 005)
  - `projects/[id]/decisions/route.ts` - Decision history (Epic 005)
  - `synthesize/route.ts` - Trigger synthesis (Epic 007)
  - `synthesize/[jobId]/status/route.ts` - Poll synthesis status (Epic 007)
  - `versions/[id]/route.ts` - Get version details (Epic 007)
  - `versions/[id]/diff/[targetId]/route.ts` - Version comparison (Epic 007)
  - `export/route.ts` - Export script (Epic 007)
- **Workflow Queue**: `lib/api/workflow-queue.ts` - Singleton job processor
- **AI Agents**:
  - `lib/agents/consistency-guardian.ts` - Act 1 diagnostics
  - `lib/agents/character-architect.ts` - Act 2 character iteration
  - `lib/agents/rules-auditor.ts` - Act 3 worldbuilding audit
  - `lib/agents/pacing-strategist.ts` - Act 4 pacing optimization
  - `lib/agents/thematic-polisher.ts` - Act 5 theme enhancement
  - `lib/agents/revision-executive.ts` - Fix generation
- **Synthesis System** (Epic 007):
  - `lib/synthesis/synthesis-engine.ts` - Main orchestrator
  - `lib/synthesis/prompt-builder.ts` - Prompt construction
  - `lib/synthesis/conflict-detector.ts` - Conflict detection
  - `lib/synthesis/style-analyzer.ts` - Style preservation
  - `lib/synthesis/version-manager.ts` - Version management
  - `lib/synthesis/export-manager.ts` - Export system
- **Database Services**: `lib/db/services/*.service.ts`
  - `revision-decision.service.ts` - NEW in Epic 005
- **Script Parsers**: `lib/parser/script-parser.ts`, `lib/parser/markdown-script-parser.ts`
- **Debug Tools**:
  - `scripts/debug-act1-analysis.ts` - Diagnose stuck jobs (QUEUED/PROCESSING) (**NEW 2025-10-09**)

### Documentation
- **Main Workflow Guide**: `docs/ai-analysis-repair-workflow.md` - Complete V1 API workflow documentation (v3.0.0)
- **Epic Documentation**: `docs/epics/epic-*/README.md`
  - Epic 004: Database & V1 API Migration (COMPLETED)
  - Epic 005: Interactive Workflow Core - Act 2 (COMPLETED + UI)
  - Epic 006: Multi-Act Agents - Acts 3-5 (COMPLETED + UI)
  - Epic 007: Grand Synthesis Engine (COMPLETED - Full UI + Backend)
- **Phase Summaries**:
  - `docs/archive/implementations/ITERATION_PAGE_IMPLEMENTATION.md` - Phase 1: Acts 2-5 UI
  - `docs/archive/implementations/PHASE_2_COMPLETION_SUMMARY.md` - Phase 2: Synthesis UI
- **Troubleshooting Guides**: `docs/fixes/`
  - `ACT2_ASYNC_QUEUE_IMPLEMENTATION.md` - ACT2-5 async job queue architecture (**NEW 2025-10-10**)
  - `ACT_FILTERING_FIX.md` - Act-specific findings filtering business logic (**NEW 2025-10-10**)
  - `ACT1_REPAIR_API_DEBUGGING.md` - ACT1 repair API 500 errors, Vercel logs, common errors (2025-10-10)
  - `VERCEL_504_TIMEOUT_FIX.md` - Serverless timeout configuration
  - `ACT1_TO_ACT2_WORKFLOW_ISSUE.md` - Workflow state transitions
- **Test Results**: `docs/epics/epic-*/TEST_RESULTS.md`
- **Verification Reports**: `docs/epics/epic-*/EPIC_*_VERIFICATION_REPORT.md`
- **Reference Documents**: `docs/references/` - Prompt design and workflow architecture references
- **Configuration Docs**: `docs/config/` - Project structure and security notices
- **Archived Docs**: `docs/archive/` - Historical bug fixes, test reports, and implementation summaries

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

### Database Replication Lag (Supabase/Production)
When using connection pooling (pgbouncer), there may be brief delays between writes and reads:
- Dashboard adds 500ms delay after project creation before starting analysis
- Includes retry logic for "Project not found" errors
- See `app/dashboard/page.tsx:48-82` for implementation

### Stuck Jobs in Serverless Environments (Fixed 2025-10-09)

**Symptoms**:
- Jobs remain in QUEUED state for minutes without transitioning to PROCESSING
- Jobs stuck in PROCESSING state for >2 minutes without completing
- Analysis never completes in Vercel/Serverless deployments

**Root Causes**:
1. **setInterval doesn't work**: Serverless functions terminate after request completion
2. **No background processing**: Jobs created but never processed
3. **Missing trigger calls**: Analysis page not calling manual processing endpoint

**Solutions Implemented**:

1. **WorkflowQueue Dual-Mode Architecture**:
   - Detects Serverless environment via `process.env.VERCEL` or `process.env.AWS_LAMBDA_FUNCTION_NAME`
   - Traditional servers: Use `setInterval()` for background processing
   - Serverless: Disable `setInterval`, rely on manual triggers
   - See `lib/api/workflow-queue.ts:25-47`

2. **Manual Processing Endpoint**:
   - `POST /api/v1/analyze/process` triggers job processing on-demand
   - Returns: `{ processed: 0|1, message: string }`
   - Called by frontend during polling
   - See `app/api/v1/analyze/process/route.ts`

3. **Active Polling Pattern**:
   - `v1ApiService.pollJobStatus()` calls `triggerProcessing()` before checking status
   - Analysis page calls `triggerProcessing()` on initial load
   - Jobs processed within 5 seconds (polling interval)
   - Silent failure if trigger fails (non-critical)

**Debugging Steps**:
1. Run debug script: `npx tsx scripts/debug-act1-analysis.ts [jobId]`
2. Check environment variables (DEEPSEEK_API_KEY, DATABASE_URL)
3. Verify job timing (createdAt, updatedAt timestamps)
4. Review server logs for API errors
5. Test DeepSeek API connection manually
6. If stuck, manually reset job status via Prisma Studio

**Prevention**:
- Use `v1ApiService.triggerProcessing()` before all status checks
- Monitor job timing (warn if >2 minutes in PROCESSING)
- Implement exponential backoff in polling (5s → 10s max)
- Always check for Serverless mode in background processing code

### Timeout Configuration (CRITICAL - Updated 2025-10-09)
**Production Issue**: Default timeouts were too short for large scripts (3000+ lines), causing analysis to fail after 9 seconds.

**Current Configuration**:
- `lib/agents/types.ts`: `timeout: 120000` (120 seconds, was 9000)
- `lib/api/deepseek/client.ts`: `timeout: 120000` (120 seconds, was 30000)

**Performance Expectations**:
- Small scripts (<1000 lines): 10-20 seconds
- Medium scripts (1000-3000 lines): 30-60 seconds
- Large scripts (3000-10000 lines): 2-5 minutes

**Error Messages**: Enhanced with Chinese user-facing messages in `workflow-queue.ts`:
- Timeout errors: "分析超时：剧本可能过长或API响应缓慢"
- Rate limit errors: "API调用频率超限，请稍后重试"
- Network errors: "API连接失败，请检查网络或稍后重试"

### Iteration Page Loading (Fixed 2025-10-09)
**Issue**: Race condition between component render and async data loading caused premature "请先完成 Act 1" error.

**Solution**: Added loading state guard in `app/iteration/[projectId]/page.tsx:272-283`:
```typescript
// Show loading spinner BEFORE checking diagnosticReport
if (isLoading) {
  return <LoadingSpinner />;
}

// THEN check if Act 1 is complete
if (!diagnosticReport) {
  return <Act1RequiredError />;
}
```

**Debug Logs**: Console logs added for troubleshooting data loading issues.

## Important Conventions

### Data Flow Pattern (Post Epic 004)
1. **Client** → Calls `v1ApiService` methods
2. **v1ApiService** → Fetches from `/api/v1/*` endpoints
3. **API Route** → Uses database services from `lib/db/services/`
4. **Database Service** → Interacts with Prisma ORM
5. **Result** → Flows back through same chain

**DO NOT** use localStorage anywhere - all data persists server-side.

### Async Job Pattern
For long-running operations (Act 1 analysis, synthesis):
1. Create job via `POST /api/v1/analyze` or `POST /api/v1/synthesize`
2. Job gets queued in database (JobStatus: QUEUED)
3. WorkflowQueue processes job in background (JobStatus: PROCESSING)
4. Client polls status endpoint every 5 seconds
5. When complete (JobStatus: COMPLETED), fetch results
6. WorkflowQueue handles both ACT1_ANALYSIS and SYNTHESIS job types

### Iteration API Pattern (Epic 005 & 006 + Async Queue - 2025-10-10)
For interactive decision-making across all Acts 2-5 (ASYNC JOB PATTERN):
1. Call `POST /api/v1/iteration/propose` with focus area and act type
2. **System creates ITERATION job** (returns jobId immediately, < 1 second)
3. **Client polls** `GET /api/v1/iteration/jobs/[jobId]` every 5 seconds
4. **Background processing** (30-60 seconds):
   - WorkflowQueue routes to appropriate agent (CharacterArchitect/RulesAuditor/PacingStrategist/ThematicPolisher)
   - Agent uses dynamic imports for code splitting (Serverless optimization)
   - AI generates proposals and creates RevisionDecision record
   - Job status updates: QUEUED → PROCESSING → COMPLETED
5. **When COMPLETED**, client retrieves proposals from job result
6. User reviews proposals in UI (ProposalComparison component)
7. Call `POST /api/v1/iteration/execute` with selected proposal (synchronous, < 5 seconds)
8. Agent executes act-specific transformation (P6/P9/P11/P13)
9. RevisionDecision updated with userChoice and generatedChanges
10. ScriptVersion created with incremental changes (V2, V3, V4...)

### Type Definitions
- **LogicError**: Used for analysis errors (NOT AnalysisError)
- **DiagnosticReport**: Contains findings from ConsistencyGuardian (Act 1)
- **RevisionDecision**: Tracks user decisions during Acts 2-5
- **WorkflowStatus**: Tracks five-act workflow state machine
- **JobStatus**: Tracks individual job states (QUEUED/PROCESSING/COMPLETED/FAILED)
- **ActType**: Enum for Acts 2-5 (ACT2_CHARACTER, ACT3_WORLDBUILDING, etc.)
- **Synthesis Types** (`types/synthesis.ts`):
  - **SynthesisResult**: Complete synthesis output with V2 script
  - **Conflict**: Detected decision conflict with severity and resolution
  - **StyleProfile**: 6-dimensional style analysis (tone, vocabulary, patterns, dialogue, narrative, pacing)
  - **DiffResult**: Version comparison with additions/deletions/modifications
  - **ExportFormat**: TXT, MD, DOCX export options

### Testing Conventions
- **Integration Test Files**:
  - `tests/integration/v1-api-flow.test.ts` - V1 API complete workflow
  - `tests/integration/iteration-api-route-handlers.test.ts` - Route handler tests (NEW - recommended pattern)
  - `tests/integration/iteration-api-simple.test.ts` - Simplified iteration tests
  - **DEPRECATED**: `tests/integration/iteration-api.test.ts.DEPRECATED` - Old HTTP fetch approach (don't use)
- **Unit Test Files**:
  - `tests/unit/character-architect.test.ts` - Act 2 agent
  - `tests/unit/rules-auditor.test.ts` - Act 3 agent
  - `tests/unit/pacing-strategist.test.ts` - Act 4 agent
  - `tests/unit/thematic-polisher.test.ts` - Act 5 agent
  - `tests/unit/revision-decision.service.test.ts` - Decision service
  - `tests/unit/v1-api-service.test.ts` - API client
- **E2E Test Files**: `tests/e2e/` directory
- Use `mockResolvedValue()` for continuous polling, not `mockResolvedValueOnce()`
- Set proper timeouts (10-15 seconds) for async tests
- Always call `v1ApiService.clearState()` in test cleanup
- Mock DeepSeekClient in all agent tests
- After schema changes: Run `npx prisma generate` before type checking
- See `tests/integration/ITERATION_API_TEST_NOTES.md` for testing patterns and best practices

### Epic Development Pattern
When working on Epic features:
1. Read Epic documentation first: `docs/epics/epic-[number]-*/README.md`
2. Implement Stories in order (Story 1, Story 2, etc.)
3. Database changes first (Prisma schema → migration)
4. Then services layer (`lib/db/services/`)
5. Then API routes (`app/api/v1/*/route.ts`)
6. Then AI agents if needed (`lib/agents/`)
7. Finally frontend components (`components/` and pages)
8. Test each layer before moving to next
9. Document decisions in Epic directory

### AI Agent JSON Response Pattern
When implementing agents that return structured data:
```typescript
const request: DeepSeekChatRequest = {
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.7,
  max_tokens: 2000,
  response_format: { type: 'json_object' }  // Forces JSON output
};
```
Always parse and validate JSON responses with proper error handling.

## Workspace Components (Epic 005)

### Reusable UI Components
All components in `components/workspace/` are standalone and framework-agnostic:

**ActProgressBar**: Five-act progress indicator
- Shows current act, completed acts, and navigation
- Supports compact mode
- Click handlers for act switching

**FindingsSelector**: Diagnostic findings selection
- Lists Act 1 findings by category
- Allows user to select focus areas
- Triggers iteration workflow
- **Enhanced 2025-10-09**: 5-layer visual feedback system for selected state:
  1. Blue border ring (`ring-2 ring-blue-500`)
  2. Blue background color (`bg-blue-50/50`)
  3. Checkmark icon (`CheckCircle2`)
  4. "已选择" badge
  5. Blue title text (`text-blue-900`)
- See `components/workspace/findings-selector.tsx:124-158` for implementation

**ProposalComparison**: Side-by-side proposal display
- Shows exactly 2 proposals with pros/cons
- Highlights recommended option
- Fires selection callback

**ChangesDisplay**: Dramatic actions visualization
- Displays "Show, Don't Tell" transformations
- Shows overall character arc
- Provides integration notes

**Note**: WorkspaceLayout unified page is intentionally NOT implemented. These components can be used in any page structure. See `docs/epics/epic-007-synthesis-engine/WORKSPACE_DECISION.md` for rationale.

## Epic 007: Synthesis Engine Architecture

### Synthesis Workflow
The synthesis engine orchestrates the final integration of all Acts 1-5 decisions:

1. **Decision Grouping**: Groups decisions by act and focus area
2. **Conflict Detection**: Identifies contradictions between decisions (6 conflict types)
3. **Conflict Resolution**: Auto-resolves 80% of conflicts using priority-based strategies
4. **Style Analysis**: Analyzes original script across 6 dimensions (tone, vocabulary, patterns, dialogue, narrative, pacing)
5. **Prompt Construction**: Builds comprehensive synthesis prompt with style guidelines and conflict resolutions
6. **Chunking** (for long scripts): Splits script into 6000-token chunks with 500-token overlap
7. **AI Synthesis**: Executes synthesis via DeepSeek API with style preservation
8. **Validation**: Checks coherence, style consistency, and completeness
9. **Version Creation**: Saves V2 script with metadata (decisionsApplied, styleProfile, confidence)
10. **Change Log**: Generates detailed change log with attribution to decisions

### Conflict Detection System
**Conflict Types:**
- `character_contradiction` - Character arc (Act 2) vs theme (Act 5)
- `timeline_overlap` - Pacing changes (Act 4) affecting same scenes as other acts
- `setting_inconsistency` - Worldbuilding (Act 3) vs character/pacing changes
- `plot_conflict` - Character arc (Act 2) vs pacing restructure (Act 4)
- `dialogue_mismatch` - Dialogue inconsistencies across acts
- `theme_divergence` - Theme enhancement (Act 5) vs other acts

**Auto-Resolution Strategies:**
- `latest_takes_precedence` - Newer decision overrides older (when compatible)
- `merge_compatible` - Merge both decisions if compatible
- `prioritize_by_severity` - Higher-priority act wins (ACT2 > ACT3 > ACT4 > ACT5)
- `auto_reconcile` - Automatically harmonize minor conflicts
- `manual_review_required` - Flag for human review (critical conflicts)

### Style Preservation System
**6-Dimensional Style Analysis:**
1. **Tone**: 严肃/幽默/悲伤/欢快/紧张/温馨 (keyword frequency analysis)
2. **Vocabulary**: Top 100 frequently used words (excluding stop words)
3. **Sentence Patterns**: Top 20 patterns (疑问句/感叹句/祈使句/条件句/因果句/短句/中等句/长句)
4. **Dialogue Style**: Formality level (formal/casual/mixed), average length, common phrases
5. **Narrative Voice**: Perspective (第一人称/第三人称/混合), tense (现在时/过去时/混合), descriptive level (minimal/moderate/rich)
6. **Pacing Profile**: Average scene length, action density, dialogue ratio, description ratio

### Performance Characteristics
- **Small scripts** (<1000 lines): ~10-20 seconds
- **Medium scripts** (1000-3000 lines): ~30-60 seconds
- **Large scripts** (3000-10000 lines): ~2-5 minutes (with chunking)
- **Confidence scoring**: 0-1 scale (base 1.0, penalties for conflicts, bonuses for rich style)
- **Auto-resolution rate**: ~98% of conflicts resolved automatically

### Chunking Strategy (for Long Scripts)
- **Max chunk size**: 6000 tokens (~9000 Chinese characters)
- **Overlap**: 500 tokens between adjacent chunks for context preservation
- **Scene boundary awareness**: Chunks split at scene boundaries when possible
- **Decision attribution**: Each chunk tagged with relevant decision IDs
- **Merging**: Chunks recombined after synthesis with overlap deduplication

---

## Testing Strategy & Known Issues

### Test Environment Setup (WSL Optimized)

#### Jest Configuration
Tests use development database credentials (NOT test-specific database):
```javascript
// jest.setup.js sets these automatically:
DATABASE_URL = 'postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public'
DEEPSEEK_API_KEY = 'test-api-key' // Mocked in unit tests
```

**Important**: Integration tests connect to the same database as development. Use `npx prisma db push --force-reset` to clean state before test runs.

#### Running Tests
```bash
# Quick test validation
npm test -- tests/unit/character-architect.test.ts tests/unit/rules-auditor.test.ts tests/unit/pacing-strategist.test.ts tests/unit/thematic-polisher.test.ts

# All stable tests (61 tests, ~55s)
npm test -- tests/unit/character-architect.test.ts tests/unit/rules-auditor.test.ts tests/unit/pacing-strategist.test.ts tests/unit/thematic-polisher.test.ts tests/unit/v1-api-service.test.ts tests/unit/revision-decision.service.test.ts tests/integration/iteration-api-simple.test.ts

# E2E tests (WSL-optimized)
npm run test:e2e  # Headless mode, sequential execution
```

### Critical Test Fixes Applied (2025-10-02)

Three issues were identified and fixed:

1. **Database Authentication** - `jest.setup.js` now uses correct credentials
2. **Prisma Mock Types** - Use `as any` for complex Prisma types in tests
3. **Service Bug** - `revisionDecisionService.rollback()` now sets `generatedChanges: null` (not `undefined`)

See `docs/TEST_FIXES_SUMMARY.md` for complete fix details.

### Test Coverage Status

**Unit Tests**: 47/47 (100%) ✅
- Character Architect: 8/8 ✅
- Rules Auditor: 8/8 ✅
- Pacing Strategist: 8/8 ✅
- Thematic Polisher: 8/8 ✅
- V1 API Service: 6/6 ✅
- Revision Decision Service: 12/12 ✅
- Error Handling: 14/14 ✅

**Integration Tests**: 29/30 (96.7%) ✅
- V1 API Flow: All passing ✅
- Iteration API (Route Handlers): 9/9 ✅
- Iteration API (Simple): 11/11 ✅
- Repair Full Flow: 7/8 (1 legacy failure, low priority)

**E2E Tests**: Framework ready, some WSL stability issues

**Overall Pass Rate**: 97.5% (77/79 tests)

### Test Conventions (Updated)

When writing tests:
- **Prisma Mocks**: Use `const mockPrisma = prisma as any` (not `jest.Mocked<typeof prisma>`)
- **Agent Factory Functions**: Mock `createCharacterArchitect()` etc., not the classes
  ```typescript
  jest.mock('@/lib/agents/character-architect', () => ({
    createCharacterArchitect: jest.fn()
  }));
  ```
- **Route Handler Tests**: Use `NextRequest` to test route handlers directly (no HTTP server needed)
  ```typescript
  import { POST as handler } from '@/app/api/v1/iteration/propose/route';
  const request = new NextRequest('http://localhost:3001/api/v1/iteration/propose', {
    method: 'POST',
    body: JSON.stringify({ /* data */ })
  });
  const response = await handler(request);
  ```
- **Agent Tests**: Always mock DeepSeekClient, return arrays not objects
- **Database Tests**: Expect `null` for nullable fields (Prisma uses `null`, not `undefined`)
- **Async Jobs**: Use `mockResolvedValue()` for polling (not `mockResolvedValueOnce()`)
- **Environment Variables**: `NEXTAUTH_SECRET` must be ≥32 characters in `jest.setup.js`
- **Cleanup**: Run `npx prisma generate` after schema changes, before tests

### WSL-Specific Considerations

Playwright E2E tests configured for WSL:
```typescript
// config/playwright.config.ts
{
  fullyParallel: false,        // Sequential for stability
  workers: 2,                   // Limited for resources
  retries: 1,                   // Retry flaky tests
  headless: true,               // Required for WSL
  launchOptions: {
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-gpu'
    ]
  }
}
```

### Known Test Issues

**Low Priority**:
- Legacy tests in `tests/__tests__/` have TypeScript errors (not in main test suite)
- Some timing-based tests may be flaky in WSL (retry logic compensates)

**Documentation**: See `docs/COMPREHENSIVE_TESTING_STRATEGY.md` and `docs/archive/testing/TEST_EXECUTION_REPORT.md`

---

## Critical ACT1 Analysis Implementation Details (2025-10-02)

### ConsistencyGuardian Analysis Flow
**IMPORTANT**: ACT1 analysis bypasses the script parser to avoid artifacts.

1. **Direct Text Analysis** (`lib/agents/consistency-guardian.ts`):
   - Uses `analyzeScriptText()` method (NOT `analyzeScript()`)
   - Passes raw script content directly to AI
   - Avoids preprocessor that can introduce "undefined" values

2. **Severity Mapping** (`lib/api/workflow-queue.ts`):
   ```typescript
   // AI outputs: critical/high/medium/low (4 levels)
   // Database stores: critical/warning/info (3 levels)
   severity: (error.severity === 'critical' || error.severity === 'high') ? 'critical' :
            error.severity === 'medium' ? 'warning' : 'info'
   ```

3. **Frontend Display** (`app/analysis/[id]/page.tsx`):
   - Interface expects: `'critical' | 'warning' | 'info'`
   - Display labels: `critical → '高'`, `warning → '中'`, `info → '低'`

4. **Statistics API** (`app/api/v1/projects/[id]/report/route.ts`):
   ```typescript
   const summary = {
     totalErrors: statistics?.total || 0,
     highSeverity: statistics?.bySeverity?.critical || 0,
     mediumSeverity: statistics?.bySeverity?.warning || 0,
     lowSeverity: statistics?.bySeverity?.info || 0
   };
   ```

5. **Confidence Scoring** (`lib/agents/prompts/consistency-prompts.ts`):
   - AI must provide varied confidence scores (not all 80%)
   - 90-100: Explicit logic errors (timeline contradictions)
   - 70-89: Probable issues (missing setup)
   - 50-69: Possible issues (ambiguous)
   - 30-49: Uncertain (may be style choice)

### Common ACT1 Issues and Solutions

**Issue**: Statistics show 0 errors but findings list has items
- **Cause**: Severity value mismatch between database and frontend
- **Fix**: Ensure severity mapping is consistent (critical/warning/info)

**Issue**: All confidence scores are identical (e.g., 80%)
- **Cause**: AI not outputting confidence, using default value
- **Fix**: Update prompt to require varied confidence based on error clarity

**Issue**: AI detects parser artifacts like "Location: undefined"
- **Cause**: Using `analyzeScript()` which preprocesses parsed data
- **Fix**: Use `analyzeScriptText()` to analyze raw script content

## Current Implementation Status (2025-10-02)

### ✅ Fully Implemented & Production-Ready

**Architecture**: V1 API with Database Persistence
- PostgreSQL + Prisma ORM
- Async job queue (WorkflowQueue)
- Five-act workflow state machine
- Real-time status polling

**Complete UI Flow**:
1. ✅ Dashboard - Script upload
2. ✅ Act 1 Analysis - Diagnostic report (ConsistencyGuardian)
3. ✅ Acts 2-5 Iteration - Interactive decision workflow (Epic 005 UI)
   - CharacterArchitect (Act 2)
   - RulesAuditor (Act 3)
   - PacingStrategist (Act 4)
   - ThematicPolisher (Act 5)
4. ✅ Synthesis - V2 generation with conflict resolution (Epic 007 UI)
5. ✅ Export - TXT/MD formats with metadata

**Key Features**:
- ✅ 5 AI agents with prompt chains (P4-P13)
- ✅ 6-dimensional style preservation
- ✅ 6 conflict types auto-detection
- ✅ Real-time progress tracking (10-step synthesis)
- ✅ Version comparison (V1 vs V2)
- ✅ Decision history tracking
- ✅ Change log generation
- ✅ Multi-file analysis UI (Sprint 3 - **NEW 2025-11-06**)
  - Complete frontend integration for multi-file projects
  - Dual project type support (SINGLE vs MULTI_FILE)
  - 4-page workflow: List → Create → Manage → Analysis Results
  - Cross-file consistency checking UI
  - Dashboard integration with multi-file entry card

**Testing**:
- ✅ 61/61 unit tests passing
- ✅ Integration tests verified
- ✅ E2E framework ready
- ✅ Multi-file API endpoints verified (Sprint 3)

### 📋 Next Steps (Optional Enhancements)

- [ ] Detailed diff viewer ("查看详细差异" button)
- [ ] DOCX export format
- [ ] Multiple V2 versions (V2.1, V2.2...)
- [ ] Synthesis preview mode
- [ ] Manual conflict resolution UI
- [ ] Batch synthesis for multiple projects

### 📚 Key Documentation

**Reference Documentation** (in `/ref` directory):
1. **[Workflow Reference](ref/WORKFLOW_REFERENCE.md)** - Complete five-act workflow system
2. **[AI Agents Reference](ref/AI_AGENTS.md)** - All 6 AI agents with implementation details
3. **[API Reference](ref/API_REFERENCE.md)** - Complete V1 API documentation
4. **[Database Schema Reference](ref/DATABASE_SCHEMA.md)** - Prisma models and services
5. **[Frontend Components Reference](ref/FRONTEND_COMPONENTS.md)** - Pages and components guide
6. **[Testing Guide](ref/TESTING_GUIDE.md)** - Testing patterns and conventions
7. **[Deployment Guide](ref/DEPLOYMENT_GUIDE.md)** - Production deployment guide

**Project Documentation** (in `/docs` directory):
1. **Main Workflow**: `docs/ai-analysis-repair-workflow.md` (v3.0.0)
2. **Epic Guides**: `docs/epics/epic-*/README.md`
3. **Phase Summaries**: `docs/ITERATION_PAGE_IMPLEMENTATION.md`, `docs/PHASE_2_COMPLETION_SUMMARY.md`
4. **Troubleshooting**: `docs/fixes/*.md` - Common issues and solutions
5. **This File (CLAUDE.md)**: Always check first for architecture overview and quick reference

---

**Last Updated**: 2025-11-06
**Architecture Version**: V1 API (Epic 004-007 Complete) + Sprint 3 Multi-File UI ✨
**System Status**: Production Ready ✅
**Test Coverage**: 97.5% (77/79 tests passing)
**Product Positioning**: Plan B - Differentiated Value (ACT1=Logic Repair, ACT2-5=Creative Enhancement)
**Latest Release**: Sprint 3 - Multi-File Analysis UI Integration Complete (4 pages, full workflow)

## Product Positioning Update (2025-10-10) ✨

**Implemented Plan B - Differentiated Value Strategy**:

### Background
Original system positioned both ACT1 and ACT2-5 as "error fixing" tools, creating confusion about the value proposition. ACT1's "AI智能修复" overlapped with ACT2-5's purpose.

### Solution
Implemented **differentiated positioning** strategy:
- **ACT1**: Quick Logic Repair (修Bug) - Fix objective errors in 5-10 minutes
- **ACT2-5**: Creative Enhancement (创作升级) - Deepen artistic quality progressively

### Changes Made
1. **UI Copy Updates** (Stage 1):
   - Updated ACT1 Analysis page: Emphasized "逻辑快速修复" vs "深度创作"
   - Updated ActProgressBar: Changed labels to reflect creative enhancement (角色深度创作, 世界观丰富化, etc.)
   - Updated Iteration page: Added 💡 guidance text emphasizing creative enhancement

2. **Prompt Refactoring** (Stage 2):
   - Refactored all 4 ACT2-5 Agent prompts (~800 lines rewritten)
   - Changed from "修复导向" to "创作导向"
   - Added key declaration: "重要：你不是在'修复错误'，而是在'深化创作'"
   - Updated terminology: 潜力/深化/优化/丰富/共鸣 (not 矛盾/问题/修复/解决/错误)

3. **Documentation Updates** (Stage 3):
   - Added Product Positioning section in CLAUDE.md
   - Updated Core AI Agents descriptions with value transformations
   - Added Prompt Design Principles for future development

### Impact
- Clear differentiation between "correctness" (ACT1) and "greatness" (ACT2-5)
- Users understand each phase serves distinct creative purposes
- AI generates enhancement-focused content, not error-fixing suggestions

**Files Modified**:
- `app/analysis/[id]/page.tsx`
- `components/workspace/act-progress-bar.tsx`
- `app/iteration/[projectId]/page.tsx`
- `lib/agents/prompts/character-architect-prompts.ts`
- `lib/agents/prompts/rules-auditor-prompts.ts`
- `lib/agents/prompts/pacing-strategist-prompts.ts`
- `lib/agents/prompts/thematic-polisher-prompts.ts`
- `CLAUDE.md`

## Recent Critical Fixes (2025-10-11)

**Quick Summary** - Full details in `docs/fixes/`:

1. **Product-Implementation Mismatch Fix (2025-10-11)** - Fixed fundamental business logic inconsistency
   - **Problem**: Product positioning (Plan B) promised independent Acts 2-5, but implementation required ACT1 findings dependency
   - **Root Cause**: 2025-10-10 product repositioning didn't update Epic 005/006 technical architecture
   - **P0 Fixes**:
     - Removed progressive unlock mechanism - all Acts 2-5 now unlocked after ACT1 completion
     - Added Free Creation Mode - manual focus input when no ACT1 findings available
   - **P1 Fixes**:
     - Corrected Analysis page misleading copy ("directly enter Acts 2-5" → clear A/B choice)
     - Added workflow guidance for first-time iteration page visitors
   - **Impact**: Resolves user deadlock when ACT1 finds no character issues (ACT2 blocked)
   - **Files Modified**: `app/iteration/[projectId]/page.tsx`, `app/analysis/[id]/page.tsx`

2. **ACT2-5 Async Queue** - Refactored propose endpoint to async job pattern to avoid 10s Vercel timeout
   - See: `docs/fixes/ACT2_ASYNC_QUEUE_IMPLEMENTATION.md`

3. **Act Filtering** - Each Act now only shows relevant finding types (ACT2=character, ACT3=scene/plot, etc.)
   - See: `docs/fixes/ACT_FILTERING_FIX.md`

4. **ACT1 Repair API** - Fixed 500 errors returning HTML instead of JSON in Serverless
   - Pattern: Always return `NextResponse.json()`, never throw in API handlers
   - See: `docs/fixes/ACT1_REPAIR_API_DEBUGGING.md`

5. **Serverless Job Processing** - Implemented dual-mode WorkflowQueue with manual trigger endpoint
   - Traditional: `setInterval()` background processing
   - Serverless: Manual `POST /api/v1/analyze/process` trigger from frontend
   - See: "Serverless Compatibility Architecture" section below

6. **Script Versioning** - Each ACT2-5 decision now creates incremental versions (V1, V2, V3...)
   - Execute API creates version after each decision
   - Propose API uses latest version as base
   - See: `docs/fixes/SCRIPT_VERSIONING_ITERATION_TASK.md`

7. **Timeout Configuration** - Increased DeepSeek API timeout to 120s for large scripts
   - Vercel endpoints: 60s timeout (requires Pro Plan)
   - See: `docs/fixes/VERCEL_504_TIMEOUT_FIX.md`
