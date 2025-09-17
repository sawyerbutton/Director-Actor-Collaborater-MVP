import { 
  DeepSeekConfig, 
  DeepSeekChatRequest, 
  DeepSeekChatResponse,
  DeepSeekError,
  RateLimitInfo
} from './types'
import { DeepSeekAPIError, DeepSeekRateLimitError, DeepSeekTimeoutError } from './errors'
import { RateLimiter } from './rate-limiter'

export class DeepSeekClient {
  private config: Required<DeepSeekConfig>
  private rateLimiter: RateLimiter
  private abortController: AbortController | null = null

  constructor(config: DeepSeekConfig) {
    this.config = {
      apiKey: config.apiKey,
      apiEndpoint: config.apiEndpoint,
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 30000
    }
    this.rateLimiter = new RateLimiter()
  }

  async chat(request: DeepSeekChatRequest): Promise<DeepSeekChatResponse> {
    return this.makeRequest<DeepSeekChatResponse>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  async cancelRequest(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit
  ): Promise<T> {
    await this.rateLimiter.waitIfNecessary()

    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await this.executeRequest(endpoint, options)
        
        this.updateRateLimitInfo(response)
        
        if (response.ok) {
          const data = await response.json() as T
          return data
        }

        const errorData = await response.json() as DeepSeekError
        
        if (response.status === 429) {
          const retryAfter = this.getRetryAfter(response)
          this.rateLimiter.updateFromHeaders(response.headers)
          throw new DeepSeekRateLimitError(
            errorData.error.message || 'Rate limit exceeded',
            retryAfter
          )
        }

        throw new DeepSeekAPIError(
          errorData.error.message || 'API request failed',
          response.status,
          errorData.error.code
        )
      } catch (error) {
        lastError = error as Error
        
        if (error instanceof DeepSeekTimeoutError) {
          throw error
        }
        
        if (error instanceof DeepSeekRateLimitError) {
          const waitTime = error.retryAfter || Math.pow(2, attempt) * 1000
          await this.delay(waitTime)
          continue
        }
        
        if (error instanceof DeepSeekAPIError && error.status && error.status >= 500) {
          const waitTime = Math.pow(2, attempt) * 1000
          await this.delay(waitTime)
          continue
        }
        
        throw error
      }
    }
    
    throw lastError || new DeepSeekAPIError('Max retries exceeded')
  }

  private async executeRequest(
    endpoint: string,
    options: RequestInit
  ): Promise<Response> {
    this.abortController = new AbortController()
    
    const timeoutId = setTimeout(() => {
      this.abortController?.abort()
    }, this.config.timeout)

    try {
      const response = await fetch(
        `${this.config.apiEndpoint}${endpoint}`,
        {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers
          },
          signal: this.abortController.signal
        }
      )
      
      clearTimeout(timeoutId)
      return response
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new DeepSeekTimeoutError(
          `Request timeout after ${this.config.timeout}ms`
        )
      }
      
      throw error
    } finally {
      this.abortController = null
    }
  }

  private updateRateLimitInfo(response: Response): void {
    this.rateLimiter.updateFromHeaders(response.headers)
  }

  private getRetryAfter(response: Response): number {
    const retryAfter = response.headers.get('Retry-After')
    if (retryAfter) {
      const retryAfterSeconds = parseInt(retryAfter, 10)
      if (!isNaN(retryAfterSeconds)) {
        return retryAfterSeconds * 1000
      }
    }
    return 0
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimiter.getInfo()
  }
}