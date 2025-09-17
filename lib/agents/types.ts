import { LogicErrorType, ErrorSeverity, LogicError } from '@/types/analysis';

export interface AgentPromptConfig {
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat: string;
  examples?: PromptExample[];
}

export interface PromptExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface ErrorDetectionRule {
  type: LogicErrorType;
  name: string;
  description: string;
  checkPrompt: string;
  indicators: string[];
}

export interface AgentResponse {
  raw: string;
  parsed?: any;
  tokensUsed?: number;
  processingTime: number;
  success: boolean;
  error?: string;
}

export interface ConsistencyAgentConfig {
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  enableCaching: boolean;
  chunkSize: number;
}

export interface AnalysisChunk {
  startScene: number;
  endScene: number;
  content: string;
  characterContext: Set<string>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export const ERROR_DETECTION_RULES: ErrorDetectionRule[] = [
  {
    type: LogicErrorType.TIMELINE,
    name: 'Timeline Consistency',
    description: 'Detect chronological and temporal inconsistencies',
    checkPrompt: 'Analyze the temporal flow and sequence of events. Look for: time paradoxes, impossible sequences, conflicting timestamps, or events that violate causality.',
    indicators: ['before', 'after', 'meanwhile', 'earlier', 'later', 'yesterday', 'tomorrow', 'hours ago', 'days later']
  },
  {
    type: LogicErrorType.CHARACTER,
    name: 'Character Consistency',
    description: 'Detect character behavior and knowledge inconsistencies',
    checkPrompt: 'Analyze character behaviors, knowledge states, and personality traits. Look for: out-of-character actions, impossible knowledge, personality contradictions, or relationship inconsistencies.',
    indicators: ['knows', 'remembers', 'forgot', 'personality', 'behavior', 'trait', 'relationship']
  },
  {
    type: LogicErrorType.PLOT,
    name: 'Plot Logic',
    description: 'Detect plot holes and logical gaps',
    checkPrompt: 'Analyze plot progression and causality. Look for: missing motivations, unresolved setups, impossible outcomes, or broken cause-effect chains.',
    indicators: ['because', 'therefore', 'results in', 'causes', 'leads to', 'consequence', 'motivation']
  },
  {
    type: LogicErrorType.DIALOGUE,
    name: 'Dialogue Coherence',
    description: 'Detect dialogue flow and information consistency issues',
    checkPrompt: 'Analyze dialogue exchanges and information flow. Look for: non-sequiturs, ignored questions, contradictory statements, or information appearing from nowhere.',
    indicators: ['said', 'asked', 'replied', 'mentioned', 'told', 'heard', 'conversation']
  },
  {
    type: LogicErrorType.SCENE,
    name: 'Scene Transitions',
    description: 'Detect spatial and scene transition issues',
    checkPrompt: 'Analyze scene locations and transitions. Look for: impossible movements, conflicting locations, missing transitions, or spatial contradictions.',
    indicators: ['location', 'place', 'room', 'enters', 'exits', 'moves', 'travels', 'distance']
  }
];

export const DEFAULT_AGENT_CONFIG: ConsistencyAgentConfig = {
  modelName: 'deepseek-chat',
  temperature: 0.2,
  maxTokens: 4000,
  timeout: 9000,
  enableCaching: true,
  chunkSize: 10
};