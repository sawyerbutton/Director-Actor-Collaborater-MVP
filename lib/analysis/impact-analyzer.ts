import { 
  ChangeEvent, 
  ImpactAnalysis 
} from '@/types/change-tracking';
import { ParsedScript, Scene } from '@/types/script';

interface DependencyNode {
  id: string;
  type: 'scene' | 'character' | 'dialogue' | 'relationship';
  dependencies: Set<string>;
  dependents: Set<string>;
}

export class ImpactAnalyzer {
  private dependencyGraph: Map<string, DependencyNode> = new Map();
  private script: ParsedScript | null = null;

  constructor() {
    this.dependencyGraph = new Map();
  }

  /**
   * Analyzes the impact of changes on a script by building a dependency graph
   * and tracing propagation paths. Uses graph traversal to identify both
   * direct and indirect impacts.
   * 
   * @param changes - Array of change events to analyze
   * @param script - The script to analyze impacts on
   * @returns Impact analysis including affected elements and propagation paths
   */
  public analyzeImpact(
    changes: ChangeEvent[],
    script: ParsedScript
  ): ImpactAnalysis {
    this.script = script;
    this.buildDependencyGraph(script);

    const directImpact = new Set<string>();
    const indirectImpact = new Set<string>();
    const propagationPaths: string[][] = [];

    for (const change of changes) {
      for (const element of change.affectedElements) {
        directImpact.add(element);
        
        const propagation = this.tracePropagation(element, new Set());
        for (const affected of propagation) {
          if (!directImpact.has(affected)) {
            indirectImpact.add(affected);
          }
        }
        
        if (propagation.length > 0) {
          propagationPaths.push([element, ...propagation]);
        }
      }
    }

    const impactLevel = this.calculateImpactLevel(
      directImpact.size,
      indirectImpact.size,
      script
    );

    const estimatedTime = this.estimateAnalysisTime(
      directImpact.size + indirectImpact.size,
      impactLevel
    );

    return {
      directImpact: Array.from(directImpact),
      indirectImpact: Array.from(indirectImpact),
      propagationPath: propagationPaths,
      estimatedAnalysisTime: estimatedTime,
      impactLevel
    };
  }

  private buildDependencyGraph(script: ParsedScript): void {
    this.dependencyGraph.clear();

    for (const character of script.characters || []) {
      this.addNode(character.id, 'character');
    }

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      this.addNode(scene.id, 'scene');

      if (i > 0) {
        const prevScene = script.scenes[i - 1];
        this.addDependency(scene.id, prevScene.id);
      }

      if (scene.dialogues) {
        for (const dialogue of scene.dialogues) {
          const dialogueId = `${scene.id}_${dialogue.id}`;
          this.addNode(dialogueId, 'dialogue');
          
          this.addDependency(dialogueId, scene.id);
          
          if (dialogue.characterId) {
            this.addDependency(dialogueId, dialogue.characterId);
            this.addDependency(scene.id, dialogue.characterId);
          }
        }
      }

      const charactersInScene = this.extractCharactersFromScene(scene);
      for (let j = 0; j < charactersInScene.length - 1; j++) {
        for (let k = j + 1; k < charactersInScene.length; k++) {
          const relationshipId = `rel_${charactersInScene[j]}_${charactersInScene[k]}`;
          this.addNode(relationshipId, 'relationship');
          this.addDependency(relationshipId, charactersInScene[j]);
          this.addDependency(relationshipId, charactersInScene[k]);
          this.addDependency(relationshipId, scene.id);
        }
      }
    }

    // TODO: Implement when relationships are added to Character interface
    // if (script.characters) {
    //   for (const character of script.characters) {
    //     if (character.relationships) {
    //       for (const [targetId, relationship] of Object.entries(character.relationships)) {
    //         const relationshipId = `rel_${character.id}_${targetId}`;
    //         if (!this.dependencyGraph.has(relationshipId)) {
    //           this.addNode(relationshipId, 'relationship');
    //           this.addDependency(relationshipId, character.id);
    //           this.addDependency(relationshipId, targetId);
    //         }
    //       }
    //     }
    //   }
    // }
  }

  private addNode(id: string, type: DependencyNode['type']): void {
    if (!this.dependencyGraph.has(id)) {
      this.dependencyGraph.set(id, {
        id,
        type,
        dependencies: new Set(),
        dependents: new Set()
      });
    }
  }

  private addDependency(from: string, to: string): void {
    const fromNode = this.dependencyGraph.get(from);
    const toNode = this.dependencyGraph.get(to);

    if (fromNode && toNode) {
      fromNode.dependencies.add(to);
      toNode.dependents.add(from);
    }
  }

  /**
   * Recursively traces the propagation of impact through the dependency graph
   * using depth-first search. Handles cycles through visited set tracking.
   * 
   * Algorithm:
   * 1. Mark current node as visited to prevent cycles
   * 2. Traverse all dependent nodes recursively
   * 3. Apply special rules for character and scene impacts
   * 4. Return accumulated affected elements
   * 
   * @param elementId - Starting element to trace from
   * @param visited - Set of already visited nodes to prevent cycles
   * @returns Array of affected element IDs
   */
  private tracePropagation(
    elementId: string,
    visited: Set<string>
  ): string[] {
    if (visited.has(elementId)) {
      return [];
    }

    visited.add(elementId);
    const node = this.dependencyGraph.get(elementId);
    
    if (!node) {
      return [];
    }

    const affected: string[] = [];

    for (const dependent of node.dependents) {
      if (!visited.has(dependent)) {
        affected.push(dependent);
        const subPropagation = this.tracePropagation(dependent, visited);
        affected.push(...subPropagation);
      }
    }

    if (node.type === 'character') {
      for (const [nodeId, otherNode] of this.dependencyGraph) {
        if (
          otherNode.type === 'scene' &&
          otherNode.dependencies.has(elementId) &&
          !visited.has(nodeId)
        ) {
          affected.push(nodeId);
          visited.add(nodeId);
        }
      }
    }

    if (node.type === 'scene') {
      const sceneIndex = this.script?.scenes.findIndex(s => s.id === elementId) ?? -1;
      if (sceneIndex >= 0 && this.script) {
        for (let i = sceneIndex + 1; i < this.script.scenes.length; i++) {
          const nextSceneId = this.script.scenes[i].id;
          if (!visited.has(nextSceneId)) {
            affected.push(nextSceneId);
            visited.add(nextSceneId);
          }
        }
      }
    }

    return affected;
  }

  private extractCharactersFromScene(scene: Scene): string[] {
    const characters = new Set<string>();
    
    if (scene.dialogues) {
      for (const dialogue of scene.dialogues) {
        if (dialogue.characterId) {
          characters.add(dialogue.characterId);
        }
      }
    }

    return Array.from(characters);
  }

  private calculateImpactLevel(
    directCount: number,
    indirectCount: number,
    script: ParsedScript
  ): 'low' | 'medium' | 'high' | 'critical' {
    const totalElements = 
      (script.scenes?.length || 0) + 
      (script.characters?.length || 0);
    
    const impactPercentage = ((directCount + indirectCount) / totalElements) * 100;

    if (impactPercentage < 10) return 'low';
    if (impactPercentage < 30) return 'medium';
    if (impactPercentage < 60) return 'high';
    return 'critical';
  }

  private estimateAnalysisTime(
    affectedCount: number,
    impactLevel: ImpactAnalysis['impactLevel']
  ): number {
    const baseTimePerElement = 100;
    
    const multiplier = {
      'low': 1,
      'medium': 1.5,
      'high': 2,
      'critical': 2.5
    }[impactLevel];

    return Math.min(
      affectedCount * baseTimePerElement * multiplier,
      10000
    );
  }

  public getCharacterScenes(characterId: string): string[] {
    if (!this.script) {
      return [];
    }
    
    const scenes: string[] = [];
    for (const scene of this.script.scenes) {
      if (scene.dialogues?.some(d => d.characterId === characterId)) {
        scenes.push(scene.id);
      }
    }
    
    return scenes;
  }

  public getSceneDependencies(sceneId: string): {
    characters: string[];
    previousScenes: string[];
    nextScenes: string[];
  } {
    if (!this.script) {
      return { characters: [], previousScenes: [], nextScenes: [] };
    }

    const sceneIndex = this.script.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) {
      return { characters: [], previousScenes: [], nextScenes: [] };
    }

    const scene = this.script.scenes[sceneIndex];
    const characters = this.extractCharactersFromScene(scene);
    
    const previousScenes = sceneIndex > 0 
      ? [this.script.scenes[sceneIndex - 1].id]
      : [];
    
    const nextScenes = sceneIndex < this.script.scenes.length - 1
      ? [this.script.scenes[sceneIndex + 1].id]
      : [];

    return { characters, previousScenes, nextScenes };
  }

  public getRelationshipImpact(
    character1: string,
    character2: string
  ): string[] {
    if (!this.script) return [];

    const affectedScenes: string[] = [];
    
    for (const scene of this.script.scenes) {
      const charactersInScene = this.extractCharactersFromScene(scene);
      if (
        charactersInScene.includes(character1) &&
        charactersInScene.includes(character2)
      ) {
        affectedScenes.push(scene.id);
      }
    }

    return affectedScenes;
  }
}