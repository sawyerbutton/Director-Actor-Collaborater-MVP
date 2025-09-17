import { 
  validateConfig, 
  loadConfigFromEnv, 
  getDefaultConfig, 
  mergeConfig 
} from '../../../../lib/api/deepseek/config'
import { DeepSeekConfigError } from '../../../../lib/api/deepseek/errors'

describe('DeepSeek Config', () => {
  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const config = {
        apiKey: 'test-key',
        apiEndpoint: 'https://api.deepseek.com/v1',
        maxRetries: 3,
        timeout: 5000
      }

      const result = validateConfig(config)
      expect(result).toEqual(config)
    })

    it('should throw error for missing API key', () => {
      const config = {
        apiEndpoint: 'https://api.deepseek.com/v1'
      }

      expect(() => validateConfig(config)).toThrow(DeepSeekConfigError)
      expect(() => validateConfig(config)).toThrow('API key is required')
    })

    it('should throw error for missing API endpoint', () => {
      const config = {
        apiKey: 'test-key'
      }

      expect(() => validateConfig(config)).toThrow(DeepSeekConfigError)
      expect(() => validateConfig(config)).toThrow('API endpoint is required')
    })

    it('should throw error for invalid API endpoint URL', () => {
      const config = {
        apiKey: 'test-key',
        apiEndpoint: 'not-a-valid-url'
      }

      expect(() => validateConfig(config)).toThrow(DeepSeekConfigError)
      expect(() => validateConfig(config)).toThrow('API endpoint must be a valid URL')
    })

    it('should throw error for invalid maxRetries', () => {
      const config = {
        apiKey: 'test-key',
        apiEndpoint: 'https://api.deepseek.com/v1',
        maxRetries: -1
      }

      expect(() => validateConfig(config)).toThrow(DeepSeekConfigError)
      expect(() => validateConfig(config)).toThrow('Max retries must be between 0 and 10')
    })

    it('should throw error for maxRetries > 10', () => {
      const config = {
        apiKey: 'test-key',
        apiEndpoint: 'https://api.deepseek.com/v1',
        maxRetries: 11
      }

      expect(() => validateConfig(config)).toThrow(DeepSeekConfigError)
      expect(() => validateConfig(config)).toThrow('Max retries must be between 0 and 10')
    })

    it('should throw error for invalid timeout', () => {
      const config = {
        apiKey: 'test-key',
        apiEndpoint: 'https://api.deepseek.com/v1',
        timeout: 500
      }

      expect(() => validateConfig(config)).toThrow(DeepSeekConfigError)
      expect(() => validateConfig(config)).toThrow('Timeout must be between 1000ms and 120000ms')
    })

    it('should throw error for timeout > 120000', () => {
      const config = {
        apiKey: 'test-key',
        apiEndpoint: 'https://api.deepseek.com/v1',
        timeout: 130000
      }

      expect(() => validateConfig(config)).toThrow(DeepSeekConfigError)
      expect(() => validateConfig(config)).toThrow('Timeout must be between 1000ms and 120000ms')
    })

    it('should throw error with multiple validation failures', () => {
      const config = {
        apiEndpoint: 'invalid-url',
        maxRetries: -1,
        timeout: 100
      }

      expect(() => validateConfig(config)).toThrow(DeepSeekConfigError)
      expect(() => validateConfig(config)).toThrow(/API key is required.*API endpoint must be a valid URL.*Max retries.*Timeout/)
    })
  })

  describe('loadConfigFromEnv', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should load config from environment variables', () => {
      process.env.DEEPSEEK_API_KEY = 'env-test-key'
      process.env.DEEPSEEK_API_ENDPOINT = 'https://api.example.com'
      process.env.DEEPSEEK_MAX_RETRIES = '5'
      process.env.DEEPSEEK_TIMEOUT = '10000'

      const config = loadConfigFromEnv()

      expect(config).toEqual({
        apiKey: 'env-test-key',
        apiEndpoint: 'https://api.example.com',
        maxRetries: 5,
        timeout: 10000
      })
    })

    it('should use default values when env vars not set', () => {
      process.env.DEEPSEEK_API_KEY = 'env-test-key'

      const config = loadConfigFromEnv()

      expect(config).toEqual({
        apiKey: 'env-test-key',
        apiEndpoint: 'https://api.deepseek.com/v1',
        maxRetries: 3,
        timeout: 30000
      })
    })

    it('should throw error when API key not in env', () => {
      delete process.env.DEEPSEEK_API_KEY

      expect(() => loadConfigFromEnv()).toThrow(DeepSeekConfigError)
      expect(() => loadConfigFromEnv()).toThrow('API key is required')
    })
  })

  describe('getDefaultConfig', () => {
    it('should return default config values', () => {
      const defaults = getDefaultConfig()

      expect(defaults).toEqual({
        apiEndpoint: 'https://api.deepseek.com/v1',
        maxRetries: 3,
        timeout: 30000
      })
    })
  })

  describe('mergeConfig', () => {
    it('should merge configs with defaults', () => {
      const base = {
        apiKey: 'base-key'
      }

      const override = {
        maxRetries: 5,
        timeout: 10000
      }

      const result = mergeConfig(base, override)

      expect(result).toEqual({
        apiKey: 'base-key',
        apiEndpoint: 'https://api.deepseek.com/v1',
        maxRetries: 5,
        timeout: 10000
      })
    })

    it('should override base config values', () => {
      const base = {
        apiKey: 'base-key',
        apiEndpoint: 'https://base.api.com',
        maxRetries: 2
      }

      const override = {
        apiKey: 'override-key',
        maxRetries: 5
      }

      const result = mergeConfig(base, override)

      expect(result).toEqual({
        apiKey: 'override-key',
        apiEndpoint: 'https://base.api.com',
        maxRetries: 5,
        timeout: 30000
      })
    })

    it('should validate merged config', () => {
      const base = {
        apiEndpoint: 'https://api.deepseek.com/v1'
      }

      const override = {
        maxRetries: 15 // Invalid
      }

      expect(() => mergeConfig(base, override)).toThrow(DeepSeekConfigError)
    })
  })
})