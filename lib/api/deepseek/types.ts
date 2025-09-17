export interface DeepSeekConfig {
  apiKey: string
  apiEndpoint: string
  maxRetries?: number
  timeout?: number
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DeepSeekChatRequest {
  model: string
  messages: DeepSeekMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stream?: boolean
}

export interface DeepSeekChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: DeepSeekMessage
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface DeepSeekError {
  error: {
    message: string
    type: string
    param?: string
    code?: string
  }
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}