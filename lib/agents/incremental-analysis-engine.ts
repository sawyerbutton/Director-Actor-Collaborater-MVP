import { IncrementalAnalysisEngine as CoreEngine } from '@/lib/analysis/incremental-engine';
import { ChangeEvent, ImpactAnalysis } from '@/types/change-tracking';

export class IncrementalAnalysisEngine {
  private engine: CoreEngine;

  constructor(apiKey?: string) {
    this.engine = new CoreEngine(apiKey || process.env.DEEPSEEK_API_KEY || '');
  }

  async analyzeChange(change: Partial<ChangeEvent> & { changeId: string; type: string; description: string; timestamp: Date }): Promise<ImpactAnalysis> {
    const fullChange: ChangeEvent = {
      ...change,
      id: change.changeId,
      timestamp: change.timestamp,
      type: change.type as any,
      location: { path: [] },
      oldValue: null,
      newValue: null,
      affectedElements: change.affectedElements || [],
      description: change.description
    };
    
    const analysis = await this.engine.analyzeChanges([fullChange], {
      id: change.changeId,
      title: 'Change Analysis',
      scenes: [],
      characters: [],
      dialogues: []
    });

    // The analyzeChanges returns a Map, get the first entry
    const results = Array.from(analysis.values())[0];
    
    if (!results || !results.detailedAnalysis) {
      return {
        affectedScenes: [],
        rippleEffects: [],
        severity: 'low',
        requiresFullReanalysis: false,
        confidenceScore: 0
      } as ImpactAnalysis;
    }

    // Convert analysis result to ImpactAnalysis format
    return {
      affectedScenes: change.affectedElements || [],
      rippleEffects: [],
      severity: 'low',
      requiresFullReanalysis: false,
      confidenceScore: 0.7
    } as ImpactAnalysis;
  }
}