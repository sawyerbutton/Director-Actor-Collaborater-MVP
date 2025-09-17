/**
 * Constants for the Consistency Guardian Agent system
 */

// Analysis thresholds for consistency scoring
export const CONSISTENCY_THRESHOLDS = {
  EXCELLENT: { critical: 0, high: 0, medium: 0 },
  GOOD: { critical: 0, high: 2, medium: 5 },
  FAIR: { critical: 1, high: 5, medium: 10 },
  POOR: { critical: 2, high: 10, medium: 20 }
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  MAX_SIZE: 100,
  TTL_MS: 1800000, // 30 minutes
  CLEANUP_INTERVAL_MS: 300000 // 5 minutes
} as const;

// Performance configuration
export const PERFORMANCE_CONFIG = {
  MAX_CONCURRENT_CHUNKS: 3,
  DEFAULT_CHUNK_SIZE: 10, // scenes per chunk
  MAX_CHUNK_SIZE: 20,
  MIN_CHUNK_SIZE: 5,
  DEFAULT_TIMEOUT_MS: 30000,
  MAX_ERRORS_DEFAULT: 50
} as const;

// Report generation thresholds
export const REPORT_CONFIG = {
  DOMINANT_ERROR_THRESHOLD: 0.3, // 30% of total errors
  MAX_ERROR_TYPES_TO_SHOW: 5,
  HIGH_SEVERITY_WEIGHT: 0.7,
  CRITICAL_SEVERITY_WEIGHT: 1.0,
  MEDIUM_SEVERITY_WEIGHT: 0.3
} as const;

// Error detection patterns
export const ERROR_DETECTION_CONFIG = {
  MIN_DIALOGUE_LENGTH: 10, // characters
  MAX_CHARACTER_NAME_DISTANCE: 3, // Levenshtein distance
  TIME_REFERENCE_PATTERNS: [
    /yesterday/i,
    /tomorrow/i,
    /last\s+(week|month|year)/i,
    /next\s+(week|month|year)/i,
    /\d+\s+(hours?|days?|weeks?|months?|years?)\s+(ago|later|from now)/i
  ],
  SCENE_TRANSITION_TIME_MS: 5000 // Assumed time for scene transitions
} as const;

// API configuration
export const API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  EXPONENTIAL_BACKOFF_FACTOR: 2,
  MAX_TOKENS_PER_REQUEST: 4000,
  TEMPERATURE: 0.3,
  TOP_P: 0.95
} as const;