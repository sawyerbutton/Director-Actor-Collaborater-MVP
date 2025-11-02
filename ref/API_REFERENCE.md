# API Reference

Complete reference for ScriptAI V1 API endpoints.

## Base URL

Development: `http://localhost:3000/api/v1`
Production: `https://your-domain.vercel.app/api/v1`

## Authentication

Current version uses demo-user (ID: `demo-user`) for all operations.
Future versions will implement proper authentication.

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Error Codes
- `VALIDATION_ERROR` - Invalid request parameters
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `TIMEOUT` - Operation timed out

## Project Endpoints

### Create Project

**POST** `/projects`

Creates a new project with script content.

**Request Body**:
```json
{
  "title": "My Script Title",
  "content": "剧本内容...",
  "userId": "demo-user"
}
```

**Validation**:
- `title`: 1-200 characters
- `content`: 500-10000 lines (.txt/.md/.markdown only)
- `userId`: Required

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "clxxxx...",
    "title": "My Script Title",
    "workflowStatus": "INITIALIZED",
    "content": "剧本内容...",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "userId": "demo-user"
  }
}
```

### List Projects

**GET** `/projects`

Lists all projects for current user.

**Query Parameters**:
- `userId`: User ID (default: "demo-user")

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "clxxxx...",
        "title": "My Script Title",
        "workflowStatus": "ACT1_COMPLETE",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### Get Project Details

**GET** `/projects/:id`

Retrieves single project with full details.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "clxxxx...",
    "title": "My Script Title",
    "content": "剧本内容...",
    "workflowStatus": "ITERATING",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "userId": "demo-user"
  }
}
```

### Get Project Status

**GET** `/projects/:id/status`

Retrieves workflow status for project.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "workflowStatus": "ACT1_COMPLETE",
    "canProceedToIteration": true
  }
}
```

### Apply ACT1 Repair

**POST** `/projects/:id/apply-act1-repair`

Applies ACT1 AI repair to project, creating V1 script version.

**Request Body**:
```json
{
  "repairedScript": "修复后的剧本内容...",
  "acceptedErrors": ["error-id-1", "error-id-2"],
  "metadata": {
    "repairTimestamp": "2025-01-01T00:00:00.000Z",
    "totalErrors": 10,
    "acceptedErrors": 2
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "projectId": "clxxxx...",
    "versionId": "clvxxx...",
    "workflowStatus": "ITERATING"
  }
}
```

**CRITICAL**: This endpoint ALWAYS returns JSON, never throws errors (Serverless compatibility).

## Analysis Endpoints

### Start ACT1 Analysis

**POST** `/analyze`

Starts ACT1 logic analysis job.

**Request Body**:
```json
{
  "projectId": "clxxxx...",
  "userId": "demo-user"
}
```

**Response** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "jobId": "cljxxx...",
    "status": "QUEUED"
  }
}
```

### Poll Job Status

**GET** `/analyze/jobs/:jobId`

Polls analysis job status.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "jobId": "cljxxx...",
    "status": "PROCESSING",
    "progress": 0.5,
    "error": null
  }
}
```

**Job Statuses**:
- `QUEUED` - Waiting to be processed
- `PROCESSING` - Currently running
- `COMPLETED` - Successfully finished
- `FAILED` - Error occurred

### Trigger Manual Processing

**POST** `/analyze/process`

Manually triggers job processing (Serverless compatibility).

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "processed": 1,
    "message": "Processed 1 job"
  }
}
```

### Get Diagnostic Report

**GET** `/projects/:id/report`

Retrieves ACT1 diagnostic report.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "findings": [
      {
        "id": "error-1",
        "type": "timeline",
        "severity": "critical",
        "title": "时间线矛盾",
        "description": "第3场和第5场之间存在时间线矛盾",
        "location": {
          "start": { "line": 10, "scene": 3 },
          "end": { "line": 25, "scene": 5 }
        },
        "confidence": 0.95,
        "suggestedFix": "建议修改第5场的时间设定"
      }
    ],
    "summary": {
      "totalErrors": 10,
      "highSeverity": 3,
      "mediumSeverity": 5,
      "lowSeverity": 2
    },
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
}
```

## Iteration Endpoints (ACT2-5)

### Generate Proposals (Async)

**POST** `/iteration/propose`

Generates AI proposals for selected focus area. **Returns jobId immediately (< 1 second)**.

**Request Body**:
```json
{
  "projectId": "clxxxx...",
  "act": "ACT2_CHARACTER",
  "focusName": "张三",
  "contradiction": "角色动机不清晰",
  "scriptContext": "相关剧本片段..."
}
```

**Act Types**:
- `ACT2_CHARACTER` - Character depth creation
- `ACT3_WORLDBUILDING` - Worldbuilding enrichment
- `ACT4_PACING` - Pacing enhancement
- `ACT5_THEME` - Spiritual depth

**Response** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "jobId": "cljxxx...",
    "status": "QUEUED"
  }
}
```

### Poll Iteration Job Status

**GET** `/iteration/jobs/:jobId`

Polls ITERATION job status. When COMPLETED, includes proposals in result.

**Response** (200 OK - PROCESSING):
```json
{
  "success": true,
  "data": {
    "jobId": "cljxxx...",
    "status": "PROCESSING",
    "progress": 0.5,
    "result": null,
    "error": null
  }
}
```

**Response** (200 OK - COMPLETED):
```json
{
  "success": true,
  "data": {
    "jobId": "cljxxx...",
    "status": "COMPLETED",
    "progress": 1.0,
    "result": {
      "decisionId": "cldxxx...",
      "focusContext": {
        "characterName": "张三",
        "currentDescription": "当前描述",
        "growthPotential": "成长潜力分析"
      },
      "proposals": [
        {
          "id": 0,
          "type": "gradual",
          "approach": "渐进式发展路径",
          "pros": ["优点1", "优点2"],
          "cons": ["缺点1"]
        },
        {
          "id": 1,
          "type": "dramatic",
          "approach": "戏剧性转变路径",
          "pros": ["优点1"],
          "cons": ["缺点1", "缺点2"]
        }
      ],
      "recommendation": 0
    },
    "error": null
  }
}
```

**Typical Processing Time**: 30-60 seconds

### Execute Proposal

**POST** `/iteration/execute`

Executes selected proposal and generates changes. **Synchronous (< 5 seconds)**.

**Request Body**:
```json
{
  "decisionId": "cldxxx...",
  "proposalChoice": 0
}
```

**Response** (200 OK - ACT2):
```json
{
  "success": true,
  "data": {
    "decisionId": "cldxxx...",
    "actions": [
      {
        "sceneNumber": 3,
        "actionDescription": "张三在会议上犹豫不决",
        "dialogueSuggestion": "\"我...我不确定这样做是否正确。\"",
        "emotionalTone": "焦虑、自我怀疑"
      }
    ],
    "overallArc": "从犹豫不决到坚定决策的成长",
    "integrationNotes": "建议在第3、5、7场分别展现"
  }
}
```

**Response** (200 OK - ACT3):
```json
{
  "success": true,
  "data": {
    "decisionId": "cldxxx...",
    "strategies": [
      {
        "targetScene": 5,
        "settingEnhancement": "丰富场景细节",
        "thematicAlignment": "与主题呼应"
      }
    ],
    "overallTheme": "科技与人性的冲突",
    "integrationNotes": "整合建议"
  }
}
```

**Response** (200 OK - ACT4):
```json
{
  "success": true,
  "data": {
    "decisionId": "cldxxx...",
    "success": true
  }
}
```

**Response** (200 OK - ACT5):
```json
{
  "success": true,
  "data": {
    "decisionId": "cldxxx...",
    "characterName": "张三",
    "coreFear": "失去控制",
    "coreDesire": "获得认可",
    "empathyHooks": ["童年阴影", "家庭压力"],
    "thematicResonance": "个人成长与社会期待的冲突"
  }
}
```

### List Decisions

**GET** `/projects/:id/decisions`

Lists all revision decisions for project.

**Query Parameters**:
- `act` (optional): Filter by act type (ACT2_CHARACTER, ACT3_WORLDBUILDING, etc.)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "decisions": [
      {
        "id": "cldxxx...",
        "projectId": "clxxxx...",
        "act": "ACT2_CHARACTER",
        "focusName": "张三",
        "contradiction": "角色动机不清晰",
        "proposals": [...],
        "userChoice": 0,
        "generatedChanges": {...},
        "createdAt": "2025-01-01T00:00:00.000Z",
        "executedAt": "2025-01-01T00:05:00.000Z"
      }
    ],
    "statistics": {
      "total": 15,
      "byAct": {
        "ACT2_CHARACTER": 4,
        "ACT3_WORLDBUILDING": 3,
        "ACT4_PACING": 5,
        "ACT5_THEME": 3
      },
      "executed": 12,
      "pending": 3
    }
  }
}
```

## Synthesis Endpoints (Epic 007)

### Trigger Synthesis

**POST** `/synthesize`

Triggers final script synthesis (V2 generation).

**Request Body**:
```json
{
  "projectId": "clxxxx...",
  "options": {
    "preserveOriginalStyle": true,
    "conflictResolution": "auto_reconcile",
    "changeIntegrationMode": "merge_all",
    "includeChangeLog": true,
    "validateCoherence": true
  }
}
```

**Conflict Resolution Strategies**:
- `latest_takes_precedence` - Newer decision wins
- `merge_compatible` - Merge if compatible
- `prioritize_by_severity` - Higher-priority act wins
- `auto_reconcile` - Automatically harmonize (recommended)
- `manual_review_required` - Flag for human review

**Response** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "jobId": "cljxxx...",
    "status": "QUEUED"
  }
}
```

### Poll Synthesis Status

**GET** `/synthesize/:jobId/status`

Polls synthesis job status with detailed progress.

**Response** (200 OK - PROCESSING):
```json
{
  "success": true,
  "data": {
    "jobId": "cljxxx...",
    "status": "PROCESSING",
    "progress": 0.4,
    "currentStep": "conflict_detection",
    "versionId": null
  }
}
```

**Synthesis Steps** (10 total):
1. `grouping` - Group decisions by act
2. `conflict_detection` - Detect contradictions
3. `conflict_resolution` - Resolve conflicts
4. `style_analysis` - Analyze original style
5. `prompt_building` - Build synthesis prompt
6. `chunking` - Split long scripts
7. `ai_generation` - Generate V2 script
8. `merging` - Merge chunks
9. `validation` - Validate coherence
10. `version_creation` - Save V2 version

**Response** (200 OK - COMPLETED):
```json
{
  "success": true,
  "data": {
    "jobId": "cljxxx...",
    "status": "COMPLETED",
    "progress": 1.0,
    "versionId": "clvxxx...",
    "confidence": 0.92
  }
}
```

**Typical Processing Time**:
- Small scripts (<1000 lines): 10-20 seconds
- Medium scripts (1000-3000 lines): 30-60 seconds
- Large scripts (3000-10000 lines): 2-5 minutes

### List Versions

**GET** `/projects/:id/versions`

Lists all script versions for project.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "id": "clvxxx...",
        "projectId": "clxxxx...",
        "versionNumber": "V1",
        "content": "剧本内容...",
        "changeLog": "ACT1修复完成",
        "createdAt": "2025-01-01T00:00:00.000Z"
      },
      {
        "id": "clvyyy...",
        "projectId": "clxxxx...",
        "versionNumber": "V2",
        "content": "合成后的剧本内容...",
        "changeLog": "应用15个决策: ACT2(4), ACT3(3), ACT4(5), ACT5(3)",
        "synthesisMetadata": {...},
        "confidenceScore": 0.92,
        "createdAt": "2025-01-01T01:00:00.000Z"
      }
    ]
  }
}
```

### Get Version Details

**GET** `/versions/:id`

Retrieves specific version with full metadata.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "clvxxx...",
    "projectId": "clxxxx...",
    "versionNumber": "V2",
    "content": "剧本内容...",
    "changeLog": "详细修改日志",
    "synthesisMetadata": {
      "decisionsApplied": 15,
      "conflictsDetected": 3,
      "conflictsResolved": 3,
      "styleProfile": {
        "tone": ["严肃", "紧张"],
        "vocabulary": ["关键词1", "关键词2"],
        "sentencePatterns": ["疑问句", "短句"],
        "dialogueStyle": {
          "formality": "mixed",
          "averageLength": 25,
          "commonPhrases": ["常用语1", "常用语2"]
        },
        "narrativeVoice": {
          "perspective": "第三人称",
          "tense": "过去时",
          "descriptiveLevel": "moderate"
        },
        "pacingProfile": {
          "averageSceneLength": 150,
          "actionDensity": 0.3,
          "dialogueRatio": 0.5
        }
      }
    },
    "confidenceScore": 0.92,
    "createdAt": "2025-01-01T01:00:00.000Z"
  }
}
```

### Compare Versions

**GET** `/versions/:id/diff/:targetId`

Compares two versions and returns differences.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "sourceVersion": "V1",
    "targetVersion": "V2",
    "additions": [
      {
        "lineNumber": 25,
        "content": "新增的对话或场景",
        "context": "周围内容"
      }
    ],
    "deletions": [
      {
        "lineNumber": 30,
        "content": "删除的内容",
        "context": "周围内容"
      }
    ],
    "modifications": [
      {
        "lineNumber": 40,
        "before": "修改前",
        "after": "修改后",
        "context": "周围内容"
      }
    ],
    "statistics": {
      "totalChanges": 45,
      "additions": 15,
      "deletions": 10,
      "modifications": 20,
      "affectedScenes": [3, 5, 7, 10],
      "affectedCharacters": ["张三", "李四"]
    }
  }
}
```

## Export Endpoints

### Trigger Export

**POST** `/export`

Triggers script export job.

**Request Body**:
```json
{
  "versionId": "clvxxx...",
  "format": "TXT",
  "includeMetadata": true
}
```

**Export Formats**:
- `TXT` - Plain text
- `MD` - Markdown
- `DOCX` - Microsoft Word (future)

**Response** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "jobId": "cljxxx...",
    "status": "QUEUED"
  }
}
```

### Download Exported File

**GET** `/export/:jobId`

Downloads exported file when ready.

**Response** (200 OK):
- Content-Type: `text/plain`, `text/markdown`, or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `attachment; filename="script-v2.txt"`

## Rate Limiting

### Development
- 100 requests/minute (or disabled with `DISABLE_RATE_LIMIT=true`)

### Production
- 10 requests/minute per user
- Returns 429 Too Many Requests when exceeded

## Timeout Configuration

### DeepSeek API
- Timeout: 120 seconds
- Configured in `lib/api/deepseek/client.ts`

### Vercel Endpoints
- Timeout: 60 seconds (requires Pro Plan)
- Configured in `vercel.json` for AI endpoints

### Background Jobs
- No timeout (runs until completion)
- Processed by WorkflowQueue

## Serverless Compatibility

All endpoints are compatible with Serverless environments (Vercel, AWS Lambda):

1. **No background processing**: Uses async job queue pattern
2. **Manual triggers**: Frontend calls `/analyze/process` to trigger job execution
3. **Active polling**: Client polls status every 5 seconds
4. **Always JSON**: All endpoints return JSON (never throw errors)

## Error Handling Pattern

**CRITICAL**: All API routes ALWAYS return JSON, never throw errors.

```typescript
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    try {
      // Business logic
      return NextResponse.json(createApiResponse(data), { status: 200 });
    } catch (error) {
      // ✅ ALWAYS return JSON, NEVER throw
      console.error('[Operation] Error:', error);
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', errorMessage, errorDetails),
        { status: 500 }
      );
    }
  });
}
```

## Related Documentation

- **Agent Details**: See `ref/AI_AGENTS.md`
- **Database Schema**: See `ref/DATABASE_SCHEMA.md`
- **Workflow Guide**: See `docs/ai-analysis-repair-workflow.md`
- **Testing**: See `docs/COMPREHENSIVE_TESTING_STRATEGY.md`
