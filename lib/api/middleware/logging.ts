import { NextRequest } from 'next/server';
import { env } from '@/lib/config/env';
import { LOG_LEVELS } from '@/lib/config/constants';

export interface LogContext {
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  duration?: number;
  status?: number;
  error?: any;
  requestId?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: number;

  private constructor() {
    const level = env.get('LOG_LEVEL') as keyof typeof LOG_LEVELS;
    this.logLevel = LOG_LEVELS[level.toUpperCase() as keyof typeof LOG_LEVELS] || LOG_LEVELS.INFO;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: keyof typeof LOG_LEVELS): boolean {
    return LOG_LEVELS[level] >= this.logLevel;
  }

  private formatLog(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    return `[${timestamp}] [${level}] ${message} ${contextStr}`;
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog('DEBUG')) {
      console.debug(this.formatLog('DEBUG', message, context));
    }
  }

  info(message: string, context?: any): void {
    if (this.shouldLog('INFO')) {
      console.info(this.formatLog('INFO', message, context));
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog('WARN')) {
      console.warn(this.formatLog('WARN', message, context));
    }
  }

  error(message: string, context?: any): void {
    if (this.shouldLog('ERROR')) {
      console.error(this.formatLog('ERROR', message, context));
    }
  }

  logRequest(context: LogContext): void {
    const { method, url, duration, status } = context;
    const message = `${method} ${url} - ${status} (${duration}ms)`;
    
    if (status && status >= 500) {
      this.error(message, context);
    } else if (status && status >= 400) {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }
}

export const logger = Logger.getInstance();

export function loggingMiddleware(request: NextRequest): LogContext {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams);
  
  const context: LogContext = {
    method: request.method,
    url: url.pathname,
    headers: Object.fromEntries(request.headers.entries()),
    query,
    requestId
  };

  // Log incoming request
  logger.debug(`Incoming request: ${request.method} ${url.pathname}`, {
    ...context,
    timestamp: new Date().toISOString()
  });

  // Return context for use in response logging
  return {
    ...context,
    duration: Date.now() - startTime
  };
}

export function logResponse(context: LogContext, status: number, error?: any): void {
  const enrichedContext = {
    ...context,
    status,
    error,
    duration: context.duration || 0
  };

  logger.logRequest(enrichedContext);
}