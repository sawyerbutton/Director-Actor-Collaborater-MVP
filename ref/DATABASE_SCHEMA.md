# Database Schema Reference

Complete reference for ScriptAI database models using Prisma ORM with PostgreSQL.

## Schema Location

`prisma/schema.prisma`

## Database Configuration

### Local Development
```
DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
```

### Production (Supabase)
```
DATABASE_URL="postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...@pooler.supabase.com:5432/postgres"
```

## Core Models

### User

Represents a user in the system.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String?  @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects Project[]
}
```

**Indexes**:
- Primary: `id`
- Unique: `email`

**Demo User**:
- ID: `demo-user`
- Created via seed script: `npx prisma db seed`

### Project

Central model tracking script projects and workflow state.

```prisma
model Project {
  id             String         @id @default(cuid())
  title          String
  content        String         @db.Text
  workflowStatus WorkflowStatus @default(INITIALIZED)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  userId         String

  user              User                @relation(fields: [userId], references: [id])
  versions          ScriptVersion[]
  analysisJobs      AnalysisJob[]
  diagnosticReports DiagnosticReport[]
  revisionDecisions RevisionDecision[]
}
```

**Fields**:
- `id`: Unique identifier (CUID)
- `title`: Project name (1-200 characters)
- `content`: Script content (500-10000 lines)
- `workflowStatus`: Current workflow state (see WorkflowStatus enum)
- `userId`: Foreign key to User

**Indexes**:
- Primary: `id`
- Foreign Key: `userId` → `User.id`
- Index: `userId`, `workflowStatus`

**Workflow Status Enum**:
```prisma
enum WorkflowStatus {
  INITIALIZED       // Project created, no analysis yet
  ACT1_RUNNING      // ACT1 analysis in progress
  ACT1_COMPLETE     // ACT1 diagnostic report ready
  ITERATING         // Acts 2-5 in progress
  SYNTHESIZING      // V2 synthesis in progress
  COMPLETED         // V2 synthesis complete
}
```

**State Transitions**:
```
INITIALIZED → ACT1_RUNNING → ACT1_COMPLETE → ITERATING → SYNTHESIZING → COMPLETED
```

### ScriptVersion

Versioned script storage with metadata.

```prisma
model ScriptVersion {
  id                String   @id @default(cuid())
  projectId         String
  versionNumber     String
  content           String   @db.Text
  changeLog         String?  @db.Text
  synthesisMetadata Json?
  confidenceScore   Float?
  createdAt         DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, versionNumber])
  @@index([projectId])
}
```

**Fields**:
- `versionNumber`: "V1", "V2", "V3", etc.
- `content`: Full script content
- `changeLog`: Human-readable change summary
- `synthesisMetadata`: JSON metadata from synthesis (Epic 007)
  - `decisionsApplied`: Number of decisions integrated
  - `conflictsDetected`: Number of conflicts found
  - `conflictsResolved`: Number of conflicts resolved
  - `styleProfile`: 6-dimensional style analysis
- `confidenceScore`: 0-1 scale (V2 quality score)

**Indexes**:
- Primary: `id`
- Unique: `[projectId, versionNumber]`
- Index: `projectId`

**Version Lifecycle**:
1. **V0**: Original uploaded script (stored in Project.content)
2. **V1**: ACT1 repaired script (created via `/apply-act1-repair`)
3. **V2+**: Incremental versions from ACT2-5 decisions
4. **V2 (Synthesis)**: Final synthesized script (created via `/synthesize`)

### AnalysisJob

Async job tracking for background operations.

```prisma
model AnalysisJob {
  id        String    @id @default(cuid())
  projectId String
  type      JobType
  status    JobStatus @default(QUEUED)
  progress  Float     @default(0)
  result    Json?
  error     String?   @db.Text
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, status])
  @@index([status])
}
```

**JobType Enum**:
```prisma
enum JobType {
  ACT1_ANALYSIS   // ConsistencyGuardian analysis
  ITERATION       // ACT2-5 proposal generation
  SYNTHESIS       // V2 synthesis
  EXPORT          // Script export
}
```

**JobStatus Enum**:
```prisma
enum JobStatus {
  QUEUED      // Waiting to be processed
  PROCESSING  // Currently running
  COMPLETED   // Successfully finished
  FAILED      // Error occurred
}
```

**Fields**:
- `type`: Type of operation (see JobType enum)
- `status`: Current state (see JobStatus enum)
- `progress`: 0-1 scale (0% to 100%)
- `result`: JSON result when COMPLETED
- `error`: Error message when FAILED

**Indexes**:
- Primary: `id`
- Composite: `[projectId, status]`
- Single: `status`

**Job Lifecycle**:
1. Created with status `QUEUED`
2. WorkflowQueue picks up and sets `PROCESSING`
3. AI agent executes operation
4. Status set to `COMPLETED` with `result` or `FAILED` with `error`
5. Frontend polls until COMPLETED/FAILED

### DiagnosticReport

ACT1 analysis findings from ConsistencyGuardian.

```prisma
model DiagnosticReport {
  id         String   @id @default(cuid())
  projectId  String   @unique
  findings   Json
  statistics Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

**Fields**:
- `findings`: JSON array of LogicError objects
- `statistics`: JSON object with totals and breakdowns

**Findings Structure**:
```json
{
  "findings": [
    {
      "id": "error-1",
      "type": "timeline",
      "severity": "critical",
      "title": "时间线矛盾",
      "description": "详细描述",
      "location": {
        "start": { "line": 10, "scene": 3 },
        "end": { "line": 25, "scene": 5 }
      },
      "confidence": 0.95,
      "suggestedFix": "建议修改"
    }
  ],
  "statistics": {
    "total": 10,
    "byType": {
      "timeline": 3,
      "character": 4,
      "plot": 2,
      "dialogue": 1,
      "scene": 0
    },
    "bySeverity": {
      "critical": 3,
      "warning": 5,
      "info": 2
    }
  }
}
```

**Error Types**:
- `timeline` - Timeline inconsistencies
- `character` - Character contradictions
- `plot` - Plot logic errors
- `dialogue` - Dialogue inconsistencies
- `scene` - Scene continuity issues

**Severity Levels**:
- `critical` - Must fix (AI: critical/high)
- `warning` - Should fix (AI: medium)
- `info` - Consider fixing (AI: low)

**Indexes**:
- Primary: `id`
- Unique: `projectId`

### RevisionDecision

Tracks user decisions during Acts 2-5 iteration.

```prisma
model RevisionDecision {
  id               String   @id @default(cuid())
  projectId        String
  act              ActType
  focusName        String
  contradiction    String   @db.Text
  scriptContext    String   @db.Text
  proposals        Json
  userChoice       Int?
  generatedChanges Json?
  createdAt        DateTime @default(now())
  executedAt       DateTime?

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, act])
  @@index([projectId])
}
```

**ActType Enum**:
```prisma
enum ActType {
  ACT2_CHARACTER     // CharacterArchitect
  ACT3_WORLDBUILDING // RulesAuditor
  ACT4_PACING        // PacingStrategist
  ACT5_THEME         // ThematicPolisher
}
```

**Fields**:
- `act`: Which act this decision belongs to
- `focusName`: Character name, scene number, or theme focus
- `contradiction`: Problem description from ACT1 or manual input
- `scriptContext`: Relevant script excerpt
- `proposals`: JSON array of AI-generated proposals (2 options)
- `userChoice`: Selected proposal index (0 or 1, or higher for Acts 3-5)
- `generatedChanges`: JSON result from execution (dramatic actions, strategies, etc.)
- `executedAt`: Timestamp when proposal was executed

**Indexes**:
- Primary: `id`
- Composite: `[projectId, act]`
- Single: `projectId`

**Lifecycle**:
1. Created via `/iteration/propose` with `proposals` (async job, 30-60s)
2. `userChoice` and `generatedChanges` set via `/iteration/execute` (< 5s)
3. `executedAt` timestamp recorded
4. Creates ScriptVersion with incremental changes

**Proposals Structure (ACT2)**:
```json
{
  "focusContext": {
    "characterName": "张三",
    "currentDescription": "当前描述",
    "growthPotential": "成长潜力"
  },
  "proposals": [
    {
      "id": 0,
      "type": "gradual",
      "approach": "渐进式发展",
      "pros": ["优点1", "优点2"],
      "cons": ["缺点1"]
    },
    {
      "id": 1,
      "type": "dramatic",
      "approach": "戏剧性转变",
      "pros": ["优点1"],
      "cons": ["缺点1", "缺点2"]
    }
  ],
  "recommendation": 0
}
```

**Generated Changes Structure (ACT2)**:
```json
{
  "actions": [
    {
      "sceneNumber": 3,
      "actionDescription": "张三在会议上犹豫不决",
      "dialogueSuggestion": "对话建议",
      "emotionalTone": "焦虑、自我怀疑"
    }
  ],
  "overallArc": "成长弧线",
  "integrationNotes": "整合建议"
}
```

## Services Layer

Database operations are abstracted through service classes in `lib/db/services/`:

### BaseService

Base class providing common CRUD operations and transaction support.

**Location**: `lib/db/services/base.service.ts`

**Methods**:
- `findUnique(where)`
- `findMany(where, orderBy, take, skip)`
- `create(data)`
- `update(where, data)`
- `delete(where)`
- `count(where)`
- `transaction(fn)` - Supports nested transactions

### ProjectService

Manages Project model operations.

**Location**: `lib/db/services/project.service.ts`

**Key Methods**:
```typescript
createProject(data: CreateProjectInput): Promise<Project>
getProject(id: string): Promise<Project | null>
listProjects(userId: string): Promise<Project[]>
updateWorkflowStatus(id: string, status: WorkflowStatus): Promise<Project>
updateContent(id: string, content: string): Promise<Project>
```

### ScriptVersionService

Manages script versioning.

**Location**: `lib/db/services/script-version.service.ts`

**Key Methods**:
```typescript
createVersion(data: CreateVersionInput): Promise<ScriptVersion>
getVersion(id: string): Promise<ScriptVersion | null>
getVersionByNumber(projectId: string, versionNumber: string): Promise<ScriptVersion | null>
listVersions(projectId: string): Promise<ScriptVersion[]>
getLatestVersion(projectId: string): Promise<ScriptVersion | null>
```

### AnalysisJobService

Manages async job queue.

**Location**: `lib/db/services/analysis-job.service.ts`

**Key Methods**:
```typescript
createJob(data: CreateJobInput): Promise<AnalysisJob>
getJob(id: string): Promise<AnalysisJob | null>
updateJobStatus(id: string, status: JobStatus, progress?: number): Promise<AnalysisJob>
completeJob(id: string, result: any): Promise<AnalysisJob>
failJob(id: string, error: string): Promise<AnalysisJob>
getQueuedJobs(): Promise<AnalysisJob[]>
```

### DiagnosticReportService

Manages ACT1 diagnostic reports.

**Location**: `lib/db/services/diagnostic-report.service.ts`

**Key Methods**:
```typescript
createReport(data: CreateReportInput): Promise<DiagnosticReport>
getReport(projectId: string): Promise<DiagnosticReport | null>
updateReport(projectId: string, data: UpdateReportInput): Promise<DiagnosticReport>
```

### RevisionDecisionService

Manages ACT2-5 iteration decisions.

**Location**: `lib/db/services/revision-decision.service.ts`

**Key Methods**:
```typescript
createDecision(data: CreateDecisionInput): Promise<RevisionDecision>
getDecision(id: string): Promise<RevisionDecision | null>
executeDecision(id: string, userChoice: number, generatedChanges: any): Promise<RevisionDecision>
listDecisions(projectId: string, act?: ActType): Promise<RevisionDecision[]>
rollback(id: string): Promise<RevisionDecision>
getStatistics(projectId: string): Promise<DecisionStatistics>
```

## Migrations

### Running Migrations

```bash
# Development: Push schema changes without migration files
npx prisma db push

# Production: Create and apply migrations
npx prisma migrate dev --name [migration-name]
npx prisma migrate deploy  # For production
```

### Generating Prisma Client

After schema changes, regenerate client:
```bash
npx prisma generate
```

### Database Reset

**CAUTION**: This will delete all data.
```bash
npx prisma db push --force-reset
npx prisma db seed  # Recreate demo-user
```

## Seeding

Seed script creates demo user and optionally test data.

**Location**: `prisma/seed.ts`

**Run Seed**:
```bash
npx prisma db seed
```

**Creates**:
- User with ID `demo-user`
- (Optional) Sample projects with test scripts

## Database Studio

Visual database browser:
```bash
npx prisma studio
```

Opens at `http://localhost:5555`

## Indexes and Performance

### Key Indexes

1. **Project**:
   - `userId` - Fast user project lookup
   - `workflowStatus` - Filter by workflow state

2. **AnalysisJob**:
   - `status` - Find queued jobs quickly
   - `[projectId, status]` - Project-specific job lookup

3. **ScriptVersion**:
   - `projectId` - List project versions
   - `[projectId, versionNumber]` - Unique constraint

4. **RevisionDecision**:
   - `projectId` - List project decisions
   - `[projectId, act]` - Filter decisions by act

### Query Optimization Tips

1. **Always use indexes** for WHERE clauses
2. **Limit result sets** with `take` parameter
3. **Select specific fields** instead of full models
4. **Use transactions** for multi-step operations
5. **Batch operations** when possible

## Connection Pooling

### Supabase (Production)

Use connection pooler for Serverless:
```
DATABASE_URL="postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

### Local Development

Direct connection:
```
DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public"
```

## Common Queries

### Get Project with Latest Version

```typescript
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: {
    versions: {
      orderBy: { createdAt: 'desc' },
      take: 1
    }
  }
});
```

### Get All Decisions for Project

```typescript
const decisions = await prisma.revisionDecision.findMany({
  where: { projectId },
  orderBy: { createdAt: 'asc' }
});
```

### Get Queued Jobs

```typescript
const jobs = await prisma.analysisJob.findMany({
  where: { status: 'QUEUED' },
  orderBy: { createdAt: 'asc' }
});
```

### Count Errors by Type

```typescript
const report = await prisma.diagnosticReport.findUnique({
  where: { projectId }
});

const statistics = report?.statistics as {
  byType: Record<string, number>;
};
```

## Transaction Examples

### Create Version and Update Project

```typescript
const result = await prisma.$transaction(async (tx) => {
  const version = await tx.scriptVersion.create({
    data: { projectId, versionNumber: 'V1', content }
  });

  const project = await tx.project.update({
    where: { id: projectId },
    data: {
      content,
      workflowStatus: 'ITERATING'
    }
  });

  return { version, project };
});
```

## Error Handling

### Prisma Error Codes

- `P2002` - Unique constraint violation
- `P2003` - Foreign key constraint violation
- `P2025` - Record not found
- `P2028` - Transaction failed

### Example Error Handler

```typescript
try {
  await prisma.project.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    throw new Error('Project already exists');
  }
  if (error.code === 'P2003') {
    throw new Error('User not found');
  }
  throw error;
}
```

## Related Documentation

- **API Endpoints**: See `ref/API_REFERENCE.md`
- **Services Layer**: See `lib/db/services/`
- **Prisma Docs**: https://www.prisma.io/docs
