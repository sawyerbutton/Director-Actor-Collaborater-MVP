import {
  ParsedScript,
  Scene,
  Character,
  Dialogue,
  LogicError,
  LogicErrorType,
  ErrorSeverity,
  ErrorLocation
} from '@/types/analysis';
import { v4 as uuidv4 } from 'uuid';

export class ErrorDetector {
  private script: ParsedScript;
  private errors: LogicError[] = [];
  
  constructor(script: ParsedScript) {
    this.script = script;
  }

  detectAllErrors(): LogicError[] {
    this.errors = [];
    
    this.detectTimelineErrors();
    this.detectCharacterErrors();
    this.detectPlotErrors();
    this.detectDialogueErrors();
    this.detectSceneErrors();
    
    return this.errors;
  }

  private detectTimelineErrors(): void {
    const timeReferences = new Map<number, string>();
    const eventSequence: Array<{ scene: number; event: string; time?: string }> = [];
    
    this.script.scenes.forEach((scene, index) => {
      if (scene.time) {
        timeReferences.set(scene.number, scene.time);
        
        const prevTime = index > 0 ? timeReferences.get(this.script.scenes[index - 1].number) : null;
        if (prevTime && this.isTimeInconsistent(prevTime, scene.time)) {
          this.addError({
            type: LogicErrorType.TIMELINE,
            severity: 'high',
            location: { sceneNumber: scene.number, timeReference: scene.time },
            description: `Time inconsistency: Scene ${scene.number} is set at "${scene.time}" but follows "${prevTime}"`,
            suggestion: 'Verify the chronological order of scenes or add transition explanation'
          });
        }
      }
      
      scene.dialogues.forEach((dialogue, dialogueIndex) => {
        const timeKeywords = this.extractTimeKeywords(dialogue.text);
        timeKeywords.forEach(keyword => {
          if (this.isTimeReferenceProblematic(keyword, scene.number, index)) {
            this.addError({
              type: LogicErrorType.TIMELINE,
              severity: 'medium',
              location: {
                sceneNumber: scene.number,
                characterName: dialogue.character,
                dialogueIndex,
                timeReference: keyword
              },
              description: `Temporal reference "${keyword}" may conflict with established timeline`,
              suggestion: 'Verify this time reference aligns with the script chronology'
            });
          }
        });
      });
    });
  }

  private detectCharacterErrors(): void {
    const characterStates = new Map<string, CharacterState>();
    const characterKnowledge = new Map<string, Set<string>>();
    
    this.script.characters.forEach(char => {
      characterStates.set(char.name, {
        traits: new Set(char.traits || []),
        lastSeenScene: -1,
        establishedRelationships: new Map(Object.entries(char.relationships || {}))
      });
      characterKnowledge.set(char.name, new Set());
    });
    
    this.script.scenes.forEach(scene => {
      const presentCharacters = new Set<string>();
      
      scene.dialogues.forEach((dialogue, dialogueIndex) => {
        presentCharacters.add(dialogue.character);
        
        const state = characterStates.get(dialogue.character);
        if (state) {
          if (state.lastSeenScene !== -1 && 
              scene.number - state.lastSeenScene > 1 &&
              !this.hasValidTransition(state.lastSeenScene, scene.number)) {
            this.addError({
              type: LogicErrorType.CHARACTER,
              severity: 'low',
              location: {
                sceneNumber: scene.number,
                characterName: dialogue.character
              },
              description: `${dialogue.character} appears without clear transition from Scene ${state.lastSeenScene}`,
              suggestion: 'Consider adding a transition or explanation for character movement'
            });
          }
          state.lastSeenScene = scene.number;
          
          const knowledgeViolations = this.checkKnowledgeConsistency(
            dialogue.text,
            dialogue.character,
            characterKnowledge.get(dialogue.character)!,
            presentCharacters
          );
          
          knowledgeViolations.forEach(violation => {
            this.addError({
              type: LogicErrorType.CHARACTER,
              severity: 'high',
              location: {
                sceneNumber: scene.number,
                characterName: dialogue.character,
                dialogueIndex
              },
              description: violation,
              suggestion: 'Ensure character only knows information they have learned'
            });
          });
        }
        
        this.updateCharacterKnowledge(
          dialogue.text,
          presentCharacters,
          characterKnowledge
        );
      });
    });
  }

  private detectPlotErrors(): void {
    const setups = new Map<string, number>();
    const payoffs = new Map<string, number>();
    const causalChains: Array<{ cause: string; effect: string; scene: number }> = [];
    
    this.script.scenes.forEach(scene => {
      const sceneText = this.getSceneFullText(scene);
      
      const setupIndicators = ['will', 'going to', 'plan to', 'intend to', 'promise'];
      const payoffIndicators = ['finally', 'at last', 'as promised', 'as planned'];
      
      setupIndicators.forEach(indicator => {
        if (sceneText.toLowerCase().includes(indicator)) {
          const setupKey = this.extractPlotPoint(sceneText, indicator);
          if (setupKey) {
            setups.set(setupKey, scene.number);
          }
        }
      });
      
      payoffIndicators.forEach(indicator => {
        if (sceneText.toLowerCase().includes(indicator)) {
          const payoffKey = this.extractPlotPoint(sceneText, indicator);
          if (payoffKey) {
            payoffs.set(payoffKey, scene.number);
          }
        }
      });
      
      const causalIndicators = ['because', 'therefore', 'so', 'thus', 'consequently'];
      causalIndicators.forEach(indicator => {
        if (sceneText.toLowerCase().includes(indicator)) {
          const chain = this.extractCausalChain(sceneText, indicator);
          if (chain) {
            causalChains.push({ ...chain, scene: scene.number });
          }
        }
      });
    });
    
    setups.forEach((sceneNum, setup) => {
      if (!Array.from(payoffs.keys()).some(payoff => 
        this.areRelatedPlotPoints(setup, payoff))) {
        this.addError({
          type: LogicErrorType.PLOT,
          severity: 'medium',
          location: { sceneNumber: sceneNum },
          description: `Setup "${setup}" appears to have no payoff`,
          suggestion: 'Either remove the setup or add a corresponding resolution'
        });
      }
    });
    
    causalChains.forEach(chain => {
      if (!this.isCausalChainValid(chain, this.script.scenes)) {
        this.addError({
          type: LogicErrorType.PLOT,
          severity: 'high',
          location: { sceneNumber: chain.scene },
          description: `Causal logic issue: "${chain.cause}" doesn't clearly lead to "${chain.effect}"`,
          suggestion: 'Strengthen the causal connection or provide additional context'
        });
      }
    });
  }

  private detectDialogueErrors(): void {
    this.script.scenes.forEach(scene => {
      let previousSpeaker: string | null = null;
      let unansweredQuestions: Array<{ question: string; asker: string; index: number }> = [];
      
      scene.dialogues.forEach((dialogue, index) => {
        if (this.isQuestion(dialogue.text)) {
          unansweredQuestions.push({
            question: dialogue.text,
            asker: dialogue.character,
            index
          });
        } else if (previousSpeaker && previousSpeaker !== dialogue.character) {
          const answeredQuestions = unansweredQuestions.filter(q => 
            q.asker !== dialogue.character &&
            this.isResponseTo(dialogue.text, q.question)
          );
          
          unansweredQuestions = unansweredQuestions.filter(q => 
            !answeredQuestions.includes(q)
          );
        }
        
        if (index > 0 && !this.isDialogueCoherent(
          scene.dialogues[index - 1].text,
          dialogue.text
        )) {
          this.addError({
            type: LogicErrorType.DIALOGUE,
            severity: 'low',
            location: {
              sceneNumber: scene.number,
              characterName: dialogue.character,
              dialogueIndex: index
            },
            description: 'Dialogue doesn\'t flow naturally from previous line',
            suggestion: 'Review dialogue continuity and response relevance'
          });
        }
        
        previousSpeaker = dialogue.character;
      });
      
      unansweredQuestions.forEach(q => {
        if (q.index < scene.dialogues.length - 2) {
          this.addError({
            type: LogicErrorType.DIALOGUE,
            severity: 'medium',
            location: {
              sceneNumber: scene.number,
              characterName: q.asker,
              dialogueIndex: q.index
            },
            description: `Question "${q.question.substring(0, 50)}..." goes unanswered`,
            suggestion: 'Add a response or acknowledge why the question is ignored'
          });
        }
      });
    });
  }

  private detectSceneErrors(): void {
    const locationMap = new Map<string, SceneLocation>();
    
    this.script.scenes.forEach((scene, index) => {
      const location = this.parseLocation(scene.location);
      locationMap.set(scene.location, location);
      
      if (index > 0) {
        const prevScene = this.script.scenes[index - 1];
        const prevLocation = locationMap.get(prevScene.location);
        
        if (prevLocation && location) {
          const transitionIssue = this.checkLocationTransition(
            prevLocation,
            location,
            prevScene,
            scene
          );
          
          if (transitionIssue) {
            this.addError({
              type: LogicErrorType.SCENE,
              severity: transitionIssue.severity,
              location: { sceneNumber: scene.number },
              description: transitionIssue.description,
              suggestion: transitionIssue.suggestion
            });
          }
        }
      }
      
      const spatialIssues = this.checkSpatialLogic(scene);
      spatialIssues.forEach(issue => {
        this.addError({
          type: LogicErrorType.SCENE,
          severity: 'medium',
          location: { sceneNumber: scene.number },
          description: issue,
          suggestion: 'Verify spatial descriptions and character positions'
        });
      });
    });
  }

  private isTimeInconsistent(prevTime: string, currentTime: string): boolean {
    const timeOrder = ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night', 'midnight'];
    const prevIndex = timeOrder.findIndex(t => prevTime.toLowerCase().includes(t));
    const currIndex = timeOrder.findIndex(t => currentTime.toLowerCase().includes(t));
    
    if (prevIndex !== -1 && currIndex !== -1) {
      return currIndex < prevIndex && !currentTime.toLowerCase().includes('next') && 
             !currentTime.toLowerCase().includes('later');
    }
    
    return false;
  }

  private extractTimeKeywords(text: string): string[] {
    const timePatterns = [
      /yesterday/gi, /tomorrow/gi, /last (week|month|year)/gi,
      /next (week|month|year)/gi, /\d+ (hours?|days?|weeks?|months?|years?) (ago|later)/gi,
      /this (morning|afternoon|evening)/gi
    ];
    
    const keywords: string[] = [];
    timePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        keywords.push(...matches);
      }
    });
    
    return keywords;
  }

  private isTimeReferenceProblematic(
    keyword: string,
    sceneNumber: number,
    sceneIndex: number
  ): boolean {
    // Check if the time reference conflicts with the established timeline
    const lowerKeyword = keyword.toLowerCase();
    
    // References to "yesterday" in the first scene are problematic
    if (sceneIndex === 0 && lowerKeyword.includes('yesterday')) {
      return true;
    }
    
    // References to "tomorrow" in the last scene might be problematic
    if (sceneIndex === this.script.scenes.length - 1 && lowerKeyword.includes('tomorrow')) {
      // Only problematic if there's no follow-up planned
      return true;
    }
    
    // Check for contradictory time jumps
    if (sceneIndex > 0) {
      const currentScene = this.script.scenes[sceneIndex];
      const previousScene = this.script.scenes[sceneIndex - 1];
      
      // If scenes are on the same day but reference suggests otherwise
      if (currentScene.time && previousScene.time) {
        const sameDay = currentScene.time.toLowerCase().includes('same day') ||
                       (currentScene.time === previousScene.time);
        
        if (sameDay) {
          // References to "days ago" or "weeks ago" are problematic in same-day scenes
          if (lowerKeyword.match(/(days?|weeks?|months?|years?)\s+(ago|later)/)) {
            return true;
          }
        }
      }
      
      // Check for impossible time references
      if (lowerKeyword.includes('yesterday') && previousScene.time?.toLowerCase().includes('yesterday')) {
        // Can't have "yesterday" referencing something that also happened "yesterday"
        return true;
      }
    }
    
    return false;
  }

  private hasValidTransition(fromScene: number, toScene: number): boolean {
    return toScene - fromScene <= 3;
  }

  private checkKnowledgeConsistency(
    dialogue: string,
    character: string,
    knowledge: Set<string>,
    presentCharacters: Set<string>
  ): string[] {
    const violations: string[] = [];
    
    const informationPatterns = [
      /I know (that |about )?(.+)/i,
      /I heard (that |about )?(.+)/i,
      /They told me (that |about )?(.+)/i
    ];
    
    informationPatterns.forEach(pattern => {
      const match = dialogue.match(pattern);
      if (match && match[2]) {
        const info = match[2].toLowerCase();
        if (!knowledge.has(info) && !this.isCommonKnowledge(info)) {
          violations.push(`${character} references information they haven't learned: "${info.substring(0, 50)}..."`);
        }
      }
    });
    
    return violations;
  }

  private updateCharacterKnowledge(
    dialogue: string,
    presentCharacters: Set<string>,
    characterKnowledge: Map<string, Set<string>>
  ): void {
    const infoPatterns = [
      /(.+) is (.+)/i,
      /(.+) was (.+)/i,
      /(.+) will be (.+)/i
    ];
    
    infoPatterns.forEach(pattern => {
      const match = dialogue.match(pattern);
      if (match) {
        const info = match[0].toLowerCase();
        presentCharacters.forEach(char => {
          characterKnowledge.get(char)?.add(info);
        });
      }
    });
  }

  private isCommonKnowledge(info: string): boolean {
    const commonPhrases = ['the sun', 'the sky', 'water', 'food', 'sleep'];
    return commonPhrases.some(phrase => info.includes(phrase));
  }

  private getSceneFullText(scene: Scene): string {
    const parts: string[] = [];
    parts.push(scene.location);
    if (scene.time) parts.push(scene.time);
    if (scene.description) parts.push(scene.description);
    
    scene.dialogues.forEach(d => {
      parts.push(`${d.character}: ${d.text}`);
    });
    
    scene.actions?.forEach(a => {
      parts.push(a.description);
    });
    
    return parts.join(' ');
  }

  private extractPlotPoint(text: string, indicator: string): string | null {
    const index = text.toLowerCase().indexOf(indicator);
    if (index !== -1) {
      const snippet = text.substring(index, Math.min(index + 100, text.length));
      return snippet.replace(/[^\w\s]/g, '').substring(0, 50);
    }
    return null;
  }

  private extractCausalChain(
    text: string,
    indicator: string
  ): { cause: string; effect: string } | null {
    const index = text.toLowerCase().indexOf(indicator);
    if (index !== -1) {
      const before = text.substring(Math.max(0, index - 100), index).trim();
      const after = text.substring(index + indicator.length, Math.min(index + 100, text.length)).trim();
      return { cause: before.substring(0, 50), effect: after.substring(0, 50) };
    }
    return null;
  }

  private areRelatedPlotPoints(setup: string, payoff: string): boolean {
    const setupWords = setup.toLowerCase().split(/\s+/);
    const payoffWords = payoff.toLowerCase().split(/\s+/);
    
    const commonWords = setupWords.filter(word => 
      payoffWords.includes(word) && word.length > 3
    );
    
    return commonWords.length >= 2;
  }

  private isCausalChainValid(
    chain: { cause: string; effect: string; scene: number },
    scenes: Scene[]
  ): boolean {
    // Check if the cause-effect relationship is logically sound
    const cause = chain.cause.toLowerCase();
    const effect = chain.effect.toLowerCase();
    
    // Empty or very short causes/effects are invalid
    if (cause.length < 10 || effect.length < 10) {
      return false;
    }
    
    // Check for contradictory terms
    const contradictoryPairs = [
      ['happy', 'sad'],
      ['alive', 'dead'],
      ['success', 'fail'],
      ['win', 'lose'],
      ['remember', 'forget'],
      ['know', 'unknown']
    ];
    
    for (const [term1, term2] of contradictoryPairs) {
      if ((cause.includes(term1) && effect.includes(term2)) ||
          (cause.includes(term2) && effect.includes(term1))) {
        // Direct contradictions suggest invalid causality
        return false;
      }
    }
    
    // Check if the effect appears before the cause in the script
    const sceneIndex = scenes.findIndex(s => s.number === chain.scene);
    if (sceneIndex > 0) {
      // Look for the effect mentioned in earlier scenes
      for (let i = 0; i < sceneIndex; i++) {
        const earlierSceneText = this.getSceneFullText(scenes[i]).toLowerCase();
        // If the effect is already established before the cause, it's invalid
        if (earlierSceneText.includes(effect.substring(0, 30))) {
          return false;
        }
      }
    }
    
    // Check for logical impossibilities
    const impossibleCausalities = [
      { cause: 'forgot', effect: 'remember perfectly' },
      { cause: 'destroyed', effect: 'intact' },
      { cause: 'left', effect: 'still here' },
      { cause: 'died', effect: 'alive' }
    ];
    
    for (const impossible of impossibleCausalities) {
      if (cause.includes(impossible.cause) && effect.includes(impossible.effect)) {
        return false;
      }
    }
    
    // If no specific issues found, consider it valid
    return true;
  }

  private isQuestion(text: string): boolean {
    return text.trim().endsWith('?') || 
           text.toLowerCase().startsWith('why') ||
           text.toLowerCase().startsWith('what') ||
           text.toLowerCase().startsWith('where') ||
           text.toLowerCase().startsWith('when') ||
           text.toLowerCase().startsWith('how') ||
           text.toLowerCase().startsWith('who');
  }

  private isResponseTo(response: string, question: string): boolean {
    const questionWords = question.toLowerCase().split(/\s+/).slice(0, 5);
    const responseWords = response.toLowerCase().split(/\s+/);
    
    const relevantWords = questionWords.filter(word => 
      responseWords.includes(word) && word.length > 2
    );
    
    return relevantWords.length >= 1;
  }

  private isDialogueCoherent(previous: string, current: string): boolean {
    // Check if current dialogue logically follows from previous
    if (this.isQuestion(previous) && !this.isResponseTo(current, previous)) {
      return false;
    }
    
    // Check for complete topic changes (non-sequiturs)
    const prevWords = previous.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const currWords = current.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    // Find common meaningful words (exclude common stop words)
    const stopWords = ['the', 'and', 'but', 'for', 'with', 'have', 'this', 'that', 'from', 'what', 'when', 'where'];
    const meaningfulPrevWords = prevWords.filter(w => !stopWords.includes(w));
    const meaningfulCurrWords = currWords.filter(w => !stopWords.includes(w));
    
    const commonWords = meaningfulPrevWords.filter(word => 
      meaningfulCurrWords.includes(word)
    );
    
    // If there are no common words and it's not a question-answer pair, it's likely incoherent
    if (commonWords.length === 0 && !this.isQuestion(previous) && 
        meaningfulPrevWords.length > 0 && meaningfulCurrWords.length > 0) {
      // Check if the current response acknowledges the previous statement somehow
      const acknowledgments = ['yes', 'no', 'okay', 'right', 'sure', 'indeed', 'agree', 'disagree', 'well', 'hmm'];
      const hasAcknowledgment = acknowledgments.some(ack => current.toLowerCase().startsWith(ack));
      
      if (!hasAcknowledgment) {
        // Complete non-sequitur detected (e.g., "I love coffee" -> "The moon is bright")
        return false;
      }
    }
    
    return true;
  }

  private parseLocation(locationStr: string): SceneLocation {
    const isInterior = locationStr.toUpperCase().includes('INT');
    const isExterior = locationStr.toUpperCase().includes('EXT');
    
    const parts = locationStr.split('-').map(p => p.trim());
    const mainLocation = parts[1] || parts[0];
    
    return {
      type: isInterior ? 'interior' : isExterior ? 'exterior' : 'unknown',
      name: mainLocation,
      full: locationStr
    };
  }

  private checkLocationTransition(
    from: SceneLocation,
    to: SceneLocation,
    fromScene: Scene,
    toScene: Scene
  ): { description: string; suggestion: string; severity: ErrorSeverity } | null {
    // Check for instant transitions between different interiors
    if (from.type === 'interior' && to.type === 'interior' && 
        from.name !== to.name && 
        !this.hasTransitionTime(fromScene, toScene)) {
      return {
        description: `Instant transition from ${from.name} to ${to.name} without time passage`,
        suggestion: 'Add a transition scene or indicate time passage',
        severity: 'low'
      };
    }
    
    // Check for impossible location jumps based on time constraints
    if (fromScene.time && toScene.time) {
      const fromTime = fromScene.time.toLowerCase();
      const toTime = toScene.time.toLowerCase();
      
      // Extract time values if present (e.g., "10:00 AM" to "10:01 AM")
      const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm)?/i;
      const fromMatch = fromTime.match(timePattern);
      const toMatch = toTime.match(timePattern);
      
      if (fromMatch && toMatch) {
        const fromHour = parseInt(fromMatch[1]);
        const fromMin = parseInt(fromMatch[2]);
        const fromPeriod = fromMatch[3]?.toLowerCase();
        
        const toHour = parseInt(toMatch[1]);
        const toMin = parseInt(toMatch[2]);
        const toPeriod = toMatch[3]?.toLowerCase();
        
        // Convert to minutes for comparison
        let fromTotalMin = fromHour * 60 + fromMin;
        let toTotalMin = toHour * 60 + toMin;
        
        // Adjust for AM/PM if present
        if (fromPeriod === 'pm' && fromHour !== 12) fromTotalMin += 12 * 60;
        if (toPeriod === 'pm' && toHour !== 12) toTotalMin += 12 * 60;
        
        const timeDiff = Math.abs(toTotalMin - fromTotalMin);
        
        // If locations are far apart but time difference is minimal (< 5 minutes)
        if (timeDiff < 5 && from.name !== to.name) {
          // Check if locations suggest distance (e.g., "OFFICE - DOWNTOWN" to "HOUSE - SUBURBS")
          const distantKeywords = ['downtown', 'suburb', 'airport', 'hospital', 'university'];
          const fromHasDistant = distantKeywords.some(k => from.name.toLowerCase().includes(k));
          const toHasDistant = distantKeywords.some(k => to.name.toLowerCase().includes(k));
          
          if ((fromHasDistant || toHasDistant) && from.name !== to.name) {
            return {
              description: `Impossible transition from ${from.name} to ${to.name} in ${timeDiff} minute(s)`,
              suggestion: 'Adjust time stamps to allow realistic travel time',
              severity: 'high'
            };
          }
        }
      }
    }
    
    return null;
  }

  private hasTransitionTime(fromScene: Scene, toScene: Scene): boolean {
    return fromScene.time !== toScene.time || 
           (toScene.time?.toLowerCase().includes('later') ?? false) ||
           (toScene.time?.toLowerCase().includes('next') ?? false);
  }

  private checkSpatialLogic(scene: Scene): string[] {
    const issues: string[] = [];
    
    const entranceExitPattern = /(enters?|exits?|leaves?|arrives?)/gi;
    const spatialActions = scene.actions?.filter(a => 
      entranceExitPattern.test(a.description)
    ) || [];
    
    const characterPresence = new Set<string>();
    scene.dialogues.forEach(d => characterPresence.add(d.character));
    
    spatialActions.forEach(action => {
      action.characters?.forEach(char => {
        if (action.description.toLowerCase().includes('exit') && 
            characterPresence.has(char)) {
        }
      });
    });
    
    return issues;
  }

  private addError(error: Omit<LogicError, 'id'>): void {
    this.errors.push({
      ...error,
      id: uuidv4()
    });
  }
}

interface CharacterState {
  traits: Set<string>;
  lastSeenScene: number;
  establishedRelationships: Map<string, string>;
}

interface SceneLocation {
  type: 'interior' | 'exterior' | 'unknown';
  name: string;
  full: string;
}