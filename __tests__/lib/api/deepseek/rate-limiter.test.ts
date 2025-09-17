import { RateLimiter } from '../../../../lib/api/deepseek/rate-limiter'

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('waitIfNecessary', () => {
    it('should not wait when no rate limit', async () => {
      const startTime = Date.now()
      const promise = rateLimiter.waitIfNecessary()
      
      jest.runAllTimers()
      await promise
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(50)
    })

    it('should enforce minimum interval between requests', async () => {
      rateLimiter.setMinRequestInterval(200)
      
      const promise1 = rateLimiter.waitIfNecessary()
      jest.runAllTimers()
      await promise1
      
      const promise2 = rateLimiter.waitIfNecessary()
      
      // Should wait for minimum interval
      jest.advanceTimersByTime(100)
      expect(jest.getTimerCount()).toBeGreaterThan(0)
      
      jest.advanceTimersByTime(100)
      await promise2
    })

    it('should wait when rate limit is exhausted', async () => {
      const futureReset = Date.now() + 5000
      const headers = new Headers({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(futureReset / 1000)
      })
      
      rateLimiter.updateFromHeaders(headers)
      
      const promise = rateLimiter.waitIfNecessary()
      
      // Should have a timer waiting
      expect(jest.getTimerCount()).toBeGreaterThan(0)
      
      jest.advanceTimersByTime(5000)
      await promise
    })

    it('should not wait when rate limit has remaining requests', async () => {
      const headers = new Headers({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '50',
        'X-RateLimit-Reset': String((Date.now() + 3600000) / 1000)
      })
      
      rateLimiter.updateFromHeaders(headers)
      
      const promise = rateLimiter.waitIfNecessary()
      jest.runAllTimers()
      await promise
      
      expect(jest.getTimerCount()).toBe(0)
    })

    it('should queue requests when processing', async () => {
      rateLimiter.setMinRequestInterval(100)
      
      const promises = [
        rateLimiter.waitIfNecessary(),
        rateLimiter.waitIfNecessary(),
        rateLimiter.waitIfNecessary()
      ]
      
      // Process all timers to complete the queue
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(100)
      }
      
      await Promise.all(promises)
    })
  })

  describe('updateFromHeaders', () => {
    it('should update rate limit info from headers', () => {
      const headers = new Headers({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '75',
        'X-RateLimit-Reset': '1234567890'
      })
      
      rateLimiter.updateFromHeaders(headers)
      const info = rateLimiter.getInfo()
      
      expect(info).toEqual({
        limit: 100,
        remaining: 75,
        reset: 1234567890000
      })
    })

    it('should not update when headers are missing', () => {
      const headers = new Headers()
      
      rateLimiter.updateFromHeaders(headers)
      const info = rateLimiter.getInfo()
      
      expect(info).toBeNull()
    })

    it('should not update when headers are partial', () => {
      const headers = new Headers({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '75'
        // Missing Reset header
      })
      
      rateLimiter.updateFromHeaders(headers)
      const info = rateLimiter.getInfo()
      
      expect(info).toBeNull()
    })
  })

  describe('getInfo', () => {
    it('should return null initially', () => {
      expect(rateLimiter.getInfo()).toBeNull()
    })

    it('should return rate limit info after update', () => {
      const headers = new Headers({
        'X-RateLimit-Limit': '50',
        'X-RateLimit-Remaining': '25',
        'X-RateLimit-Reset': '1234567890'
      })
      
      rateLimiter.updateFromHeaders(headers)
      
      expect(rateLimiter.getInfo()).toEqual({
        limit: 50,
        remaining: 25,
        reset: 1234567890000
      })
    })
  })

  describe('reset', () => {
    it('should reset all state', async () => {
      // Set up some state
      rateLimiter.setMinRequestInterval(200)
      const headers = new Headers({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '50',
        'X-RateLimit-Reset': '1234567890'
      })
      rateLimiter.updateFromHeaders(headers)
      
      // Queue a request
      const promise = rateLimiter.waitIfNecessary()
      
      // Reset
      rateLimiter.reset()
      
      // Should clear everything
      expect(rateLimiter.getInfo()).toBeNull()
      
      jest.runAllTimers()
      await promise
    })
  })

  describe('setMinRequestInterval', () => {
    it('should update minimum request interval', async () => {
      rateLimiter.setMinRequestInterval(500)
      
      const promise1 = rateLimiter.waitIfNecessary()
      jest.runAllTimers()
      await promise1
      
      const promise2 = rateLimiter.waitIfNecessary()
      
      // Should wait for new interval
      jest.advanceTimersByTime(400)
      expect(jest.getTimerCount()).toBeGreaterThan(0)
      
      jest.advanceTimersByTime(100)
      await promise2
    })

    it('should handle negative values', () => {
      rateLimiter.setMinRequestInterval(-100)
      // Should be clamped to 0
      expect(rateLimiter['minRequestInterval']).toBe(0)
    })
  })
})