# Epic 006: Multi-Act Agent System

## Epic Overview
**Epic ID:** EPIC-006
**Epic Name:** Specialized Agent Implementation - Acts 3-5 Workflow Completion
**Priority:** P1 - Feature Completion
**Estimated Duration:** 2-3 weeks
**Dependencies:** Epic 005 (Interactive Workflow Core)

## Epic Goal
Complete the five-act transformation by implementing specialized agents for worldbuilding audit (Act 3), pacing optimization (Act 4), and thematic polish (Act 5), enabling full interactive script refinement.

## Background & Context

### Current State (Post Epic 005)
- **Architecture:** Interactive iteration APIs established
- **Workflow:** Acts 1-2 fully functional with decision tracking
- **User Experience:** Proven interaction pattern for proposals/decisions
- **Agent System:** ConsistencyGuardian (Act 1), CharacterArchitect (Act 2)
- **Decision Storage:** RevisionDecision model tracking all choices

### Target State
- **Architecture:** Complete five-act workflow system
- **Workflow:** All five acts available for comprehensive script analysis
- **User Experience:** Seamless navigation through all analysis phases
- **Agent System:** Five specialized agents covering all aspects
- **Decision Storage:** Complete decision history for synthesis

## Technical Requirements

### Agent Implementations Required

#### RulesAuditor Agent (Act 3 - P7-P9)
```typescript
interface RulesAuditor {
  // P7: Core setting logic audit
  auditWorldRules(
    setting: string,
    scriptContent: string
  ): Promise<{
    inconsistencies: Array<{
      rule: string;
      location: string;
      violation: string;
      impact: string;
    }>;
  }>;

  // P8: Dynamic rule verification
  verifyDynamicConsistency(
    inconsistencies: Inconsistency[]
  ): Promise<{
    solutions: Array<{
      id: string;
      title: string;
      adjustment: string;
      rippleEffects: string[];
    }>;
  }>;

  // P9: Setting-theme alignment
  alignSettingWithTheme(
    setting: string,
    theme: string
  ): Promise<{
    alignmentStrategies: Array<{
      approach: string;
      modifications: string[];
      thematicImpact: string;
    }>;
  }>;
}
```

#### PacingStrategist Agent (Act 4 - P10-P11)
```typescript
interface PacingStrategist {
  // P10: Rhythm and emotional space analysis
  analyzePacing(
    episodes: string,
    timeRange: string
  ): Promise<{
    pacingIssues: Array<{
      episode: number;
      issue: 'information_overload' | 'emotional_compression' | 'conflict_stacking';
      severity: 'high' | 'medium' | 'low';
      audienceImpact: string;
    }>;
  }>;

  // P11: Conflict redistribution
  restructureConflicts(
    issues: PacingIssue[]
  ): Promise<{
    strategies: Array<{
      id: string;
      approach: 'foreshadowing' | 'resequencing' | 'spacing';
      changes: Array<{
        episode: number;
        modification: string;
      }>;
      expectedImprovement: string;
    }>;
  }>;
}
```

#### ThematicPolisher Agent (Act 5 - P12-P13)
```typescript
interface ThematicPolisher {
  // P12: Character de-labeling and depth
  enhanceCharacterDepth(
    character: string,
    theme: string,
    styleReference: string
  ): Promise<{
    characterProfile: {
      name: string;
      enhancedTraits: string[];
      thematicRole: string;
      uniqueVoice: string;
      relationalDynamics: Map<string, string>;
    };
  }>;

  // P13: Core fears and beliefs
  defineCharacterCore(
    character: string
  ): Promise<{
    coreFear: string;
    limitingBelief: string;
    vulnerabilityMoment: string;
    empathyHook: string;
  }>;
}
```

### API Endpoint Extensions
Reuse Epic 2's iteration pattern:
- `/api/v1/iteration/propose` - Extended to handle ACT3, ACT4, ACT5
- `/api/v1/iteration/execute` - Extended for all act types
- `/api/v1/projects/:id/act-status` - Get completion status for all acts

### UI Component Extensions
```typescript
interface ActSpecificComponents {
  // Act 3: Worldbuilding
  RuleInconsistencyDisplay: React.FC<{
    inconsistencies: RuleInconsistency[];
    onSelectForFix: (item: RuleInconsistency) => void;
  }>;

  // Act 4: Pacing
  PacingTimeline: React.FC<{
    episodes: Episode[];
    issues: PacingIssue[];
    onSelectTimeRange: (range: TimeRange) => void;
  }>;

  ConflictMap: React.FC<{
    conflicts: Conflict[];
    proposedChanges: ConflictChange[];
  }>;

  // Act 5: Theme
  CharacterEvolution: React.FC<{
    originalProfile: CharacterProfile;
    enhancedProfile: CharacterProfile;
    onApprove: () => void;
  }>;
}
```

## User Stories

### Story 1: RulesAuditor Agent Implementation (Act 3)
**Points:** 8
**Priority:** P1
**Description:** Implement RulesAuditor agent for worldbuilding consistency checks with P7-P9 prompt chains.

**Acceptance Criteria:**
- [ ] Agent detects worldbuilding inconsistencies (P7)
- [ ] Dynamic verification identifies ripple effects (P8)
- [ ] Theme alignment strategies generated (P9)
- [ ] Structured output for all three prompts
- [ ] Integration with existing iteration APIs
- [ ] Error handling for complex rule systems
- [ ] Test coverage > 80%

### Story 2: PacingStrategist Agent Implementation (Act 4)
**Points:** 8
**Priority:** P1
**Description:** Implement PacingStrategist agent for structure and rhythm optimization with P10-P11 prompt chains.

**Acceptance Criteria:**
- [ ] Pacing analysis identifies density issues (P10)
- [ ] Conflict redistribution strategies generated (P11)
- [ ] Timeline visualization data provided
- [ ] Integration with episode/scene structure
- [ ] Severity scoring consistent and accurate
- [ ] Resequencing proposals maintain continuity
- [ ] Performance acceptable for long scripts

### Story 3: ThematicPolisher Agent Implementation (Act 5)
**Points:** 8
**Priority:** P1
**Description:** Implement ThematicPolisher agent for character depth and empathy enhancement with P12-P13 prompt chains.

**Acceptance Criteria:**
- [ ] Character enhancement removes generic traits (P12)
- [ ] Core fears/beliefs compelling and specific (P13)
- [ ] Style references properly applied
- [ ] Character relationships mapped accurately
- [ ] Empathy hooks resonate emotionally
- [ ] Output suitable for final synthesis
- [ ] All character data persistable

## Success Metrics
- [ ] All five acts completable in single session
- [ ] 90% of agent outputs properly structured
- [ ] Act 3-5 completion rates > 80%
- [ ] User can navigate between acts seamlessly
- [ ] Decision history complete for synthesis
- [ ] Average time per act < 15 minutes

## Risk Assessment

### High Risks
1. **Prompt Complexity Explosion**
   - **Risk:** Later acts require increasingly complex prompts
   - **Mitigation:** Iterative prompt refinement, extensive testing
   - **Contingency:** Simplified prompt versions available

2. **Context Window Limitations**
   - **Risk:** Full script + decisions exceed LLM context
   - **Mitigation:** Smart chunking, context compression
   - **Contingency:** Selective context inclusion

### Medium Risks
1. **Agent Output Quality Variance**
   - **Risk:** Quality differs significantly between agents
   - **Mitigation:** Consistent prompt patterns, validation
   - **Contingency:** Human review checkpoints

2. **UI Complexity Overload**
   - **Risk:** Too many specialized interfaces confuse users
   - **Mitigation:** Consistent interaction patterns
   - **Contingency:** Progressive disclosure of features

## Dependencies
- Epic 004 & 005 completed and stable
- Iteration API pattern proven scalable
- UI component library supports new visualizations
- LLM API reliable for complex prompts
- Database can handle increased decision volume

## Definition of Done
- [ ] All three agents implemented and tested
- [ ] P7-P13 prompt chains validated
- [ ] UI components for Acts 3-5 complete
- [ ] Integration with iteration APIs verified
- [ ] Decision persistence for all acts working
- [ ] End-to-end five-act workflow testable
- [ ] Performance benchmarks met
- [ ] Documentation updated

## Technical Notes

### Implementation Strategy
1. **Week 1:** RulesAuditor (Act 3) + UI components
2. **Week 2:** PacingStrategist (Act 4) + visualizations
3. **Week 3:** ThematicPolisher (Act 5) + integration testing

### Agent Factory Pattern
```typescript
class AgentFactory {
  private agents: Map<ActType, BaseAgent> = new Map([
    [ActType.ACT1, new ConsistencyGuardian()],
    [ActType.ACT2, new CharacterArchitect()],
    [ActType.ACT3, new RulesAuditor()],
    [ActType.ACT4, new PacingStrategist()],
    [ActType.ACT5, new ThematicPolisher()],
  ]);

  getAgent(actType: ActType): BaseAgent {
    const agent = this.agents.get(actType);
    if (!agent) throw new Error(`No agent for ${actType}`);
    return agent;
  }
}
```

### Prompt Chain Management
```typescript
interface PromptChain {
  act: ActType;
  prompts: Array<{
    id: string; // P7, P8, etc.
    template: string;
    variables: string[];
    outputSchema: JsonSchema;
  }>;

  execute(context: Context): Promise<StructuredOutput>;
}
```

### Performance Optimization
- Implement prompt result caching
- Use database indexes for decision queries
- Lazy load UI components per act
- Stream LLM responses where possible
- Batch database writes for decisions

### Testing Strategy
```typescript
describe('Multi-Act Agent System', () => {
  describe('RulesAuditor', () => {
    it('should detect magic system inconsistencies');
    it('should propose rule adjustments');
    it('should align setting with theme');
  });

  describe('PacingStrategist', () => {
    it('should identify pacing bottlenecks');
    it('should suggest conflict redistribution');
    it('should maintain narrative continuity');
  });

  describe('ThematicPolisher', () => {
    it('should enhance character depth');
    it('should generate compelling fears/beliefs');
    it('should maintain character consistency');
  });
});
```

## Next Epic Dependencies
This epic enables:
- Epic 4: Grand Synthesis Engine (requires all act decisions)
- Future: Analytics on decision patterns
- Future: ML training on successful revisions