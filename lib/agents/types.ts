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
    name: '时间线一致性',
    description: '检测时间顺序和时序不一致',
    checkPrompt: '分析时间流程和事件顺序。查找：时间悖论、不可能的序列、冲突的时间戳或违反因果关系的事件。',
    indicators: ['之前', '之后', '同时', '早些时候', '稍后', '昨天', '明天', '几小时前', '几天后', '早上', '下午', '晚上']
  },
  {
    type: LogicErrorType.CHARACTER,
    name: '角色一致性',
    description: '检测角色行为和认知不一致',
    checkPrompt: '分析角色行为、认知状态和性格特征。查找：不符合角色性格的行为、不可能的认知、性格矛盾或关系不一致。',
    indicators: ['知道', '记得', '忘记', '性格', '行为', '特征', '关系', '认识', '了解']
  },
  {
    type: LogicErrorType.PLOT,
    name: '情节逻辑',
    description: '检测情节漏洞和逻辑缺口',
    checkPrompt: '分析情节发展和因果关系。查找：缺失的动机、未解决的铺垫、不可能的结果或断裂的因果链。',
    indicators: ['因为', '所以', '导致', '引起', '造成', '结果', '动机', '原因']
  },
  {
    type: LogicErrorType.DIALOGUE,
    name: '对话连贯性',
    description: '检测对话流程和信息一致性问题',
    checkPrompt: '分析对话交流和信息流动。查找：答非所问、被忽略的问题、矛盾的陈述或凭空出现的信息。',
    indicators: ['说', '问', '回答', '提到', '告诉', '听说', '对话', '交谈']
  },
  {
    type: LogicErrorType.SCENE,
    name: '场景转换',
    description: '检测空间和场景转换问题',
    checkPrompt: '分析场景位置和转换。查找：不可能的移动、冲突的位置、缺失的转换或空间矛盾。',
    indicators: ['地点', '位置', '房间', '进入', '离开', '移动', '前往', '距离', '咖啡店', '办公室', '家']
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