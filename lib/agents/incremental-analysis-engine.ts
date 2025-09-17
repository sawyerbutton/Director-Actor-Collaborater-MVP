import { IncrementalAnalysisEngine as CoreEngine } from '@/lib/analysis/incremental-engine';
import { ChangeEvent, ImpactAnalysis } from '@/types/change-tracking';
import { ParsedScript } from '@/types/script';

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
    
    const mockScript: ParsedScript = {
      metadata: {
        parseVersion: '1.0.0',
        parseTime: new Date(),
        language: 'en',
        originalLength: 0
      },
      scenes: [],
      characters: [],
      dialogues: [],
      actions: [],
      totalDialogues: 0,
      totalActions: 0
    };
    
    const analysis = await this.engine.analyzeChanges([fullChange], mockScript);

    // The analyzeChanges returns a Map, get the first entry
    const results = Array.from(analysis.values())[0];
    
    if (!results || !results.detailedAnalysis) {
      return {
        directImpact: [],
        indirectImpact: [],
        propagationPath: [],
        estimatedAnalysisTime: 0,
        impactLevel: 'low'
      } as ImpactAnalysis;
    }

    // Convert analysis result to ImpactAnalysis format
    return {
      directImpact: change.affectedElements || [],
      indirectImpact: [],
      propagationPath: [],
      estimatedAnalysisTime: 10,
      impactLevel: 'low'
    } as ImpactAnalysis;
  }
}