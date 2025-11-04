/**
 * Python Script Converter Service Client
 *
 * TypeScript client for communicating with Python FastAPI conversion service
 */

// ===================
// Types
// ===================

export interface ScriptConversionRequest {
  file_id: string;
  raw_content: string;
  filename: string;
  episode_number?: number;
}

export interface ConversionError {
  code: string;
  message: string;
  details?: Record<string, any>;
  line_number?: number;
}

export interface ConversionResponse {
  success: boolean;
  file_id: string;
  json_content: Record<string, any> | null;
  error: ConversionError | null;
  processing_time_ms: number;
  metadata?: Record<string, any>;
}

export interface OutlineConversionRequest {
  project_id: string;
  files: ScriptConversionRequest[];
}

export interface OutlineConversionResponse {
  project_id: string;
  total_files: number;
  successful: number;
  failed: number;
  results: ConversionResponse[];
  total_processing_time_ms: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

// ===================
// Configuration
// ===================

const DEFAULT_BASE_URL = process.env.PYTHON_CONVERTER_URL || 'http://localhost:8001';
const DEFAULT_TIMEOUT = 120000; // 120 seconds for large scripts
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// ===================
// Client
// ===================

export class PythonConverterClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config?: {
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
  }) {
    this.baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
    this.timeout = config?.timeout || DEFAULT_TIMEOUT;
    this.maxRetries = config?.maxRetries || MAX_RETRIES;
  }

  /**
   * Health check endpoint
   */
  async getHealth(): Promise<HealthResponse> {
    const response = await this.fetch('/health', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Convert a single script file
   */
  async convertScript(request: ScriptConversionRequest): Promise<ConversionResponse> {
    const response = await this.fetchWithRetry('/api/v1/convert/script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Script conversion failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as ConversionResponse;

    // Even with 200 status, check if conversion succeeded
    if (!result.success && result.error) {
      throw new ConversionServiceError(result.error);
    }

    return result;
  }

  /**
   * Convert multiple script files (batch)
   */
  async convertOutline(request: OutlineConversionRequest): Promise<OutlineConversionResponse> {
    const response = await this.fetchWithRetry('/api/v1/convert/outline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Outline conversion failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch with timeout support
   */
  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch with automatic retry on transient failures
   */
  private async fetchWithRetry(path: string, init?: RequestInit): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetch(path, init);

        // Retry on 5xx server errors
        if (response.status >= 500 && response.status < 600) {
          lastError = new Error(`Server error: ${response.status}`);

          if (attempt < this.maxRetries) {
            await this.delay(RETRY_DELAY * attempt);
            continue;
          }
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx client errors or timeouts on last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Retry on network errors
        console.warn(`[PythonConverterClient] Attempt ${attempt} failed, retrying...`, error);
        await this.delay(RETRY_DELAY * attempt);
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===================
// Custom Errors
// ===================

export class ConversionServiceError extends Error {
  public code: string;
  public details?: Record<string, any>;
  public line_number?: number;

  constructor(error: ConversionError) {
    super(error.message);
    this.name = 'ConversionServiceError';
    this.code = error.code;
    this.details = error.details;
    this.line_number = error.line_number;
  }
}

// ===================
// Singleton Instance
// ===================

export const pythonConverterClient = new PythonConverterClient();
