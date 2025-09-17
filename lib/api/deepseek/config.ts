import { DeepSeekConfig } from './types'
import { DeepSeekConfigError } from './errors'

export function validateConfig(config: Partial<DeepSeekConfig>): DeepSeekConfig {
  const errors: string[] = []
  
  if (!config.apiKey) {
    errors.push('API key is required')
  }
  
  if (!config.apiEndpoint) {
    errors.push('API endpoint is required')
  } else {
    try {
      new URL(config.apiEndpoint)
    } catch {
      errors.push('API endpoint must be a valid URL')
    }
  }
  
  if (config.maxRetries !== undefined) {
    if (config.maxRetries < 0 || config.maxRetries > 10) {
      errors.push('Max retries must be between 0 and 10')
    }
  }
  
  if (config.timeout !== undefined) {
    if (config.timeout < 1000 || config.timeout > 120000) {
      errors.push('Timeout must be between 1000ms and 120000ms')
    }
  }
  
  if (errors.length > 0) {
    throw new DeepSeekConfigError(
      `Configuration validation failed: ${errors.join(', ')}`
    )
  }
  
  return config as DeepSeekConfig
}

export function loadConfigFromEnv(): DeepSeekConfig {
  const config: Partial<DeepSeekConfig> = {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    apiEndpoint: process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1',
    maxRetries: process.env.DEEPSEEK_MAX_RETRIES 
      ? parseInt(process.env.DEEPSEEK_MAX_RETRIES, 10) 
      : 3,
    timeout: process.env.DEEPSEEK_TIMEOUT 
      ? parseInt(process.env.DEEPSEEK_TIMEOUT, 10) 
      : 30000
  }
  
  return validateConfig(config)
}

export function getDefaultConfig(): Partial<DeepSeekConfig> {
  return {
    apiEndpoint: 'https://api.deepseek.com/v1',
    maxRetries: 3,
    timeout: 30000
  }
}

export function mergeConfig(
  base: Partial<DeepSeekConfig>,
  override: Partial<DeepSeekConfig>
): DeepSeekConfig {
  const merged = {
    ...getDefaultConfig(),
    ...base,
    ...override
  }
  
  return validateConfig(merged)
}