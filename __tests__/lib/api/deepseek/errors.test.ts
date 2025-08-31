import {
  DeepSeekAPIError,
  DeepSeekTimeoutError,
  DeepSeekRateLimitError,
  DeepSeekConfigError,
  logError
} from '../../../../lib/api/deepseek/errors'

describe('DeepSeek Errors', () => {
  describe('DeepSeekAPIError', () => {
    it('should create error with message, status, and code', () => {
      const error = new DeepSeekAPIError('API failed', 400, 'invalid_request')
      
      expect(error.message).toBe('API failed')
      expect(error.status).toBe(400)
      expect(error.code).toBe('invalid_request')
      expect(error.name).toBe('DeepSeekAPIError')
    })

    it('should create error with message only', () => {
      const error = new DeepSeekAPIError('API failed')
      
      expect(error.message).toBe('API failed')
      expect(error.status).toBeUndefined()
      expect(error.code).toBeUndefined()
    })
  })

  describe('DeepSeekTimeoutError', () => {
    it('should create timeout error', () => {
      const error = new DeepSeekTimeoutError('Request timed out')
      
      expect(error.message).toBe('Request timed out')
      expect(error.name).toBe('DeepSeekTimeoutError')
    })
  })

  describe('DeepSeekRateLimitError', () => {
    it('should create rate limit error with retry after', () => {
      const error = new DeepSeekRateLimitError('Rate limit exceeded', 5000)
      
      expect(error.message).toBe('Rate limit exceeded')
      expect(error.retryAfter).toBe(5000)
      expect(error.name).toBe('DeepSeekRateLimitError')
    })

    it('should create rate limit error without retry after', () => {
      const error = new DeepSeekRateLimitError('Rate limit exceeded')
      
      expect(error.message).toBe('Rate limit exceeded')
      expect(error.retryAfter).toBeUndefined()
    })
  })

  describe('DeepSeekConfigError', () => {
    it('should create config error', () => {
      const error = new DeepSeekConfigError('Invalid configuration')
      
      expect(error.message).toBe('Invalid configuration')
      expect(error.name).toBe('DeepSeekConfigError')
    })
  })

  describe('logError', () => {
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should log error with context', () => {
      const error = new DeepSeekAPIError('Test error', 500, 'server_error')
      logError(error, 'test-context')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DeepSeek Error]',
        expect.objectContaining({
          timestamp: expect.any(String),
          context: 'test-context',
          name: 'DeepSeekAPIError',
          message: 'Test error',
          status: 500,
          code: 'server_error'
        })
      )
    })

    it('should log rate limit error with retry after', () => {
      const error = new DeepSeekRateLimitError('Rate limited', 3000)
      logError(error)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DeepSeek Error]',
        expect.objectContaining({
          name: 'DeepSeekRateLimitError',
          message: 'Rate limited',
          retryAfter: 3000
        })
      )
    })

    it('should log generic error', () => {
      const error = new Error('Generic error')
      logError(error)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DeepSeek Error]',
        expect.objectContaining({
          name: 'Error',
          message: 'Generic error'
        })
      )
    })

    it('should not log in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const error = new Error('Test error')
      logError(error)

      expect(consoleErrorSpy).not.toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })
  })
})