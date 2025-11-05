# Architecture Overview Reference

**Last Updated**: 2025-11-05 (Sprint 4 Complete)
**Version**: v1.23
**Status**: Production Ready ✅

---

## 📋 Quick Navigation

### Core References
- **[Workflow System](WORKFLOW_REFERENCE.md)** - Five-act workflow state machine
- **[AI Agents](AI_AGENTS.md)** - 6 AI agents (ConsistencyGuardian, CharacterArchitect, etc.)
- **[API Documentation](API_REFERENCE.md)** - Complete V1 API (25+ endpoints)
- **[Database Schema](DATABASE_SCHEMA.md)** - 8 core models, indexes, query patterns
- **[Frontend Components](FRONTEND_COMPONENTS.md)** - React components, pages, state management
- **[Testing Guide](TESTING_GUIDE.md)** - Unit, integration, E2E testing strategies
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Vercel + Supabase production setup

### Sprint 3 (Multi-File Analysis)
- **[Multi-File Analysis](MULTI_FILE_ANALYSIS.md)** - Cross-file consistency checking (✨ NEW)
- **API Docs**: [docs/api/MULTI_FILE_ANALYSIS_API.md](../docs/api/MULTI_FILE_ANALYSIS_API.md)
- **Quick Reference**: [docs/api/API_QUICK_REFERENCE.md](../docs/api/API_QUICK_REFERENCE.md)

### Detailed Architecture (250+ pages)
- **[Main Index](../docs/architecture/SYSTEM_ARCHITECTURE_COMPLETE.md)**
- **[Business Flow](../docs/architecture/01_BUSINESS_FLOW.md)** (70+ pages)
- **[Database Architecture](../docs/architecture/02_DATABASE_ARCHITECTURE.md)** (40+ pages)
- **[Frontend Architecture](../docs/architecture/03_FRONTEND_ARCHITECTURE.md)** (40+ pages)
- **[Backend API Architecture](../docs/architecture/04_BACKEND_API_ARCHITECTURE.md)** (45+ pages)
- **[LLM Integration](../docs/architecture/05_LLM_INTEGRATION.md)** (40+ pages)
- **[Deployment Architecture](../docs/architecture/06_DEPLOYMENT_ARCHITECTURE.md)** (30+ pages)

---

## 🏗️ System Architecture

### High-Level Architecture
```
[User Browser]
     ↓
[Next.js 14 App Router]
     ↓
[V1 API Routes] → [WorkflowQueue] → [AI Agents] → [DeepSeek API]
     ↓
[Prisma ORM]
     ↓
[PostgreSQL (Supabase)]
```

### Technology Stack
- **Frontend**: Next.js 14.2.32, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma 5.22.0, Zod validation
- **Database**: PostgreSQL 16 (Supabase), Connection Pooling
- **AI**: DeepSeek API, 6 specialized agents
- **Deployment**: Vercel (Serverless), Docker (local dev)
- **Testing**: Jest, Playwright, Integration tests

---

## 📦 Core Components

### 1. Five-Act Workflow System
**State Machine**: `INITIALIZED` → `ACT1_RUNNING` → `ACT1_COMPLETE` → `ITERATING` → `SYNTHESIZING` → `COMPLETED`

**Acts**:
- **ACT1**: Logic Repair (ConsistencyGuardian) - 5-10 minutes
- **ACT2**: Character Depth (CharacterArchitect) - Creative enhancement
- **ACT3**: Worldbuilding (RulesAuditor) - Setting enrichment
- **ACT4**: Pacing (PacingStrategist) - Rhythm optimization
- **ACT5**: Theme (ThematicPolisher) - Spiritual depth
- **Synthesis**: SynthesisEngine merges all decisions into V2 script

### 2. Multi-File Analysis System (Sprint 3)
**Purpose**: Cross-file consistency checking for multi-episode scripts

**Components**:
- **CrossFileAnalyzer**: Base class, 4 check types (timeline, character, plot, setting)
- **CrossFileAdvisor**: AI-powered resolution strategy generator
- **MultiFileAnalysisService**: Service layer for batch operations
- **Python Converter**: External service for JSON conversion

**Performance** (PERF-002 baseline):
- 5 files: 152ms total (126ms upload + 25ms analysis)
- 10 files: 279ms total (233ms upload + 45ms analysis)
- Throughput: 35+ files/sec
- Memory: 10-16MB per 10 files

**API Endpoints**:
```
POST /api/v1/projects/:id/files/batch          # Batch upload (max 50)
POST /api/v1/projects/:id/analyze/cross-file   # Run analysis
GET  /api/v1/projects/:id/cross-file-findings  # Get findings
```

### 3. Async Job Queue (WorkflowQueue)
**Dual-Mode Architecture**:
- **Traditional Server**: Background processing with `setInterval()`
- **Serverless (Vercel)**: Manual trigger via `POST /api/v1/analyze/process`

**Job Types**:
- `ACT1_ANALYSIS`: ConsistencyGuardian logic detection (30-120s)
- `ITERATION`: ACT2-5 proposal generation (30-60s)
- `SYNTHESIS`: Final script merge (2-5 minutes)
- `EXPORT`: Script export (5-30s)

**Statuses**: `QUEUED` → `PROCESSING` → `COMPLETED` / `FAILED`

### 4. Database Models (8 Core)
```typescript
User              // User accounts
Project           // Script projects (workflowStatus tracker)
ScriptFile        // Multi-file scripts (Sprint 3, episodeNumber)
ScriptVersion     // Version history (V0, V1, V2...)
AnalysisJob       // Async task queue
DiagnosticReport  // ACT1 findings (internal + cross-file)
RevisionDecision  // ACT2-5 decisions
Analysis          // Legacy (backward compatibility)
```

**Key Relationships**:
- Project 1:N ScriptFile (multi-file support)
- Project 1:1 DiagnosticReport
- Project 1:N RevisionDecision
- Project 1:N ScriptVersion
- All use `onDelete: Cascade`

### 5. API Architecture (V1)
**Total Endpoints**: 25+

**Categories**:
- **Project Management**: Create, list, get project (3 endpoints)
- **ACT1 Analysis**: Start, poll status, get report (4 endpoints)
- **ACT2-5 Iteration**: Propose, execute, decisions (3 endpoints)
- **Synthesis**: Trigger, poll, versions (5 endpoints)
- **Multi-File**: Upload, batch, analyze, findings (9 endpoints) ✨ Sprint 3
- **Export**: Generate, download (2 endpoints)

**Key Patterns**:
- Async job creation (return jobId immediately)
- Status polling (5-second interval)
- JSON-only responses (Serverless compatibility)
- Zod validation for all inputs

---

## 🔧 Development Workflow

### Local Setup
```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (Docker)
docker-compose up -d postgres

# 3. Initialize database
npx prisma db push
npx prisma db seed

# 4. Start dev server
npm run dev
```

### Sprint 3 Multi-File Setup (Optional)
```bash
# Start Python converter
docker-compose up -d python-converter

# Verify services
npm run verify-docker

# Test multi-file upload
curl -X POST http://localhost:3000/api/v1/projects/:id/files/batch \
  -H "Content-Type: application/json" \
  -d '{"files": [...]}'
```

### Testing
```bash
# Unit tests (77 tests)
npm test

# E2E tests (Playwright)
npm run test:e2e

# Performance tests (Sprint 4)
npm test tests/performance/multi-file-performance.test.ts

# Error boundary tests (Sprint 4)
npm test tests/integration/multi-file-error-boundary.test.ts

# Full verification
npm run check:all
```

---

## 📊 Performance Characteristics

### ACT1 Analysis
- Small scripts (<1000 lines): 10-20 seconds
- Medium scripts (1000-3000 lines): 30-60 seconds
- Large scripts (3000-10000 lines): 2-5 minutes

### ACT2-5 Iteration
- Propose (AI generation): 30-60 seconds (async job)
- Execute (apply changes): <5 seconds (synchronous)

### Synthesis
- Small scripts: 10-20 seconds
- Large scripts: 2-5 minutes (with chunking)

### Multi-File Analysis (Sprint 3)
- Timeline/Character checks: **35+ files/sec** ✅
- Plot/Setting checks: **0.04 files/sec** ⚠️ (P0 optimization needed)
- **Recommended**: Use only Timeline + Character for Beta (excellent performance)

---

## 🚀 Deployment

### Production Stack
- **Hosting**: Vercel Pro Plan ($20/month, 60s function timeout)
- **Database**: Supabase Pro ($25/month, 8GB storage)
- **AI**: DeepSeek API (pay-per-token)
- **Converter**: Railway (free tier, or Docker)

### Environment Variables (Critical)
```bash
# Database (Supabase Pooler)
DATABASE_URL="postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...@db.supabase.co:5432/postgres"

# AI Service
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_API_URL=https://api.deepseek.com

# Python Converter (Sprint 3)
PYTHON_CONVERTER_URL=https://your-converter.railway.app
```

### Vercel Configuration (vercel.json)
**Key Timeouts**:
- `/api/v1/analyze/*`: 60s
- `/api/v1/iteration/*`: 60s
- `/api/v1/synthesize/*`: 60s
- `/api/v1/projects/[id]/files/batch`: 60s (Sprint 3)
- `/api/v1/projects/[id]/analyze/cross-file`: 60s (Sprint 3)

### Deployment Checklist
- [ ] Vercel Pro Plan activated
- [ ] Supabase database created
- [ ] Environment variables configured
- [ ] Prisma migrations applied
- [ ] Seed data created (demo-user)
- [ ] Health check passed
- [ ] ACT1-5 flow tested
- [ ] Multi-file upload tested (Sprint 3)
- [ ] Python converter deployed (Sprint 3)

---

## 📈 Current Status

### Project Progress
- **Overall**: 93% (37/40 tasks)
- **Sprint 1**: ✅ 100% (9/9) - Multi-file infrastructure
- **Sprint 2**: ✅ 100% (9/11) - Core analysis features
- **Sprint 3**: 🔄 93% (13/14) - Multi-file analysis system
- **Sprint 4**: ✅ 100% (6/6) - Testing & production config

### Sprint 4 Deliverables (2025-11-05)
- ✅ E2E tests (10 tests passing)
- ✅ Performance baseline (PERF-001~003)
- ✅ Error boundary tests (27 tests, 100% pass)
- ✅ API documentation (1100+ lines)
- ✅ Docker deployment verification
- ✅ Production configuration guide

### Test Coverage
- **Unit Tests**: 77/77 passing (100%)
- **Integration Tests**: 29/30 passing (96.7%)
- **E2E Tests**: Framework ready, WSL-stable
- **Performance Tests**: 3/3 baseline established
- **Error Boundary**: 27/27 passing (100%)

---

## 🔍 Key Files

### Configuration
```
.env                              # Local environment variables
vercel.json                       # Vercel deployment config
prisma/schema.prisma              # Database schema
docker-compose.yml                # Local services (PostgreSQL, Python)
```

### Documentation
```
CLAUDE.md                         # Developer quick start
ref/                              # Reference documentation (9 files)
docs/architecture/                # Detailed architecture (7 docs, 250+ pages)
docs/api/                         # API documentation
docs/testing/                     # Test reports
docs/deployment/                  # Deployment guides
DEVELOPMENT_PROGRESS.md           # Sprint tracking
```

### Core Implementation
```
lib/agents/                       # 6 AI agents
lib/api/workflow-queue.ts         # Async job processor
lib/services/v1-api-service.ts    # Frontend API client
lib/db/services/                  # Database service layer
lib/analysis/                     # Multi-file analyzer (Sprint 3)
app/api/v1/                       # API route handlers
components/                       # React components
```

### Testing
```
tests/unit/                       # Unit tests (Jest)
tests/integration/                # Integration tests
tests/e2e/                        # E2E tests (Playwright)
tests/performance/                # Performance tests (Sprint 4)
scripts/verify-docker-deployment.sh  # Deployment verification
```

---

## 📚 Additional Resources

### Troubleshooting Guides
- **[ACT1 Repair API Debugging](../docs/fixes/ACT1_REPAIR_API_DEBUGGING.md)**
- **[ACT2 Async Queue](../docs/fixes/ACT2_ASYNC_QUEUE_IMPLEMENTATION.md)**
- **[Vercel 504 Timeout Fix](../docs/fixes/VERCEL_504_TIMEOUT_FIX.md)**
- **[Serverless Job Processing](../docs/fixes/)** - Multiple guides

### Sprint Summaries
- **[Sprint 3 Summary](../docs/sprint-summaries/)** (Multi-file analysis)
- **[Sprint 4 Summary](../docs/sprint-summaries/SPRINT_4_COMPLETION_SUMMARY.md)** (Testing & config)

### Test Reports
- **[Performance Baseline Report](../docs/testing/PERFORMANCE_BASELINE_REPORT.md)**
- **[Error Boundary Test Report](../docs/testing/ERROR_BOUNDARY_TEST_REPORT.md)**
- **[Docker Deployment Verification](../docs/testing/DOCKER_DEPLOYMENT_VERIFICATION.md)**
- **[E2E Test Execution Report](../docs/qa/e2e-test-execution-report.md)**

---

## ⚠️ Known Limitations & Future Work

### Sprint 3 Performance (P0 Priority)
**Issue**: Plot/Setting checks are 540x slower than Timeline/Character
- Plot/Setting: 81.9s for 3 files
- Timeline/Character: 0.15s for 3 files

**Root Cause**: Jaccard similarity O(n²) + no text length limit

**Planned Fix**: Text truncation (200 chars) + MinHash algorithm
- **Expected**: 81s → 3-5s (95% improvement)
- **ETA**: Sprint 5 (T3.14 completion)

### Beta Release Strategy
**Phase 1**: Launch with Timeline + Character checks only (excellent performance)
**Phase 2**: Add Plot + Setting after optimization (V1.1)

---

## 🎯 Quick Start by Use Case

### New Developer Onboarding
1. Read [CLAUDE.md](../CLAUDE.md) (this file header)
2. Read [WORKFLOW_REFERENCE.md](WORKFLOW_REFERENCE.md)
3. Read [API_REFERENCE.md](API_REFERENCE.md)
4. Set up local environment (see Quick Start above)

### Implementing New Features
1. Check [AI_AGENTS.md](AI_AGENTS.md) for agent patterns
2. Check [API_REFERENCE.md](API_REFERENCE.md) for endpoint patterns
3. Check [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for data models

### Debugging Issues
1. Check [Deployment Guide](DEPLOYMENT_GUIDE.md) troubleshooting section
2. Check [docs/fixes/](../docs/fixes/) for specific issues
3. Review test reports in [docs/testing/](../docs/testing/)

### Writing Tests
1. Follow patterns in [TESTING_GUIDE.md](TESTING_GUIDE.md)
2. Review existing test files in `tests/`
3. Check test reports for coverage gaps

### Deploying to Production
1. Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. Follow [docs/deployment/MULTI_FILE_PRODUCTION_CONFIG.md](../docs/deployment/MULTI_FILE_PRODUCTION_CONFIG.md)
3. Run verification script: `scripts/verify-docker-deployment.sh`

---

**Last Updated**: 2025-11-05 (Sprint 4 Complete)
**Next Update**: Sprint 5 (T3.14 optimization + Sprint 3 completion)
