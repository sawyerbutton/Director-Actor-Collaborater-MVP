# AI Agents Reference

This document provides a reference for all AI agents in the ScriptAI system.

## Agent Overview

The system implements 6 specialized AI agents for script analysis and enhancement:

1. **ConsistencyGuardian** - ACT1 Logic Repair
2. **CharacterArchitect** - ACT2 Character Depth Creation
3. **RulesAuditor** - ACT3 Worldbuilding Enrichment
4. **PacingStrategist** - ACT4 Pacing Enhancement
5. **ThematicPolisher** - ACT5 Spiritual Depth
6. **RevisionExecutive** - Fix Generation & Validation

## 1. ConsistencyGuardian

**Purpose**: ACT1 - Quick Logic Repair (修Bug)

**Location**: `lib/agents/consistency-guardian.ts`

**Prompts**: `lib/agents/prompts/consistency-prompts.ts`

### Key Features
- Detects 5 logic error types:
  - Timeline inconsistencies
  - Character contradictions
  - Plot logic errors
  - Dialogue inconsistencies
  - Scene continuity issues
- Parallel chunk processing for large scripts
- Chinese language output
- Confidence scoring (30-100%)

### Critical Implementation Details
- Uses `analyzeScriptText()` method (NOT `analyzeScript()`) to avoid parser artifacts
- Direct text analysis - raw script content passed to AI
- Severity mapping: AI outputs 4 levels (critical/high/medium/low) → Database stores 3 levels (critical/warning/info)

### Methods
```typescript
analyzeScriptText(scriptText: string): Promise<DiagnosticReport>
```

### Output Format
```typescript
interface DiagnosticReport {
  findings: LogicError[];
  statistics: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}
```

## 2. CharacterArchitect

**Purpose**: ACT2 - Character Depth Creation (角色深度创作)

**Location**: `lib/agents/character-architect.ts`

**Prompts**: `lib/agents/prompts/character-architect-prompts.ts`

### Creative Enhancement Philosophy
- **NOT** error-fixing - focuses on deepening artistic quality
- Transforms flat characters → three-dimensional characters
- Emphasizes growth arcs and psychological complexity

### Prompt Chain (P4-P6)
1. **P4**: Analyze character growth potential (NOT contradiction fixing)
2. **P5**: Generate 2 creative development paths:
   - 渐进式 (Gradual progression)
   - 戏剧性 (Dramatic transformation)
3. **P6**: Execute "Show, Don't Tell" transformation

### Methods
```typescript
proposeCharacterEnhancement(params: {
  projectId: string;
  focusName: string;
  contradiction: string;
  scriptContext: string;
}): Promise<CharacterProposals>

executeProposal(params: {
  decisionId: string;
  proposalChoice: number;
  scriptContext: string;
}): Promise<DramaticActions>
```

### Output Format
```typescript
interface CharacterProposals {
  focusContext: {
    characterName: string;
    currentDescription: string;
    growthPotential: string;
  };
  proposals: Array<{
    id: number;
    type: 'gradual' | 'dramatic';
    approach: string;
    pros: string[];
    cons: string[];
  }>;
  recommendation: number;
}

interface DramaticActions {
  actions: Array<{
    sceneNumber: number;
    actionDescription: string;
    dialogueSuggestion: string;
    emotionalTone: string;
  }>;
  overallArc: string;
  integrationNotes: string;
}
```

## 3. RulesAuditor

**Purpose**: ACT3 - Worldbuilding Enrichment (世界观丰富化)

**Location**: `lib/agents/rules-auditor.ts`

**Prompts**: `lib/agents/prompts/rules-auditor-prompts.ts`

### Creative Enhancement Philosophy
- **NOT** auditing inconsistencies - focuses on enriching worldbuilding
- Transforms reasonable worldbuilding → compelling worldbuilding
- Emphasizes rich details and dramatic potential

### Prompt Chain (P7-P9)
1. **P7**: Analyze worldbuilding depth potential (NOT audit inconsistencies)
2. **P8**: Generate enrichment paths with dramatic ripple effects
3. **P9**: Execute setting-theme integration

### Methods
```typescript
proposeWorldbuildingEnhancement(params: {
  projectId: string;
  focusName: string;
  contradiction: string;
  scriptContext: string;
}): Promise<WorldbuildingProposals>

executeProposal(params: {
  decisionId: string;
  proposalChoice: number;
  scriptContext: string;
}): Promise<SettingThemeAlignment>
```

## 4. PacingStrategist

**Purpose**: ACT4 - Pacing Enhancement (节奏优化)

**Location**: `lib/agents/pacing-strategist.ts`

**Prompts**: `lib/agents/prompts/pacing-strategist-prompts.ts`

### Creative Enhancement Philosophy
- **NOT** identifying issues - focuses on enhancing dramatic tension
- Transforms smooth pacing → riveting pacing
- Emphasizes suspense, climax, emotional intensity

### Prompt Chain (P10-P11)
1. **P10**: Analyze pacing enhancement opportunities (NOT identify issues)
2. **P11**: Generate pacing enhancement strategies (suspense, climax, tension)

### Methods
```typescript
proposePacingEnhancement(params: {
  projectId: string;
  focusName: string;
  contradiction: string;
  scriptContext: string;
}): Promise<PacingProposals>

executeProposal(params: {
  decisionId: string;
  proposalChoice: number;
}): Promise<{ success: boolean }>
```

### Note
- Strategy is directly applied in execute (no additional AI call)

## 5. ThematicPolisher

**Purpose**: ACT5 - Spiritual Depth (精神深度)

**Location**: `lib/agents/thematic-polisher.ts`

**Prompts**: `lib/agents/prompts/thematic-polisher-prompts.ts`

### Creative Enhancement Philosophy
- **NOT** de-labeling generic traits - focuses on thematic resonance
- Transforms surface story → spiritual depth
- Emphasizes emotional penetration and empathy hooks

### Prompt Chain (P12-P13)
1. **P12**: Enhance character spiritual depth (NOT de-label generic traits)
2. **P13**: Define empathy core and thematic resonance (NOT fears/beliefs fixing)

### Methods
```typescript
proposeThematicEnhancement(params: {
  projectId: string;
  focusName: string;
  contradiction: string;
  scriptContext: string;
}): Promise<ThematicProposals>

executeProposal(params: {
  decisionId: string;
  proposalChoice: number;
  scriptContext: string;
}): Promise<CharacterCoreDefinition>
```

## Common Patterns Across ACT2-5 Agents

### Async Job Pattern
All ACT2-5 agents now use async job queue to avoid Vercel 10s timeout:

1. `proposeX()` creates ITERATION job → returns jobId immediately (< 1 second)
2. Client polls `GET /api/v1/iteration/jobs/[jobId]` every 5 seconds
3. Background processing (30-60 seconds) via WorkflowQueue
4. Agent uses dynamic imports for code splitting (Serverless optimization)
5. When COMPLETED, client retrieves proposals from job result
6. User reviews proposals in UI
7. `executeProposal()` runs synchronously (< 5 seconds)
8. RevisionDecision updated with userChoice and generatedChanges

### JSON Response Format
All agents use DeepSeek's `response_format: { type: 'json_object' }` for structured output.

### Validation
Each agent includes validation methods to ensure AI output matches expected schemas.

### Error Handling
- Timeout: 120 seconds (configured in `lib/agents/types.ts`)
- Retry logic for transient failures
- Comprehensive error logging

## Prompt Design Principles (ACT2-5)

### Positioning
- ❌ **Avoid**: "修复错误"、"解决矛盾"、"审计问题"、"识别缺陷"
- ✅ **Use**: "深化创作"、"丰富细节"、"增强张力"、"优化体验"、"精神共鸣"

### Tone
- Frame as **creative mentor** (创作导师), not bug fixer
- Focus on **artistic value** and **dramatic potential**, not correctness
- Emphasize **enhancement opportunities**, not problems

### Key Declaration
All ACT2-5 prompts must include:
```
重要：你不是在"修复错误"，而是在"深化创作"。即使逻辑一致，也可以通过增强使其更具艺术价值。
```

## Testing Agents

### Unit Tests
- Mock DeepSeekClient in all agent tests
- Use factory functions (e.g., `createCharacterArchitect()`) for mocking
- Return arrays not objects for proposals
- See `tests/unit/character-architect.test.ts` for reference

### Integration Tests
- Test complete propose → poll → execute workflow
- Use route handler pattern (NextRequest, no HTTP server needed)
- See `tests/integration/iteration-api-route-handlers.test.ts` for reference

## Related Files

### Types
- `lib/agents/types.ts` - Core type definitions
- `types/synthesis.ts` - Synthesis-specific types

### Services
- `lib/db/services/revision-decision.service.ts` - Decision persistence
- `lib/api/workflow-queue.ts` - Background job processing

### API Routes
- `app/api/v1/iteration/propose/route.ts` - Proposal generation (async job)
- `app/api/v1/iteration/jobs/[jobId]/route.ts` - Job status polling
- `app/api/v1/iteration/execute/route.ts` - Proposal execution

### Frontend Components
- `components/workspace/findings-selector.tsx` - ACT1 findings selection
- `components/workspace/proposal-comparison.tsx` - Proposal review UI
- `components/workspace/changes-display.tsx` - Changes visualization

## Performance Characteristics

### Processing Times
- **ACT1** (ConsistencyGuardian):
  - Small scripts (<1000 lines): 10-20 seconds
  - Medium scripts (1000-3000 lines): 30-60 seconds
  - Large scripts (3000-10000 lines): 2-5 minutes

- **ACT2-5** (Interactive Agents):
  - Proposal generation: 30-60 seconds (async job)
  - Proposal execution: < 5 seconds (synchronous)

### Timeout Configuration
- DeepSeek API timeout: 120 seconds
- Vercel endpoint timeout: 60 seconds (requires Pro Plan)
- Background job processing: No timeout (runs until completion)

## Debugging

### Common Issues

**Issue**: Jobs stuck in QUEUED/PROCESSING state
- **Solution**: Use `scripts/debug-act1-analysis.ts` to diagnose
- Check WorkflowQueue processing in Serverless mode
- Verify manual trigger endpoint called during polling

**Issue**: All confidence scores identical (e.g., 80%)
- **Solution**: Update prompt to require varied confidence based on error clarity

**Issue**: AI detects parser artifacts like "Location: undefined"
- **Solution**: Use `analyzeScriptText()` to analyze raw script (ACT1 only)

### Debug Tools
- `scripts/debug-act1-analysis.ts` - Diagnose stuck jobs
- Prisma Studio - Manual database inspection
- Server logs - Check DeepSeek API errors

## Version History

- **2025-10-11**: Added Free Creation Mode to all ACT2-5 agents
- **2025-10-10**: Refactored prompts to creative enhancement philosophy
- **2025-10-10**: Added async job queue for ACT2-5 propose endpoints
- **2025-10-09**: Implemented Serverless compatibility for WorkflowQueue
- **2025-10-02**: Fixed ACT1 severity mapping and confidence scoring
- **Epic 006**: Completed ACT3-5 agents (RulesAuditor, PacingStrategist, ThematicPolisher)
- **Epic 005**: Implemented CharacterArchitect with P4-P6 prompt chain
- **Epic 004**: Database migration and ConsistencyGuardian refactor
