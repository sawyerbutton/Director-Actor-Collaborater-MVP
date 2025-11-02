# Workflow Reference

Complete reference for ScriptAI five-act workflow system.

## Workflow Overview

ScriptAI implements a differentiated two-phase workflow:

### Phase 1: ACT1 - Quick Logic Repair (修Bug)
- **Focus**: Fix objective logical errors
- **Speed**: 5-10 minutes for most scripts
- **Output**: V1 script with logical consistency
- **User Decision**: Use repaired script directly OR continue to creative enhancement

### Phase 2: ACT2-5 - Creative Enhancement (创作升级)
- **Focus**: Deepen artistic quality beyond logical correctness
- **Value**: Transform good scripts into great scripts
- **Output**: V2+ scripts with progressive artistic enhancement

## Workflow State Machine

### WorkflowStatus Enum
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

### State Transitions
```
INITIALIZED → ACT1_RUNNING → ACT1_COMPLETE → ITERATING → SYNTHESIZING → COMPLETED
```

**Transitions**:
1. `INITIALIZED → ACT1_RUNNING`: When `POST /api/v1/analyze` is called
2. `ACT1_RUNNING → ACT1_COMPLETE`: When ConsistencyGuardian completes analysis
3. `ACT1_COMPLETE → ITERATING`: When `POST /api/v1/projects/:id/apply-act1-repair` is called
4. `ITERATING → SYNTHESIZING`: When `POST /api/v1/synthesize` is called
5. `SYNTHESIZING → COMPLETED`: When SynthesisEngine completes V2 generation

## ACT1: Logic Repair

### Purpose
Quick detection and repair of 5 objective logic error types:
1. **Timeline**: Contradictions in temporal sequence
2. **Character**: Character trait inconsistencies
3. **Plot**: Logical plot holes
4. **Dialogue**: Dialogue contradictions
5. **Scene**: Scene continuity issues

### Agent
**ConsistencyGuardian** (`lib/agents/consistency-guardian.ts`)

### Process Flow

```
1. User uploads script (500-10000 lines)
   ↓
2. POST /api/v1/projects → Creates project (INITIALIZED)
   ↓
3. POST /api/v1/analyze → Creates ACT1_ANALYSIS job (ACT1_RUNNING)
   ↓
4. WorkflowQueue processes job:
   - ConsistencyGuardian.analyzeScriptText()
   - Detects errors with confidence scores
   - Creates DiagnosticReport
   ↓
5. Job status → COMPLETED (ACT1_COMPLETE)
   ↓
6. Frontend displays diagnostic report
   ↓
7. User reviews findings and decides:
   Option A: Accept AI repair → Continue to ACT2-5
   Option B: Manual repair → Export and done
```

### Output Structure

**DiagnosticReport**:
```typescript
{
  findings: [
    {
      id: "error-1",
      type: "timeline",
      severity: "critical",
      title: "时间线矛盾",
      description: "第3场和第5场之间存在时间线矛盾",
      location: {
        start: { line: 10, scene: 3 },
        end: { line: 25, scene: 5 }
      },
      confidence: 0.95,
      suggestedFix: "建议修改第5场的时间设定"
    }
  ],
  summary: {
    totalErrors: 10,
    highSeverity: 3,
    mediumSeverity: 5,
    lowSeverity: 2
  },
  statistics: {
    total: 10,
    byType: { timeline: 3, character: 4, plot: 2, dialogue: 1, scene: 0 },
    bySeverity: { critical: 3, warning: 5, info: 2 }
  }
}
```

### Performance
- **Small scripts** (<1000 lines): 10-20 seconds
- **Medium scripts** (1000-3000 lines): 30-60 seconds
- **Large scripts** (3000-10000 lines): 2-5 minutes

## ACT2: Character Depth Creation

### Purpose
Transform flat characters → three-dimensional characters with growth arcs and psychological complexity.

**NOT** error-fixing - focuses on deepening artistic quality.

### Agent
**CharacterArchitect** (`lib/agents/character-architect.ts`)

### Prompt Chain (P4-P6)

**P4: Analyze Growth Potential**
- Input: Character name, current description, script context
- Output: Growth potential analysis (NOT contradiction fixing)
- Focus: Artistic development opportunities

**P5: Generate Development Paths**
- Input: Growth potential from P4
- Output: 2 creative proposals:
  - **渐进式 (Gradual)**: Subtle, layered progression
  - **戏剧性 (Dramatic)**: Bold, transformative arc
- Each with pros, cons, and recommendation

**P6: Execute "Show, Don't Tell"**
- Input: Selected proposal from P5
- Output: Dramatic actions for specific scenes
- Format: Scene number, action description, dialogue suggestion, emotional tone

### Process Flow

```
1. User selects character contradiction from ACT1 OR enters manual focus
   ↓
2. POST /api/v1/iteration/propose → Creates ITERATION job
   - Act: ACT2_CHARACTER
   - Focus: Character name
   - Contradiction: Problem description
   ↓
3. WorkflowQueue processes job (30-60s):
   - CharacterArchitect.proposeCharacterEnhancement()
   - P4: Analyze growth potential
   - P5: Generate 2 proposals
   - Creates RevisionDecision with proposals
   ↓
4. Job status → COMPLETED with proposals in result
   ↓
5. Frontend displays proposals in ProposalComparison
   ↓
6. User selects proposal (0 or 1)
   ↓
7. POST /api/v1/iteration/execute → Synchronous (< 5s)
   - CharacterArchitect.executeProposal()
   - P6: Generate dramatic actions
   - Updates RevisionDecision with generatedChanges
   - Creates ScriptVersion with incremental changes
```

### Output Structure

**Proposals**:
```typescript
{
  focusContext: {
    characterName: "张三",
    currentDescription: "当前角色描述",
    growthPotential: "成长潜力分析"
  },
  proposals: [
    {
      id: 0,
      type: "gradual",
      approach: "渐进式发展路径描述",
      pros: ["优点1", "优点2", "优点3"],
      cons: ["缺点1"]
    },
    {
      id: 1,
      type: "dramatic",
      approach: "戏剧性转变路径描述",
      pros: ["优点1", "优点2"],
      cons: ["缺点1", "缺点2"]
    }
  ],
  recommendation: 0
}
```

**Generated Changes**:
```typescript
{
  actions: [
    {
      sceneNumber: 3,
      actionDescription: "张三在会议上犹豫不决",
      dialogueSuggestion: "\"我...我不确定这样做是否正确。\"",
      emotionalTone: "焦虑、自我怀疑"
    }
  ],
  overallArc: "从犹豫不决到坚定决策的成长弧线",
  integrationNotes: "建议在第3、5、7场分别展现这一成长过程"
}
```

## ACT3: Worldbuilding Enrichment

### Purpose
Transform reasonable worldbuilding → compelling worldbuilding with rich details and dramatic potential.

**NOT** auditing inconsistencies - focuses on enriching setting and theme.

### Agent
**RulesAuditor** (`lib/agents/rules-auditor.ts`)

### Prompt Chain (P7-P9)

**P7: Analyze Depth Potential**
- Input: Scene/setting description, script context
- Output: Worldbuilding depth analysis (NOT audit inconsistencies)
- Focus: Enhancement opportunities

**P8: Generate Enrichment Paths**
- Input: Depth analysis from P7
- Output: Multiple enrichment options with dramatic ripple effects
- Format: Setting enhancement + plot implications

**P9: Execute Setting-Theme Integration**
- Input: Selected enrichment path from P8
- Output: Thematic alignment strategies
- Format: Target scene, enhancement description, theme connection

### Process Flow

Similar to ACT2, but with worldbuilding focus:
```
Propose (async 30-60s) → Poll → Display → Select → Execute (sync < 5s)
```

### Output Structure

**Proposals**:
```typescript
{
  focusContext: {
    sceneName: "第5场",
    currentSetting: "当前场景描述",
    depthPotential: "深度潜力分析"
  },
  proposals: [
    {
      id: 0,
      enrichment: "丰富化方案描述",
      dramaticRipples: ["影响1", "影响2"],
      pros: ["优点1"],
      cons: ["缺点1"]
    }
  ],
  recommendation: 0
}
```

**Generated Changes**:
```typescript
{
  strategies: [
    {
      targetScene: 5,
      settingEnhancement: "场景丰富化描述",
      thematicAlignment: "与主题的呼应"
    }
  ],
  overallTheme: "科技与人性的冲突",
  integrationNotes: "整合建议"
}
```

## ACT4: Pacing Enhancement

### Purpose
Transform smooth pacing → riveting pacing with suspense, climax, and dramatic tension.

**NOT** identifying issues - focuses on enhancing dramatic impact.

### Agent
**PacingStrategist** (`lib/agents/pacing-strategist.ts`)

### Prompt Chain (P10-P11)

**P10: Analyze Enhancement Opportunities**
- Input: Timeline issue or manual focus, script context
- Output: Pacing enhancement opportunities (NOT identify issues)
- Focus: Dramatic potential

**P11: Generate Enhancement Strategies**
- Input: Enhancement opportunities from P10
- Output: Multiple pacing strategies (suspense, climax, tension)
- Format: Strategy description with scene restructure plan

### Process Flow

Similar to ACT2/3, but strategy is directly applied in execute (no additional AI call).

### Output Structure

**Proposals**:
```typescript
{
  focusContext: {
    timelineIssue: "时间线描述",
    enhancementOpportunity: "优化机会分析"
  },
  proposals: [
    {
      id: 0,
      strategy: "节奏优化策略描述",
      impact: "影响分析",
      pros: ["优点1"],
      cons: ["缺点1"]
    }
  ],
  recommendation: 0
}
```

**Generated Changes**:
```typescript
{
  success: true
}
```
(Strategy already embedded in proposal, no additional generation needed)

## ACT5: Spiritual Depth

### Purpose
Transform surface story → spiritual depth with thematic resonance and emotional penetration.

**NOT** de-labeling generic traits - focuses on empathy hooks and thematic core.

### Agent
**ThematicPolisher** (`lib/agents/thematic-polisher.ts`)

### Prompt Chain (P12-P13)

**P12: Enhance Spiritual Depth**
- Input: Character name, current traits, script context
- Output: Enhanced character profile (NOT de-label generic traits)
- Focus: Emotional complexity

**P13: Define Empathy Core**
- Input: Enhanced profile from P12
- Output: Character core definition (fears, beliefs, empathy hooks)
- Format: Core fear, core desire, empathy hooks, thematic resonance

### Process Flow

Similar to ACT2/3/4.

### Output Structure

**Proposals**:
```typescript
{
  focusContext: {
    characterName: "张三",
    currentTraits: "当前特征",
    spiritualPotential: "精神深度潜力"
  },
  proposals: [
    {
      id: 0,
      enhancedProfile: "深化后的角色画像",
      emotionalComplexity: "情感复杂性分析",
      pros: ["优点1"],
      cons: ["缺点1"]
    }
  ],
  recommendation: 0
}
```

**Generated Changes**:
```typescript
{
  characterName: "张三",
  coreFear: "失去控制",
  coreDesire: "获得认可",
  empathyHooks: ["童年阴影", "家庭压力", "职业困境"],
  thematicResonance: "个人成长与社会期待的冲突"
}
```

## Free Creation Mode (NEW 2025-10-11)

### Purpose
Enable independent ACT2-5 use without ACT1 findings dependency.

### When to Use
- No relevant ACT1 findings for current act
- User wants to explore creative enhancements independently
- Starting with clean script (no logical errors)

### How It Works

**Interface**:
- Text input for `focusName` (character, scene, theme)
- Text input for `contradiction` (creative focus description)
- Same workflow as ACT1-based iteration

**Example**:
```
Act: ACT2_CHARACTER
Focus Name: "李四" (manual input)
Contradiction: "希望探索这个角色的内心冲突" (manual input)
```

**Backend**:
- Same API endpoints (`/propose`, `/execute`)
- Same agent logic (CharacterArchitect, etc.)
- No validation against ACT1 findings

## Synthesis: Final Integration

### Purpose
Merge all ACT1-5 decisions into final V2 script with:
- Conflict detection and resolution
- Original style preservation
- Comprehensive change log
- Confidence scoring

### Engine
**SynthesisEngine** (`lib/synthesis/synthesis-engine.ts`)

### Process Flow

```
1. User clicks "生成最终剧本 (N)" (N = decisions count)
   ↓
2. Configuration dialog:
   - Preserve original style (6-dimensional analysis)
   - Conflict resolution strategy (auto_reconcile recommended)
   - Include change log
   - Validate coherence
   ↓
3. POST /api/v1/synthesize → Creates SYNTHESIS job
   ↓
4. SynthesisEngine.synthesize() - 10 steps:
   Step 1: Group decisions by act and focus
   Step 2: Detect conflicts (6 types)
   Step 3: Resolve conflicts (auto or manual)
   Step 4: Analyze original style (6 dimensions)
   Step 5: Build synthesis prompt with style guidelines
   Step 6: Chunk script if > 6000 tokens (500-token overlap)
   Step 7: Generate V2 via DeepSeek API
   Step 8: Merge chunks (if chunked)
   Step 9: Validate coherence and style
   Step 10: Create ScriptVersion V2 with metadata
   ↓
5. Job status → COMPLETED with versionId
   ↓
6. Frontend displays V2 in 3 tabs:
   - 最终剧本 (V2): Full synthesized script
   - 修改日志: Detailed change log
   - 版本对比: V1 vs V2 side-by-side
```

### Conflict Detection (6 Types)

1. **character_contradiction**: ACT2 vs ACT5 character changes
2. **timeline_overlap**: ACT4 pacing vs other acts on same scenes
3. **setting_inconsistency**: ACT3 worldbuilding vs character/pacing
4. **plot_conflict**: ACT2 character arc vs ACT4 pacing restructure
5. **dialogue_mismatch**: Dialogue inconsistencies across acts
6. **theme_divergence**: ACT5 theme vs other acts

### Conflict Resolution Strategies

- **latest_takes_precedence**: Newer decision wins (when compatible)
- **merge_compatible**: Merge both decisions if compatible
- **prioritize_by_severity**: Higher-priority act wins (ACT2 > ACT3 > ACT4 > ACT5)
- **auto_reconcile**: Automatically harmonize minor conflicts (recommended)
- **manual_review_required**: Flag for human review (critical conflicts)

**Auto-Resolution Rate**: ~98% of conflicts resolved automatically

### Style Preservation (6 Dimensions)

1. **Tone**: 严肃/幽默/悲伤/欢快/紧张/温馨 (keyword frequency)
2. **Vocabulary**: Top 100 frequently used words (excluding stop words)
3. **Sentence Patterns**: Top 20 patterns (疑问句/感叹句/祈使句/条件句/因果句/短句/中等句/长句)
4. **Dialogue Style**: Formality (formal/casual/mixed), average length, common phrases
5. **Narrative Voice**: Perspective (第一人称/第三人称/混合), tense (现在时/过去时/混合), descriptive level (minimal/moderate/rich)
6. **Pacing Profile**: Average scene length, action density, dialogue ratio, description ratio

### Confidence Scoring

**Base Score**: 1.0

**Penalties**:
- Unresolved conflicts: -0.1 per conflict
- Low style similarity: -0.05 to -0.2
- Validation failures: -0.1 per failure

**Bonuses**:
- High decision quality: +0.05 to +0.1
- Rich style analysis: +0.05
- All conflicts resolved: +0.05

**Typical Range**: 0.85 - 0.95

### Performance

**Processing Time**:
- Small scripts (<1000 lines): 10-20 seconds
- Medium scripts (1000-3000 lines): 30-60 seconds
- Large scripts (3000-10000 lines): 2-5 minutes

**Chunking**:
- Triggered for scripts > 6000 tokens (~9000 Chinese characters)
- Max chunk size: 6000 tokens
- Overlap: 500 tokens between chunks
- Scene boundary awareness

## Complete Workflow Example

### Scenario: 3000-line screenplay

**Total Time**: ~15 minutes

```
1. Upload (Dashboard)
   - Upload script.txt (3000 lines)
   - Click "开始AI分析"
   Duration: < 1 minute

2. ACT1 Analysis
   - ConsistencyGuardian analyzes script
   - Detects 15 errors (5 character, 4 plot, 3 timeline, 2 dialogue, 1 scene)
   Duration: ~60 seconds

3. Review Findings (Analysis Page)
   - Review 15 errors with descriptions and suggested fixes
   - Click "进入迭代工作区"
   Duration: ~2 minutes (user review)

4. ACT2 - Character (Iteration Page)
   - Select ACT2 from progress bar
   - Select character contradiction: "张三动机不清晰"
   - Propose → Wait 40s → Review 2 proposals
   - Select "渐进式发展" proposal
   - Execute → Get 5 dramatic actions
   Duration: ~3 minutes (including user review)

5. ACT3 - Worldbuilding
   - Select ACT3
   - Select scene issue: "第5场设定不够丰富"
   - Propose → Wait 45s → Review enrichment options
   - Select worldbuilding enhancement
   - Execute → Get setting-theme strategies
   Duration: ~3 minutes

6. ACT4 - Pacing
   - Select ACT4
   - Select timeline issue: "中段节奏平缓"
   - Propose → Wait 35s → Review pacing strategies
   - Select suspense enhancement strategy
   - Execute → Strategy applied
   Duration: ~2 minutes

7. ACT5 - Theme
   - Select ACT5
   - Select character: "张三"
   - Propose → Wait 40s → Review enhanced profile
   - Select spiritual depth option
   - Execute → Get character core definition
   Duration: ~3 minutes

8. Synthesis (Synthesis Page)
   - Click "生成最终剧本 (4)" (4 decisions)
   - Configure: Preserve style, auto_reconcile, change log, validate
   - Start synthesis → Monitor 10-step progress
   - Wait 50 seconds → V2 complete
   Duration: ~2 minutes

9. Review V2
   - Read V2 script in "最终剧本" tab
   - Check change log in "修改日志" tab
   - Compare V1 vs V2 in "版本对比" tab
   - Export as TXT
   Duration: ~5 minutes (user review)
```

## Decision History & Analytics

### View All Decisions
```
GET /api/v1/projects/:id/decisions
```

Returns:
- All decisions for project
- Statistics by act (total, byAct, executed, pending)
- Execution timeline

### Filter by Act
```
GET /api/v1/projects/:id/decisions?act=ACT2_CHARACTER
```

Returns only ACT2 character decisions.

## Version Management

### Version Lifecycle

1. **V0**: Original uploaded script (Project.content)
2. **V1**: ACT1 repaired script (ScriptVersion created via `/apply-act1-repair`)
3. **V2+**: Incremental versions from ACT2-5 decisions (optional)
4. **V2 (Synthesis)**: Final synthesized script (ScriptVersion created via `/synthesize`)

### Version Comparison
```
GET /api/v1/versions/:v2Id/diff/:v1Id
```

Returns:
- Additions, deletions, modifications
- Affected scenes and characters
- Change statistics

## Best Practices

### For Users

1. **ACT1**: Review all findings carefully, understand each error
2. **ACT2-5**: Start with character (ACT2), then worldbuilding (ACT3), pacing (ACT4), theme (ACT5)
3. **Proposals**: Read pros/cons carefully, consider screenplay goals
4. **Synthesis**: Always preserve original style, use auto_reconcile for first try
5. **Review**: Compare V1 and V2 thoroughly before exporting

### For Developers

1. **Always** use async job pattern for AI operations (ACT1, ACT2-5 propose, synthesis)
2. **Never** throw errors in API handlers (always return JSON)
3. **Always** poll with manual trigger in Serverless mode
4. **Always** validate input with Zod schemas
5. **Always** log comprehensively for debugging

## Troubleshooting

### Jobs Stuck in QUEUED
- Check WorkflowQueue processing
- Verify manual trigger endpoint called
- Use `scripts/debug-act1-analysis.ts`

### Proposals Not Matching Act
- Verify act-specific filtering in FindingsSelector
- Check act parameter in API calls

### Synthesis Failing
- Check decision count (need at least 1 decision)
- Verify no critical conflicts
- Review style analysis results

### Low Confidence Score
- Review conflict resolution results
- Check style preservation accuracy
- Validate coherence manually

## Related Documentation

- **AI Agents**: See `ref/AI_AGENTS.md`
- **API Reference**: See `ref/API_REFERENCE.md`
- **Database Schema**: See `ref/DATABASE_SCHEMA.md`
- **Main Workflow Guide**: See `docs/ai-analysis-repair-workflow.md`
- **Plan B Implementation**: See `docs/PLAN_B_IMPLEMENTATION.md`
