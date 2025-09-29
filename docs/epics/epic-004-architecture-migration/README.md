# Epic 004: Architecture Migration & Act 1 Foundation

## 📋 Quick Links
- [🚀 Quick Test Guide](./quick-test.md) - 5分钟快速测试流程
- [📖 Complete Test Guide](./test-guide.md) - 详细测试文档
- [Story 001: Database Activation](./story-001-database-activation.md)
- [Story 002: V1 API Implementation](./story-002-v1-api-implementation.md)
- [Story 003: Frontend Migration](./story-003-frontend-migration.md)

## Epic Overview
**Epic ID:** EPIC-004
**Epic Name:** Database & V1 API Migration - Five-Act Workflow Foundation
**Priority:** P0 - Critical Foundation
**Estimated Duration:** 1-2 weeks
**Dependencies:** None (Foundation Epic)
**Status:** ✅ COMPLETED (2024-09-29)

## Epic Goal
Migrate from localStorage/synchronous MVP architecture to database-backed V1 API with async processing, establishing the foundation for the five-act interactive workflow by implementing Act 1 (Foundational Diagnosis).

## Background & Context

### Current State
- **Architecture:** Synchronous API calls with localStorage for state persistence
- **Analysis Flow:** Single-pass script analysis with immediate response
- **State Management:** Client-side only, no persistence across sessions
- **API Structure:** Legacy `/api/analysis` endpoints
- **Agent System:** Basic ConsistencyGuardian without proper orchestration

### Target State
- **Architecture:** Async V1 API with PostgreSQL/Prisma database
- **Analysis Flow:** Job queue system with status polling
- **State Management:** Server-side persistence with state machine
- **API Structure:** RESTful V1 API (`/api/v1/*`)
- **Agent System:** Properly orchestrated ConsistencyGuardian for Act 1

## Technical Requirements

### Database Schema Requirements
```prisma
model Project {
  id              String           @id
  title           String
  workflowStatus  WorkflowStatus   @default(INITIALIZED)
  scriptVersions  ScriptVersion[]
  analysisJobs    AnalysisJob[]
  diagnosticReport DiagnosticReport?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

model ScriptVersion {
  id          String   @id
  projectId   String
  version     Int
  content     String   @db.Text
  project     Project  @relation(fields: [projectId], references: [id])
  createdAt   DateTime @default(now())
}

model AnalysisJob {
  id        String      @id
  projectId String
  type      JobType
  status    JobStatus   @default(QUEUED)
  result    Json?
  error     String?
  project   Project     @relation(fields: [projectId], references: [id])
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}

model DiagnosticReport {
  id          String   @id
  projectId   String   @unique
  findings    Json     // Structured findings from Act 1
  project     Project  @relation(fields: [projectId], references: [id])
  createdAt   DateTime @default(now())
}

enum WorkflowStatus {
  INITIALIZED
  ACT1_RUNNING
  ACT1_COMPLETE
  ITERATING
  SYNTHESIZING
  COMPLETED
}

enum JobType {
  ACT1_ANALYSIS
  SYNTHESIS
}

enum JobStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
}
```

### API Endpoints Required

#### Project Management
- `POST /api/v1/projects` - Create new project with initial script
- `GET /api/v1/projects/:id` - Get project details
- `GET /api/v1/projects/:id/status` - Get workflow status

#### Analysis Operations
- `POST /api/v1/analyze` - Trigger Act 1 analysis (async)
- `GET /api/v1/analyze/:jobId/status` - Poll job status
- `GET /api/v1/projects/:id/report` - Get diagnostic report

### Agent Integration
- Refactor ConsistencyGuardian to implement proper Agent interface
- Implement Prompt chains P1-P3 from reference document
- Structured output parsing for DiagnosticReport format
- Error handling and retry logic

## User Stories

### Story 1: Database Activation & Model Implementation
**Points:** 8
**Priority:** P0
**Description:** Activate PostgreSQL/Prisma infrastructure and implement core data models with state machine for workflow tracking.

**Acceptance Criteria:**
- [ ] Prisma configured with correct database URLs
- [ ] All models created and migrated
- [ ] State machine transitions validated
- [ ] Database services layer implemented
- [ ] Connection pooling configured for serverless

### Story 2: V1 API Implementation with Async Processing
**Points:** 13
**Priority:** P0
**Description:** Implement V1 API endpoints with async job queue system for Act 1 analysis processing.

**Acceptance Criteria:**
- [ ] All V1 endpoints implemented and tested
- [ ] Job queue system operational (BullMQ or similar)
- [ ] ConsistencyGuardian integrated as Agent
- [ ] Status polling mechanism working
- [ ] Error handling and retry logic in place

### Story 3: Frontend Migration to V1 API
**Points:** 8
**Priority:** P0
**Description:** Migrate frontend from localStorage to V1 API with polling mechanism and complete removal of client-side persistence.

**Acceptance Criteria:**
- [ ] All localStorage usage removed
- [ ] Polling mechanism implemented (SWR or React Query)
- [ ] Loading states properly displayed
- [ ] Error states handled gracefully
- [ ] Backward compatibility during transition

## Success Metrics
- [ ] Zero data loss during migration
- [ ] Act 1 analysis completes successfully via async flow
- [ ] Response time < 2 seconds for API calls (excluding LLM processing)
- [ ] 100% of analysis results persisted to database
- [ ] Frontend successfully polls and displays results

## Risk Assessment

### High Risks
1. **Data Migration Complexity**
   - **Risk:** Loss of existing analysis data during transition
   - **Mitigation:** Dual-write strategy, data validation scripts
   - **Contingency:** Export/import tools for manual recovery

2. **Async Processing Failures**
   - **Risk:** Jobs stuck in queue or lost
   - **Mitigation:** Timeout handling, dead letter queue
   - **Contingency:** Manual job restart capability

### Medium Risks
1. **Database Performance**
   - **Risk:** Slow queries with large scripts
   - **Mitigation:** Proper indexing, query optimization
   - **Contingency:** Caching layer if needed

2. **API Breaking Changes**
   - **Risk:** Frontend/backend mismatch during deployment
   - **Mitigation:** Versioned API, feature flags
   - **Contingency:** Rollback procedure

## Dependencies
- Database infrastructure ready (Supabase/PostgreSQL)
- Redis or queue service for job processing
- DeepSeek API access maintained
- No external team dependencies

## Definition of Done
- [ ] All three user stories completed
- [ ] Database migrations successfully deployed
- [ ] V1 API endpoints passing all tests
- [ ] Frontend fully migrated from localStorage
- [ ] Act 1 analysis working end-to-end
- [ ] Performance metrics met
- [ ] Documentation updated
- [ ] Zero regressions in existing functionality

## Technical Notes

### Migration Strategy
1. **Week 1:** Database setup, model implementation, V1 API structure
2. **Week 2:** Agent integration, frontend migration, testing & validation

### Key Implementation Considerations
- Use transactions for critical database operations
- Implement idempotent API operations where possible
- Maintain audit log for state transitions
- Use structured logging for debugging async flows
- Consider implementing OpenTelemetry for observability

### Rollback Plan
1. Feature flag to toggle between old/new API
2. Database backup before migration
3. localStorage fallback code maintained for 2 weeks
4. Monitoring alerts for failure detection
5. Quick rollback script prepared

## Next Epic Dependencies
This epic enables:
- Epic 2: Interactive Workflow Core (requires database & V1 API)
- Epic 3: Multi-Act Agent System (requires async processing)
- Epic 4: Grand Synthesis Engine (requires state management)