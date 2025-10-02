# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Five-Act Workflow State Machine
The system implements a five-act interactive workflow for script analysis:
- `INITIALIZED` → `ACT1_RUNNING` → `ACT1_COMPLETE` → `ITERATING` → `SYNTHESIZING` → `COMPLETED`

**Act 1 (Foundational Diagnosis)**: ConsistencyGuardian analyzes script for 5 error types
**Act 2 (Character Arc)**: CharacterArchitect iterates on character contradictions
**Act 3 (Worldbuilding)**: RulesAuditor audits setting consistency and theme alignment
**Act 4 (Pacing)**: PacingStrategist optimizes rhythm and conflict distribution
**Act 5 (Theme)**: ThematicPolisher enhances character depth and empathy
**Synthesis (Epic 007)**: SynthesisEngine merges all decisions into final script (V2) with conflict resolution and style preservation

### Core AI Agents
1. **ConsistencyGuardian** (`lib/agents/consistency-guardian.ts`) - Epic 004
   - Detects 5 error types: timeline, character, plot, dialogue, scene inconsistencies
   - Chinese language prompts for Chinese output
   - Parallel chunk processing for performance
   - Used in Act 1 analysis

2. **CharacterArchitect** (`lib/agents/character-architect.ts`) - Epic 005
   - Implements P4-P6 prompt chain for Act 2
   - P4: Focus on character contradiction and analyze context
   - P5: Generate exactly 2 solution proposals with pros/cons
   - P6: Execute "Show, Don't Tell" transformation to dramatic actions
   - Returns structured JSON with DeepSeek `response_format: { type: 'json_object' }`

3. **RulesAuditor** (`lib/agents/rules-auditor.ts`) - Epic 006
   - Implements P7-P9 prompt chain for Act 3
   - P7: Core setting logic audit - detects worldbuilding inconsistencies
   - P8: Dynamic rule verification - analyzes ripple effects of fixes
   - P9: Setting-theme alignment - ensures worldbuilding serves theme

4. **PacingStrategist** (`lib/agents/pacing-strategist.ts`) - Epic 006
   - Implements P10-P11 prompt chain for Act 4
   - P10: Rhythm and emotional space analysis - identifies pacing issues
   - P11: Conflict redistribution - generates restructuring strategies

5. **ThematicPolisher** (`lib/agents/thematic-polisher.ts`) - Epic 006
   - Implements P12-P13 prompt chain for Act 5
   - P12: Character de-labeling and depth - removes generic traits
   - P13: Core fears and beliefs - defines emotional core

6. **RevisionExecutive** (`lib/agents/revision-executive.ts`)
   - Generates contextual fixes for detected errors
   - Validates and sanitizes AI outputs

7. **SynthesisEngine** (`lib/synthesis/synthesis-engine.ts`) - Epic 007
   - Orchestrates complete synthesis workflow
   - Integrates decisions from all 5 acts
   - Detects and resolves conflicts automatically
   - Preserves original script style (6-dimensional analysis)
   - Supports chunking for long scripts (>6000 tokens)
   - Generates V2 script with confidence scoring

### API Architecture (V1 - Current Production System)

#### Async Job Queue System
- **WorkflowQueue** (`lib/api/workflow-queue.ts`): Singleton pattern managing background jobs
  - Processes jobs every 3 seconds
  - Handles Act 1 analysis with ConsistencyGuardian
  - Handles synthesis jobs with SynthesisEngine (Epic 007)
  - Updates WorkflowStatus state machine
  - Stores DiagnosticReport in database

#### Status Polling Pattern
- Frontend polls job status every 5 seconds (reduced from 2s on 2025-10-02)
- Client: `v1ApiService.pollJobStatus()` in `lib/services/v1-api-service.ts`
- Server: `GET /api/v1/analyze/jobs/:jobId`
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
- `GET /api/v1/projects/:id` - Get project details
- `POST /api/v1/analyze` - Start Act 1 analysis (returns jobId)
- `GET /api/v1/analyze/jobs/:jobId` - Poll job status
- `GET /api/v1/projects/:id/status` - Get workflow status
- `GET /api/v1/projects/:id/report` - Get diagnostic report

#### V1 Iteration Endpoints (Epic 005 & 006)
- `POST /api/v1/iteration/propose` - Generate AI proposals for focus area
  - Supports: `ACT2_CHARACTER`, `ACT3_WORLDBUILDING`, `ACT4_PACING`, `ACT5_THEME`
  - Input: projectId, act, focusName, contradiction, scriptContext
  - Output: decisionId, focusContext, proposals, recommendation
  - Creates RevisionDecision record
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
3. Click "获取AI解决方案提案" to get 2 AI proposals
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

### Modifying AI Agent Prompts

All agents follow the same pattern - see Epic 005/006 implementations for reference:

#### Act-Specific Prompt Files
- **Act 1**: `lib/agents/prompts/consistency-prompts.ts` - Error detection rules
- **Act 2**: `lib/agents/prompts/character-architect-prompts.ts` - P4-P6 prompts
- **Act 3**: `lib/agents/prompts/rules-auditor-prompts.ts` - P7-P9 prompts
- **Act 4**: `lib/agents/prompts/pacing-strategist-prompts.ts` - P10-P11 prompts
- **Act 5**: `lib/agents/prompts/thematic-polisher-prompts.ts` - P12-P13 prompts

#### Prompt Requirements
- All prompts must output Chinese language
- Use `response_format: { type: 'json_object' }` in DeepSeek API calls
- Return structured JSON matching interface types
- Include validation methods in agent classes

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
  - `projects/route.ts` - Project CRUD
  - `analyze/route.ts` - Start Act 1 analysis
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

### Iteration API Pattern (Epic 005 & 006)
For interactive decision-making across all Acts 2-5:
1. Call `POST /api/v1/iteration/propose` with focus area and act type
2. System routes to appropriate agent (CharacterArchitect/RulesAuditor/PacingStrategist/ThematicPolisher)
3. AI generates proposals and creates RevisionDecision record
4. User reviews proposals in UI
5. Call `POST /api/v1/iteration/execute` with selected proposal
6. Agent executes act-specific transformation (P6/P9/P11/P13)
7. RevisionDecision updated with userChoice and generatedChanges

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

**Testing**:
- ✅ 61/61 unit tests passing
- ✅ Integration tests verified
- ✅ E2E framework ready

### 📋 Next Steps (Optional Enhancements)

- [ ] Detailed diff viewer ("查看详细差异" button)
- [ ] DOCX export format
- [ ] Multiple V2 versions (V2.1, V2.2...)
- [ ] Synthesis preview mode
- [ ] Manual conflict resolution UI
- [ ] Batch synthesis for multiple projects

### 📚 Key Documentation

For future development, refer to:
1. **Main Workflow**: `docs/ai-analysis-repair-workflow.md` (v3.0.0)
2. **Epic Guides**: `docs/epics/epic-*/README.md`
3. **Phase Summaries**: `docs/ITERATION_PAGE_IMPLEMENTATION.md`, `docs/PHASE_2_COMPLETION_SUMMARY.md`
4. **This File**: Always check CLAUDE.md first for architecture overview

---

**Last Updated**: 2025-10-02 (Post-documentation cleanup)
**Architecture Version**: V1 API (Epic 004-007 Complete)
**System Status**: Production Ready with Complete UI
**Test Coverage**: 97.5% (77/79 tests passing)
**Documentation**: Reorganized for clarity (root and docs/ directories cleaned)
