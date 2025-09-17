import { RateLimitInfo } from './types'

interface QueuedRequest {
  resolve: () => void
  timestamp: number
}

export class RateLimiter {
  private requestQueue: QueuedRequest[] = []
  private rateLimitInfo: RateLimitInfo | null = null
  private lastRequestTime: number = 0
  private minRequestInterval: number = 100 // Minimum 100ms between requests
  private isProcessing: boolean = false

  async waitIfNecessary(): Promise<void> {
    return new Promise<void>((resolve) => {
      const now = Date.now()
      
      // Check if we need to wait due to rate limits
      if (this.rateLimitInfo) {
        if (this.rateLimitInfo.remaining === 0) {
          const waitTime = Math.max(0, this.rateLimitInfo.reset - now)
          if (waitTime > 0) {
            setTimeout(() => {
              this.lastRequestTime = Date.now()
              resolve()
            }, waitTime)
            return
          }
        }
      }
      
      // Check minimum interval between requests
      const timeSinceLastRequest = now - this.lastRequestTime
      if (timeSinceLastRequest < this.minRequestInterval) {
        const waitTime = this.minRequestInterval - timeSinceLastRequest
        setTimeout(() => {
          this.lastRequestTime = Date.now()
          resolve()
        }, waitTime)
        return
      }
      
      // Add to queue if other requests are processing
      if (this.isProcessing) {
        this.requestQueue.push({
          resolve,
          timestamp: now
        })
        this.processQueue()
        return
      }
      
      // Process immediately
      this.lastRequestTime = now
      resolve()
    })
  }

  updateFromHeaders(headers: Headers): void {
    const limit = headers.get('X-RateLimit-Limit')
    const remaining = headers.get('X-RateLimit-Remaining')
    const reset = headers.get('X-RateLimit-Reset')
    
    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10) * 1000 // Convert to milliseconds
      }
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return
    }
    
    this.isProcessing = true
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()
      if (!request) break
      
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime
      
      if (timeSinceLastRequest < this.minRequestInterval) {
        await this.delay(this.minRequestInterval - timeSinceLastRequest)
      }
      
      this.lastRequestTime = Date.now()
      request.resolve()
      
      // Small delay between processing queue items
      if (this.requestQueue.length > 0) {
        await this.delay(this.minRequestInterval)
      }
    }
    
    this.isProcessing = false
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getInfo(): RateLimitInfo | null {
    return this.rateLimitInfo
  }

  reset(): void {
    this.requestQueue = []
    this.rateLimitInfo = null
    this.lastRequestTime = 0
    this.isProcessing = false
  }

  setMinRequestInterval(ms: number): void {
    this.minRequestInterval = Math.max(0, ms)
  }
}