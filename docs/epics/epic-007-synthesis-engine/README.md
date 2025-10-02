# Epic 007: Grand Synthesis Engine

## Epic Overview
**Epic ID:** EPIC-007
**Epic Name:** Script Synthesis & Version Management - Final Output Generation
**Priority:** P1 - Value Delivery
**Estimated Duration:** 2 weeks
**Dependencies:** Epics 004-006 (Complete five-act workflow)

## Epic Goal
Implement the intelligent synthesis system that merges all user decisions and AI-generated changes from the five acts into a cohesive final script (V2) with version comparison capabilities.

## Background & Context

### Current State (Post Epics 004-006)
- **Workflow:** All five acts operational with decisions tracked
- **Data:** Complete RevisionDecision records for each project
- **Agents:** Five specialized agents generating targeted changes
- **Storage:** Original script (V1) and all modifications stored
- **Output:** Individual changes exist but not integrated

### Target State
- **Workflow:** One-click synthesis of all approved changes
- **Data:** Intelligent conflict resolution and change merging
- **Agents:** Enhanced RevisionExecutive orchestrating synthesis
- **Storage:** Final script (V2) with complete audit trail
- **Output:** Cohesive, naturally integrated final script with diff view

## Technical Requirements

### Enhanced RevisionExecutive Agent
```typescript
interface RevisionExecutive {
  // Core synthesis orchestration
  synthesizeScript(
    originalScript: string,
    decisions: RevisionDecision[]
  ): Promise<{
    synthesizedScript: string;
    changeLog: ChangeEntry[];
    conflicts: ConflictReport[];
    confidence: number;
  }>;

  // Conflict detection and resolution
  detectConflicts(
    decisions: RevisionDecision[]
  ): Promise<{
    conflicts: Array<{
      type: 'character' | 'timeline' | 'setting' | 'plot';
      decision1: string;
      decision2: string;
      severity: 'high' | 'medium' | 'low';
      suggestedResolution: string;
    }>;
  }>;

  // Style preservation
  analyzeAndPreserveStyle(
    originalScript: string
  ): Promise<{
    styleProfile: {
      tone: string;
      vocabulary: string[];
      sentencePatterns: string[];
      dialogueStyle: string;
    };
  }>;

  // Change integration
  integrateChanges(
    script: string,
    changes: Change[],
    styleProfile: StyleProfile
  ): Promise<string>;
}
```

### Synthesis Prompt Construction
```typescript
interface SynthesisPromptBuilder {
  buildMasterPrompt(
    context: SynthesisContext
  ): {
    systemPrompt: string;
    scriptContext: string;
    changeInstructions: Array<{
      act: ActType;
      focus: string;
      changes: string[];
      priority: number;
    }>;
    styleGuidelines: string;
    conflictResolutions: string[];
  };

  // Chunking strategy for long scripts
  chunkScript(
    script: string,
    maxTokens: number
  ): Array<{
    chunk: string;
    overlaps: {
      previous: string;
      next: string;
    };
    affectedDecisions: string[];
  }>;
}
```

### Version Management System
```typescript
interface VersionManager {
  // Version creation
  createVersion(
    projectId: string,
    content: string,
    metadata: {
      synthesisLog: ChangeEntry[];
      decisionsApplied: string[];
      timestamp: Date;
    }
  ): Promise<ScriptVersion>;

  // Diff generation
  generateDiff(
    v1: string,
    v2: string
  ): Promise<{
    additions: DiffEntry[];
    deletions: DiffEntry[];
    modifications: DiffEntry[];
    stats: {
      linesAdded: number;
      linesDeleted: number;
      linesModified: number;
    };
  }>;

  // Export formats
  exportScript(
    version: ScriptVersion,
    format: 'txt' | 'md' | 'docx' | 'pdf'
  ): Promise<Buffer>;
}
```

### API Endpoints Required

#### Synthesis Operations
- `POST /api/v1/synthesize` - Trigger synthesis process
- `GET /api/v1/synthesize/:jobId/status` - Poll synthesis status
- `GET /api/v1/projects/:id/versions` - List all versions
- `GET /api/v1/versions/:id` - Get specific version
- `GET /api/v1/versions/:id/diff/:targetId` - Compare versions

#### Export Operations
- `POST /api/v1/export` - Export script in specified format
- `GET /api/v1/export/:jobId` - Download exported file

### Frontend Components
```typescript
interface SynthesisComponents {
  // Synthesis control panel
  SynthesisPanel: React.FC<{
    project: Project;
    decisions: RevisionDecision[];
    onSynthesize: () => void;
    onConfigureOptions: (options: SynthesisOptions) => void;
  }>;

  // Conflict resolution interface
  ConflictResolver: React.FC<{
    conflicts: Conflict[];
    onResolve: (resolutions: Resolution[]) => void;
    onSkip: () => void;
  }>;

  // Version comparison view
  VersionDiff: React.FC<{
    v1: ScriptVersion;
    v2: ScriptVersion;
    viewMode: 'unified' | 'split' | 'inline';
    onAccept: () => void;
    onReject: (reason: string) => void;
  }>;

  // Export options
  ExportDialog: React.FC<{
    version: ScriptVersion;
    formats: ExportFormat[];
    onExport: (format: ExportFormat) => void;
  }>;
}
```

## User Stories

### Story 1: Enhanced RevisionExecutive Implementation
**Points:** 13
**Priority:** P0
**Description:** Upgrade RevisionExecutive agent with intelligent synthesis capabilities including conflict detection, style preservation, and natural change integration.

**Acceptance Criteria:**
- [ ] Synthesis prompt builder handles all decision types
- [ ] Conflict detection identifies contradictions
- [ ] Style analysis preserves original voice
- [ ] Change integration appears natural
- [ ] Long scripts handled via chunking
- [ ] Confidence scoring implemented
- [ ] Error recovery for partial failures

### Story 2: Version Management & Diff System
**Points:** 8
**Priority:** P0
**Description:** Implement comprehensive version management with diff visualization and comparison capabilities.

**Acceptance Criteria:**
- [ ] Versions stored with complete metadata
- [ ] Diff algorithm accurately identifies changes
- [ ] Visual diff supports multiple view modes
- [ ] Line-by-line change tracking
- [ ] Statistics dashboard for changes
- [ ] Version rollback capability
- [ ] Change attribution to decisions

### Story 3: Export & Delivery System
**Points:** 5
**Priority:** P1
**Description:** Build multi-format export system for final scripts with formatting preservation.

**Acceptance Criteria:**
- [ ] Plain text export maintains formatting
- [ ] Markdown export with proper structure
- [ ] DOCX export with styles (using docx library)
- [ ] PDF generation (if feasible)
- [ ] Batch export of all versions
- [ ] Export includes change log
- [ ] Async export for large files

### Story 4: Unified Workspace Interface (Optional - Post-Synthesis)
**Points:** 8
**Priority:** P2 - UX Enhancement
**Description:** Evaluate need for and potentially implement a unified WorkspaceLayout page that integrates all five acts into a cohesive workspace interface.

**Context:**
Epic 005 delivered reusable UI components (ActProgressBar, FindingsSelector, ProposalComparison, ChangesDisplay) without a unified workspace page. This was intentionally deferred to avoid premature UI decisions before all agents were implemented.

**Pre-Implementation Assessment:**
Before implementing, evaluate the following:
1. **User Flow Analysis**: Review actual user behavior across Acts 1-5
   - Are users comfortable navigating between separate pages?
   - What are the most common navigation patterns?
   - Where do users experience friction?

2. **Component Integration Points**: Assess current integration
   - How well do existing components work in current pages?
   - Are there redundant navigation steps?
   - What interaction patterns emerge across all five acts?

3. **Technical Readiness**: Verify prerequisites
   - All five agents (ConsistencyGuardian, CharacterArchitect, RulesAuditor, PacingStrategist, ThematicPolisher) operational
   - Complete decision tracking across all acts
   - Performance acceptable with full workflow

**Decision Criteria:**
Implement WorkspaceLayout if:
- [ ] Users request unified interface in feedback
- [ ] Navigation between acts shows measurable friction
- [ ] Current page-per-act approach proves confusing
- [ ] Component reuse creates too much code duplication

Skip WorkspaceLayout if:
- [ ] Current multi-page approach works well
- [ ] Users prefer focused, single-act pages
- [ ] Development resources better spent on other features

**Acceptance Criteria (if implemented):**
- [ ] Single workspace page at `/workspace/[projectId]`
- [ ] ActProgressBar showing all five acts with status
- [ ] Context-sensitive component rendering based on current act
- [ ] Smooth transitions between acts without page reload
- [ ] State management (Zustand/Context) for workspace state
- [ ] Persistent user preferences (last viewed act, layout settings)
- [ ] Mobile-responsive design maintained
- [ ] Performance: < 2s page load, smooth act transitions

**Implementation Notes:**
```typescript
// Potential workspace route structure
app/workspace/[id]/page.tsx
  - ActProgressBar (always visible)
  - Dynamic content area based on currentAct:
    - ACT1: DiagnosticReport display
    - ACT2: FindingsSelector + ProposalComparison + ChangesDisplay
    - ACT3: RuleInconsistencyDisplay + proposals
    - ACT4: PacingTimeline + ConflictMap + proposals
    - ACT5: CharacterEvolution + proposals
  - Navigation controls
  - Progress persistence
```

**Alternative Approach:**
If WorkspaceLayout is not implemented, ensure current approach is optimized:
- [ ] Add "Next Act" / "Previous Act" navigation to existing pages
- [ ] Implement act progress indicator on all relevant pages
- [ ] Create breadcrumb navigation showing current position
- [ ] Add quick-jump menu for act navigation

## Success Metrics
- [ ] Synthesis completes in < 2 minutes for average script
- [ ] 95% of changes integrated without conflicts
- [ ] Style consistency score > 90%
- [ ] Zero data corruption in synthesis
- [ ] Diff accuracy 100% for changed lines
- [ ] Export success rate > 99%

## Risk Assessment

### High Risks
1. **Synthesis Coherence**
   - **Risk:** AI produces disjointed or conflicting integration
   - **Mitigation:** Multi-pass synthesis, validation checks
   - **Contingency:** Manual edit capability, partial synthesis

2. **Context Window Overflow**
   - **Risk:** Script + all changes exceed LLM limits
   - **Mitigation:** Smart chunking, change prioritization
   - **Contingency:** Incremental synthesis approach

### Medium Risks
1. **Performance Degradation**
   - **Risk:** Synthesis slow for complex scripts
   - **Mitigation:** Async processing, progress indicators
   - **Contingency:** Background job queue

2. **Style Drift**
   - **Risk:** Synthesized script loses original voice
   - **Mitigation:** Style profile enforcement
   - **Contingency:** Style adjustment controls

## Dependencies
- All previous epics completed
- All RevisionDecisions properly stored
- LLM API supports long context
- Frontend diff library selected (e.g., react-diff-viewer)
- Export libraries available (docx, pdf generators)

## Definition of Done

### Core Synthesis Features (Required)
- [ ] RevisionExecutive successfully synthesizes scripts
- [ ] Conflict detection and resolution working
- [ ] Version management system operational
- [ ] Diff visualization accurate and clear
- [ ] All export formats functional
- [ ] Performance benchmarks met
- [ ] End-to-end synthesis tested
- [ ] User documentation complete

### Workspace Interface Assessment (Required Evaluation, Optional Implementation)
- [ ] User flow analysis completed across all five acts
- [ ] Component integration assessment documented
- [ ] Decision documented: Implement WorkspaceLayout OR optimize current multi-page approach
- [ ] If WorkspaceLayout implemented: All Story 4 acceptance criteria met
- [ ] If multi-page approach retained: Navigation enhancements completed (breadcrumbs, act progress indicators, quick-jump menu)

## Technical Notes

### Synthesis Algorithm
```typescript
async function synthesizeScript(
  project: Project,
  decisions: RevisionDecision[]
): Promise<SynthesisResult> {
  // 1. Load original script
  const v1 = await loadScriptVersion(project.id, 1);

  // 2. Group decisions by act and focus
  const groupedDecisions = groupDecisionsByActAndFocus(decisions);

  // 3. Detect conflicts
  const conflicts = await detectConflicts(groupedDecisions);

  // 4. Resolve conflicts (auto or manual)
  const resolutions = await resolveConflicts(conflicts);

  // 5. Analyze style profile
  const styleProfile = await analyzeStyle(v1.content);

  // 6. Build synthesis prompt
  const prompt = buildSynthesisPrompt({
    original: v1.content,
    decisions: groupedDecisions,
    resolutions,
    styleProfile
  });

  // 7. Execute synthesis (may chunk)
  const synthesized = await executeSynthesis(prompt);

  // 8. Validate result
  const validation = await validateSynthesis(synthesized, decisions);

  // 9. Create version 2
  const v2 = await createVersion(project.id, synthesized, {
    decisionsApplied: decisions.map(d => d.id),
    synthesisLog: validation.changeLog
  });

  return { version: v2, validation };
}
```

### Conflict Resolution Matrix
```typescript
const conflictRules: ConflictRule[] = [
  {
    type: 'character_contradiction',
    detection: (d1, d2) => {
      return d1.focusName === d2.focusName &&
             contradicts(d1.generatedChanges, d2.generatedChanges);
    },
    resolution: 'latest_takes_precedence',
    severity: 'high'
  },
  {
    type: 'timeline_overlap',
    detection: (d1, d2) => {
      return overlapsInTime(d1.generatedChanges, d2.generatedChanges);
    },
    resolution: 'merge_if_compatible',
    severity: 'medium'
  },
  {
    type: 'setting_inconsistency',
    detection: (d1, d2) => {
      return affectsSameSetting(d1, d2) &&
             incompatibleChanges(d1.generatedChanges, d2.generatedChanges);
    },
    resolution: 'require_manual_review',
    severity: 'high'
  }
];
```

### Performance Optimization
- Cache style profiles per project
- Implement synthesis result caching
- Use streaming for large exports
- Parallelize conflict detection
- Progressive diff rendering

### Testing Strategy
```typescript
describe('Grand Synthesis Engine', () => {
  describe('Synthesis', () => {
    it('should integrate all approved changes');
    it('should maintain script coherence');
    it('should preserve original style');
    it('should handle conflicts gracefully');
  });

  describe('Version Management', () => {
    it('should track all versions');
    it('should generate accurate diffs');
    it('should support rollback');
  });

  describe('Export', () => {
    it('should export all supported formats');
    it('should preserve formatting');
    it('should handle large files');
  });
});
```

## Post-Epic Considerations

### Epic 005 Component Reuse
**Available Components from Epic 005 (Interactive Workflow Core):**
- `ActProgressBar` - Five-act progress visualization
- `FindingsSelector` - Act 1 diagnostic results selector
- `ProposalComparison` - Side-by-side proposal comparison
- `ChangesDisplay` - Dramatic actions/changes display

**Current Integration Status:**
These components are **standalone and reusable** but not yet integrated into a unified workspace. They can be used in:
- Current approach: Individual pages per act (e.g., `/analysis/[id]` for Act 1-2)
- Story 4 approach: Unified `/workspace/[id]` page (if implemented)

**Design Decision Rationale:**
Epic 005 intentionally deferred creating a unified workspace to:
1. Avoid premature UI architecture before all agents were implemented
2. Allow agent-specific interaction patterns to emerge naturally
3. Enable iterative UX improvements based on actual usage
4. Keep Epic 005 focused on core functionality (Agent + API + Components)

This decision is validated in Epic 007 Story 4, where a data-driven assessment determines the optimal UI approach.

### Future Enhancements
1. **AI Learning Loop**: Train on successful syntheses
2. **Collaborative Editing**: Multiple users on same project
3. **Template Library**: Reusable revision patterns
4. **Analytics Dashboard**: Insights on common changes
5. **API Access**: Third-party integration support
6. **Advanced Workspace Features** (if WorkspaceLayout is implemented):
   - Multi-project workspace switching
   - Side-by-side act comparison
   - Customizable workspace layouts
   - Keyboard shortcuts for power users

### Maintenance Requirements
- Regular prompt tuning based on results
- Performance monitoring and optimization
- Export format updates as standards evolve
- Backup and recovery procedures
- Usage analytics and optimization