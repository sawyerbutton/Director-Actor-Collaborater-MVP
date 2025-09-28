/**
 * Retry Helper Utility
 * Implements exponential backoff retry logic for API calls
 */

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number[];
  timeout: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export class RetryHelper {
  static async withRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), config.timeout);
        });

        // Race between the actual operation and timeout
        const result = await Promise.race([fn(), timeoutPromise]);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryable(lastError)) {
          throw lastError;
        }

        // Call retry callback if provided
        if (config.onRetry) {
          config.onRetry(attempt + 1, lastError);
        }

        // Don't wait after the last attempt
        if (attempt < config.maxAttempts - 1) {
          const backoffTime = config.backoffMs[attempt] || config.backoffMs[config.backoffMs.length - 1];
          await this.sleep(backoffTime);
        }
      }
    }

    throw new Error(`Max retries (${config.maxAttempts}) exceeded. Last error: ${lastError?.message}`);
  }

  private static isRetryable(error: Error): boolean {
    // Define retryable error patterns
    const retryablePatterns = [
      'timeout',
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'network',
      'fetch',
      '429', // Rate limit
      '502', // Bad gateway
      '503', // Service unavailable
      '504'  // Gateway timeout
    ];

    const errorMessage = error.message.toLowerCase();
    return retryablePatterns.some(pattern => errorMessage.includes(pattern.toLowerCase()));
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}