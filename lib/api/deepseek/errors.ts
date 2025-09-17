export class DeepSeekAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'DeepSeekAPIError'
  }
}

export class DeepSeekTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeepSeekTimeoutError'
  }
}

export class DeepSeekRateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'DeepSeekRateLimitError'
  }
}

export class DeepSeekConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeepSeekConfigError'
  }
}

export function logError(error: Error, context?: string): void {
  const timestamp = new Date().toISOString()
  const errorInfo = {
    timestamp,
    context,
    name: error.name,
    message: error.message,
    ...(error instanceof DeepSeekAPIError && {
      status: error.status,
      code: error.code
    }),
    ...(error instanceof DeepSeekRateLimitError && {
      retryAfter: error.retryAfter
    })
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.error('[DeepSeek Error]', errorInfo)
  }
  
  // In production, you might want to send this to a logging service
}