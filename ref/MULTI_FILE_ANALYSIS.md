# Multi-File Analysis System Reference

**Last Updated**: 2025-11-05
**Sprint**: Sprint 3 - Layered Checking System
**Status**: 78% Complete (11/14 tasks)

This document provides comprehensive reference for the multi-file script analysis system, including cross-file consistency checking, AI-assisted decision making, and multi-file analysis APIs.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [Usage Guide](#usage-guide)
7. [Configuration](#configuration)

---

## System Overview

### Purpose

The multi-file analysis system extends the single-file script analysis to handle **multiple script files** (episodes) simultaneously, detecting **cross-file consistency issues** that span across different files.

### Key Features

1. **Cross-File Consistency Checking**
   - Timeline inconsistencies across episodes
   - Character introduction and naming issues
   - Plot thread continuity problems
   - Setting/location description conflicts

2. **AI-Assisted Decision Making**
   - Generates 2-3 resolution strategies per issue
   - AI recommends best solution
   - Provides impact analysis and difficulty ratings

3. **Batch Analysis**
   - Analyzes multiple files in parallel
   - Intelligent findings merging and deduplication
   - Incremental analysis support

4. **RESTful API**
   - Run cross-file analysis
   - Query findings (grouped or flat)
   - Configure check types and thresholds

### Workflow

```
User uploads multiple scripts
         ↓
Internal single-file analysis (existing)
         ↓
Cross-file consistency analysis (new)
         ↓
Findings stored in DiagnosticReport
         ↓
User selects a cross-file finding
         ↓
AI generates resolution strategies
         ↓
User chooses and executes solution
```

---

## Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────┐
│         API Layer (REST Endpoints)          │
│  /projects/[id]/analyze/cross-file          │
│  /projects/[id]/cross-file-findings         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      Service Layer (Business Logic)         │
│  MultiFileAnalysisService                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│     Analysis Layer (Detection Logic)        │
│  DefaultCrossFileAnalyzer                   │
│  - checkTimeline()                          │
│  - checkCharacter()                         │
│  - checkPlot()                              │
│  - checkSetting()                           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      AI Layer (Decision Support)            │
│  CrossFileAdvisor + DeepSeek API            │
└─────────────────────────────────────────────┘
```

### Data Flow

```
ScriptFile[] (database)
      ↓
ParsedScriptContent[] (in-memory)
      ↓
CrossFileAnalyzer.analyze()
      ↓
CrossFileFinding[] (results)
      ↓
DiagnosticReport.findings.crossFileFindings (storage)
      ↓
CrossFileAdvisor.generateAdvice() (on-demand)
      ↓
ResolutionAdvice (AI suggestions)
```

---

## Core Components

### 1. CrossFileAnalyzer

**File**: `lib/analysis/cross-file-analyzer.ts`

Abstract base class for cross-file consistency analysis.

#### Key Interfaces

```typescript
// Parsed script content
interface ParsedScriptContent {
  fileId: string;
  filename: string;
  episodeNumber: number | null;
  jsonContent: any; // Parsed JSON
  rawContent: string;
}

// Configuration
interface CrossFileCheckConfig {
  checkTypes?: CrossFileFindingType[];
  minConfidence?: number; // 0-1
  maxFindingsPerType?: number;
  useAI?: boolean;
}

// Analysis result
interface CrossFileAnalysisResult {
  findings: CrossFileFinding[];
  processedFiles: number;
  totalFindings: number;
  byType: Record<CrossFileFindingType, number>;
  processingTime: number;
}
```

#### Main Method

```typescript
async analyze(scriptFiles: ScriptFile[]): Promise<CrossFileAnalysisResult>
```

**Process**:
1. Parse script files into structured format
2. Sort by episode number
3. Run checks for each configured type
4. Filter by confidence threshold
5. Return findings with statistics

#### Default Implementation: DefaultCrossFileAnalyzer

Concrete implementation with 4 check methods:

1. **checkTimeline()**: Timeline consistency
   - Cross-episode chronological order
   - Within-episode reversals
   - Suspicious temporal gaps (>1 year)

2. **checkCharacter()**: Character consistency
   - Characters without introduction
   - Similar character names (60-95% similarity)
   - One-time characters

3. **checkPlot()**: Plot consistency
   - Unresolved plot threads
   - Plot contradictions
   - Missing setup/context

4. **checkSetting()**: Setting consistency
   - Contradictory location descriptions
   - Sudden location appearances
   - Inconsistent location usage
   - Similar location names (70-95% similarity)

---

### 2. CrossFileAdvisor

**File**: `lib/agents/cross-file-advisor.ts`

AI-powered advisor that generates resolution strategies for cross-file issues.

#### Key Interfaces

```typescript
// Single resolution solution
interface ResolutionSolution {
  name: string;
  steps: string[];
  outcome: string;
  impacts: string[];
  difficulty: 'simple' | 'medium' | 'complex';
  recommendation?: string;
}

// Complete resolution advice
interface ResolutionAdvice {
  findingId: string;
  findingType: CrossFileFindingType;
  analysis: string; // Root cause analysis
  solutions: ResolutionSolution[]; // 2-3 solutions
  recommendedSolutionIndex: number; // AI recommendation
  additionalContext?: {
    characterImpact?: string;
    plotImpact?: string;
    worldbuildingImpact?: string;
  };
}

// Script context for AI
interface ScriptContext {
  filename: string;
  episodeNumber: number | null;
  relevantScenes: string; // Scene content
}
```

#### Main Methods

```typescript
// Generate advice for single finding
async generateAdvice(
  finding: CrossFileFinding,
  scriptContexts: ScriptContext[]
): Promise<ResolutionAdvice>

// Batch generate advice
async generateBatchAdvice(
  findings: CrossFileFinding[],
  getScriptContexts: (finding: CrossFileFinding) => Promise<ScriptContext[]>
): Promise<ResolutionAdvice[]>

// Get recommended solution
getRecommendedSolution(advice: ResolutionAdvice): ResolutionSolution
```

#### Configuration

```typescript
interface CrossFileAdvisorConfig {
  maxTokens?: number; // Default: 2000
  temperature?: number; // Default: 0.7
  solutionCount?: number; // Default: 3
}
```

#### Prompts

**File**: `lib/agents/prompts/cross-file-advisor-prompts.ts`

Type-specific prompts:
- `buildTimelineResolutionPrompt()`: Timeline issues
- `buildCharacterResolutionPrompt()`: Character issues
- `buildPlotResolutionPrompt()`: Plot issues
- `buildSettingResolutionPrompt()`: Setting issues

**System Prompt**: Defines AI role as "资深多集剧本顾问" (senior multi-episode script consultant).

---

### 3. MultiFileAnalysisService

**File**: `lib/db/services/multi-file-analysis.service.ts`

Service layer for multi-file analysis operations.

#### Key Methods

```typescript
// Analyze entire project (internal + optional cross-file)
async analyzeProject(
  projectId: string,
  options?: MultiFileAnalysisOptions,
  progressCallback?: AnalysisProgressCallback
): Promise<{ batchResult: BatchAnalysisResult; reportId: string }>

// Analyze specific files
async analyzeFiles(
  projectId: string,
  fileIds: string[],
  options?: MultiFileAnalysisOptions
): Promise<{ batchResult: BatchAnalysisResult; reportId: string }>

// Run cross-file analysis only
async analyzeCrossFileIssues(
  projectId: string,
  config?: CrossFileCheckConfig
): Promise<{ findings: CrossFileFinding[]; reportId: string }>

// Get cross-file findings
async getCrossFileFindings(projectId: string): Promise<CrossFileFinding[]>

// Get grouped cross-file findings
async getGroupedCrossFileFindings(
  projectId: string
): Promise<Record<string, CrossFileFinding[]>>

// Get analysis status
async getAnalysisStatus(projectId: string): Promise<{
  totalFiles: number;
  analyzedFiles: number;
  pendingFiles: number;
  lastAnalyzedAt: Date | null;
  hasReport: boolean;
}>
```

#### Options

```typescript
interface MultiFileAnalysisOptions {
  maxParallel?: number; // Default: 3
  maxErrorsPerFile?: number; // Default: 50
  timeoutPerFile?: number; // Default: 60000ms
  continueOnError?: boolean; // Default: true
  forceReAnalysis?: boolean; // Default: false
  runCrossFileChecks?: boolean; // Default: false
  crossFileConfig?: CrossFileCheckConfig;
}
```

---

## API Reference

### 1. POST /api/v1/projects/[id]/analyze/cross-file

Run cross-file consistency analysis on a project.

**Request Body**:
```json
{
  "config": {
    "checkTypes": ["cross_file_timeline", "cross_file_character", "cross_file_plot", "cross_file_setting"],
    "minConfidence": 0.75,
    "maxFindingsPerType": 30,
    "useAI": false
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "projectId": "project-123",
    "reportId": "report-456",
    "findingsCount": 8,
    "findings": [
      {
        "id": "finding-001",
        "type": "cross_file_timeline",
        "severity": "high",
        "affectedFiles": [
          {
            "fileId": "file-1",
            "filename": "第1集.md",
            "episodeNumber": 1,
            "location": { "sceneId": "S10", "line": 450 }
          },
          {
            "fileId": "file-2",
            "filename": "第2集.md",
            "episodeNumber": 2,
            "location": { "sceneId": "S01", "line": 15 }
          }
        ],
        "description": "第2集.md开场时间（2024年3月1日）早于第1集.md结尾（2024年3月5日）",
        "suggestion": "将第2集开场时间调整为3月5日之后，或回溯第1集结尾时间",
        "confidence": 0.85,
        "evidence": [
          "第1集.md最后时间点：2024-03-05",
          "第2集.md开场时间点：2024-03-01"
        ]
      }
    ],
    "message": "发现 8 个跨文件一致性问题"
  }
}
```

**Errors**:
- `404`: Project not found
- `403`: Access forbidden
- `400`: Invalid config parameters

---

### 2. GET /api/v1/projects/[id]/cross-file-findings

Get cross-file findings for a project.

**Query Parameters**:
- `grouped` (boolean, optional): Return findings grouped by type

**Response (grouped=false)**:
```json
{
  "success": true,
  "data": {
    "projectId": "project-123",
    "grouped": false,
    "findings": [...], // CrossFileFinding[]
    "totalCount": 8
  }
}
```

**Response (grouped=true)**:
```json
{
  "success": true,
  "data": {
    "projectId": "project-123",
    "grouped": true,
    "findings": {
      "cross_file_timeline": [finding1, finding2],
      "cross_file_character": [finding3, finding4],
      "cross_file_plot": [finding5],
      "cross_file_setting": [finding6, finding7, finding8]
    },
    "totalCount": 8
  }
}
```

---

## Database Schema

### DiagnosticReport Updates

**Extended findings structure**:

```typescript
// DiagnosticReport.findings (JSON)
{
  "internalFindings": [
    {
      "id": "finding-001",
      "type": "character", // InternalFindingType
      "severity": "critical" | "warning" | "info",
      "fileId": "file-123",
      "filename": "第1集.md",
      "episodeNumber": 1,
      "location": { ... },
      "description": "...",
      "suggestion": "...",
      "confidence": 0.85,
      "evidence": [...]
    }
  ],
  "crossFileFindings": [
    {
      "id": "finding-002",
      "type": "cross_file_timeline", // CrossFileFindingType
      "severity": "high",
      "affectedFiles": [
        {
          "fileId": "file-1",
          "filename": "第1集.md",
          "episodeNumber": 1,
          "location": { ... }
        },
        {
          "fileId": "file-2",
          "filename": "第2集.md",
          "episodeNumber": 2,
          "location": { ... }
        }
      ],
      "description": "...",
      "suggestion": "...",
      "confidence": 0.85,
      "evidence": [...]
    }
  ],
  "summary": {
    "totalInternalErrors": 15,
    "totalCrossFileErrors": 8,
    "totalErrors": 23,
    "fileCount": 5,
    "bySeverity": {
      "critical": 5,
      "warning": 12,
      "info": 6
    },
    "byType": {
      "character": 3,
      "timeline": 2,
      "cross_file_timeline": 4,
      "cross_file_character": 2,
      ...
    }
  }
}
```

**New fields**:
- `crossFileErrorCount` (number): Count of cross-file findings
- `checkType` (enum): `'internal_only' | 'cross_file' | 'both'`
- `analyzedFileIds` (string[]): IDs of analyzed files

---

## Usage Guide

### 1. Run Full Analysis (Internal + Cross-File)

```typescript
import { multiFileAnalysisService } from '@/lib/db/services';

const result = await multiFileAnalysisService.analyzeProject(projectId, {
  runCrossFileChecks: true,
  crossFileConfig: {
    checkTypes: ['cross_file_timeline', 'cross_file_character'],
    minConfidence: 0.75,
    maxFindingsPerType: 30,
  },
  maxParallel: 3,
  continueOnError: true,
});

console.log(`Report ID: ${result.reportId}`);
console.log(`Total findings: ${result.batchResult.totalFindings}`);
```

### 2. Run Cross-File Analysis Only

```typescript
const { findings, reportId } = await multiFileAnalysisService.analyzeCrossFileIssues(
  projectId,
  {
    checkTypes: ['cross_file_timeline', 'cross_file_character'],
    minConfidence: 0.75,
  }
);

console.log(`Found ${findings.length} cross-file issues`);
```

### 3. Get Grouped Findings

```typescript
const grouped = await multiFileAnalysisService.getGroupedCrossFileFindings(projectId);

// {
//   cross_file_timeline: [finding1, finding2],
//   cross_file_character: [finding3],
//   cross_file_plot: [finding4, finding5],
//   cross_file_setting: [finding6, finding7]
// }

for (const [type, findings] of Object.entries(grouped)) {
  console.log(`${type}: ${findings.length} issues`);
}
```

### 4. Generate AI Resolution Strategies

```typescript
import { createCrossFileAdvisor } from '@/lib/agents/cross-file-advisor';

const advisor = createCrossFileAdvisor(process.env.DEEPSEEK_API_KEY!, {
  temperature: 0.7,
  maxTokens: 2000,
  solutionCount: 3,
});

const finding = findings[0]; // CrossFileFinding

// Get relevant scene contexts
const scriptContexts: ScriptContext[] = [
  {
    filename: '第1集.md',
    episodeNumber: 1,
    relevantScenes: '场景S10 (Line 450): 3月5日，张三终于到达目的地...',
  },
  {
    filename: '第2集.md',
    episodeNumber: 2,
    relevantScenes: '场景S01 (Line 15): 3月初，李四开始新旅程...',
  },
];

const advice = await advisor.generateAdvice(finding, scriptContexts);

console.log(`Analysis: ${advice.analysis}`);
console.log(`Solutions: ${advice.solutions.length}`);
console.log(`Recommended: Solution ${advice.recommendedSolutionIndex}`);

const recommendedSolution = advisor.getRecommendedSolution(advice);
console.log(`Steps: ${recommendedSolution.steps.join(', ')}`);
console.log(`Difficulty: ${recommendedSolution.difficulty}`);
```

### 5. Client-Side API Call

```typescript
// Run cross-file analysis
const runCrossFileAnalysis = async (projectId: string) => {
  const response = await fetch(`/api/v1/projects/${projectId}/analyze/cross-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: {
        checkTypes: ['cross_file_timeline', 'cross_file_character'],
        minConfidence: 0.75,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  const { data } = await response.json();
  return data.findings;
};

// Get grouped findings
const getGroupedFindings = async (projectId: string) => {
  const response = await fetch(
    `/api/v1/projects/${projectId}/cross-file-findings?grouped=true`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch findings: ${response.statusText}`);
  }

  const { data } = await response.json();
  return data.findings;
};
```

---

## Configuration

### Cross-File Check Types

```typescript
type CrossFileFindingType =
  | 'cross_file_timeline'
  | 'cross_file_character'
  | 'cross_file_plot'
  | 'cross_file_setting';
```

**Timeline** (`cross_file_timeline`):
- Chronological order violations
- Time reversals between episodes
- Suspicious temporal gaps

**Character** (`cross_file_character`):
- Missing character introductions
- Similar/conflicting character names
- One-time character appearances

**Plot** (`cross_file_plot`):
- Unresolved plot threads
- Plot contradictions
- Missing setup/context

**Setting** (`cross_file_setting`):
- Contradictory location descriptions
- Sudden location appearances
- Inconsistent location usage
- Similar location names

### Confidence Thresholds

- **0.9-1.0**: Explicit logic errors (timeline contradictions)
- **0.7-0.89**: Probable issues (missing setup)
- **0.5-0.69**: Possible issues (ambiguous)
- **0.3-0.49**: Uncertain (may be style choice)

**Recommended**: `minConfidence: 0.75`

### Similarity Thresholds

- **Character names**: 60-95% similarity (typo detection)
- **Location names**: 70-95% similarity (typo detection)
- **Plot descriptions**: 30% Jaccard similarity (related plots)

---

## Best Practices

### 1. Incremental Analysis

Run cross-file analysis **after** all single-file analyses are complete:

```typescript
// Step 1: Analyze all files individually
await multiFileAnalysisService.analyzeProject(projectId, {
  runCrossFileChecks: false, // Internal only
});

// Step 2: Run cross-file checks
await multiFileAnalysisService.analyzeCrossFileIssues(projectId, {
  minConfidence: 0.75,
});
```

### 2. Selective Check Types

Focus on specific issue types for faster analysis:

```typescript
// Only check timeline and character issues
await multiFileAnalysisService.analyzeCrossFileIssues(projectId, {
  checkTypes: ['cross_file_timeline', 'cross_file_character'],
});
```

### 3. Confidence Filtering

Adjust confidence threshold based on quality requirements:

```typescript
// High confidence only (strict)
config: { minConfidence: 0.85 }

// Balanced (recommended)
config: { minConfidence: 0.75 }

// Permissive (catch more potential issues)
config: { minConfidence: 0.60 }
```

### 4. Batch Processing

Use batch advice generation for multiple findings:

```typescript
const findings = await multiFileAnalysisService.getCrossFileFindings(projectId);

const advices = await advisor.generateBatchAdvice(findings, async (finding) => {
  // Retrieve relevant scene contexts for this finding
  return getScriptContextsForFinding(finding);
});
```

---

## Testing

### Unit Tests (TODO: T3.14)

**File**: `tests/unit/cross-file-analyzer.test.ts`

Test cases:
- Timeline check with chronological violations
- Character check with missing introductions
- Plot check with unresolved threads
- Setting check with contradictory descriptions
- Confidence filtering
- Config options (checkTypes, maxFindingsPerType)

### Integration Tests

**File**: `tests/integration/multi-file-analysis.test.ts`

Test scenarios:
- Full project analysis with cross-file checks
- API endpoint integration
- Database storage and retrieval
- Error handling

---

## Troubleshooting

### Issue: No cross-file findings detected

**Possible causes**:
1. Only 1 file in project (requires ≥2 files)
2. Confidence threshold too high
3. Check types not configured

**Solution**:
```typescript
// Lower confidence threshold
config: { minConfidence: 0.60 }

// Enable all check types
config: { checkTypes: undefined } // Uses default: all types
```

### Issue: Too many false positives

**Solution**:
```typescript
// Increase confidence threshold
config: { minConfidence: 0.85 }

// Limit findings per type
config: { maxFindingsPerType: 10 }
```

### Issue: AI advisor returns generic solutions

**Solution**:
- Provide more detailed `ScriptContext` with relevant scene content
- Ensure evidence array contains specific examples
- Use lower temperature for more focused responses

---

## Related Documentation

- [API Reference](./API_REFERENCE.md) - Complete V1 API documentation
- [Database Schema](./DATABASE_SCHEMA.md) - Prisma models and services
- [AI Agents](./AI_AGENTS.md) - All AI agents including CrossFileAdvisor
- [Testing Guide](./TESTING_GUIDE.md) - Testing patterns and conventions

---

**Version**: 1.0
**Last Updated**: 2025-11-05
**Maintainer**: AI Assistant

---

## Recent Updates (2025-11-09)

### Bug Fixes

**1. Cross-File Analysis Display Issue** ✅
- **Problem**: Page showed "Not yet analyzed" despite successful analysis
- **Root Cause**: Missing `analyzedFiles` field in `DiagnosticSummary`
- **Solution**: Added `analyzedFiles?: number` field and updated `calculateSummary()`
- **Files Modified**: 
  - `types/diagnostic-report.ts`
  - `lib/db/services/multi-file-analysis.service.ts`

**2. React Key Warning** ✅
- **Problem**: Console warning about missing unique `key` prop
- **Root Cause**: AI-returned findings lack `id` field
- **Solution**: Generate unique IDs in `runCrossFileAnalysis()` method
- **ID Format**: `cross-file-{timestamp}-{index}`
- **Files Modified**:
  - `lib/db/services/multi-file-analysis.service.ts`
  - `components/analysis/cross-file-findings-display.tsx`

**3. AI Analyzer Null Pointer Exception** ✅
- **Problem**: TypeError when accessing `jsonContent.metadata` on unconverted files
- **Root Cause**: No null filtering before AI analysis
- **Solution**: Filter `jsonContent !== null` in all 4 check methods
- **Files Modified**:
  - `lib/analysis/ai-cross-file-analyzer.ts` (4 methods updated)

### Data Structure Updates

**DiagnosticSummary Interface** (Updated):
```typescript
export interface DiagnosticSummary {
  totalFiles: number;
  analyzedFiles?: number;  // ✅ NEW: Number of successfully converted files
  totalInternalErrors: number;
  totalCrossFileErrors: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}
```

**CrossFileFinding Interface** (Updated):
```typescript
export interface CrossFileFinding {
  id: string;  // ✅ NOW REQUIRED: Format "cross-file-{timestamp}-{index}"
  type: 'cross_file_timeline' | 'cross_file_character' | 'cross_file_plot' | 'cross_file_setting';
  severity: 'high' | 'medium' | 'low';
  affectedFiles: Array<{
    fileId: string;
    filename: string;
    episodeNumber: number | null;
    location?: {
      sceneId?: string;
      line?: number;
    };
  }>;
  description: string;
  suggestion: string;
  confidence: number;
  evidence: string[];
}
```

### Best Practices

**When Implementing Cross-File Analysis**:

1. **Always Filter Null Values**:
   ```typescript
   const validScripts = scripts.filter(s => 
     s.jsonContent !== null && s.jsonContent !== undefined
   );
   ```

2. **Generate Unique IDs**:
   ```typescript
   const findingsWithIds = findings.map((finding, index) => ({
     ...finding,
     id: finding.id || `cross-file-${Date.now()}-${index}`
   }));
   ```

3. **Track Analyzed Files**:
   ```typescript
   const convertedFiles = files.filter(f => f.jsonContent !== null);
   summary: calculateSummary(findings, files.length, convertedFiles.length)
   ```

4. **Use Proper React Keys**:
   ```tsx
   {findings.map((finding) => (
     <Card key={finding.id}>  {/* Use unique id */}
       {/* Content */}
     </Card>
   ))}
   ```

### Testing Checklist

- [x] Page displays results when `analyzedFiles > 0`
- [x] No React key warnings in console
- [x] Analysis handles files with `jsonContent === null`
- [x] All findings have unique `id` field
- [x] UI correctly shows analyzed vs total files (e.g., "8/9 files analyzed")

### Related Documentation

- [Bug Fixes Reference](./BUG_FIXES.md) - Detailed troubleshooting guide
- [API Reference](./API_REFERENCE.md) - API endpoints documentation
- [Frontend Components](./FRONTEND_COMPONENTS.md) - UI components guide

