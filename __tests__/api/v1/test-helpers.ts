import { NextRequest } from 'next/server';

// Helper to create mock NextRequest for testing
export function createMockRequest(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    searchParams?: Record<string, string>;
  }
): NextRequest {
  const fullUrl = new URL(url, 'http://localhost:3000');
  
  // Add search params if provided
  if (options?.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value);
    });
  }

  // Create init options
  const init: RequestInit = {
    method: options?.method || 'GET',
    headers: options?.headers || {},
  };

  // Add body if provided
  if (options?.body) {
    init.body = typeof options.body === 'string' 
      ? options.body 
      : JSON.stringify(options.body);
  }

  // Create mock request with proper json() method
  const mockRequest = {
    url: fullUrl.toString(),
    method: init.method,
    headers: {
      get: (key: string) => {
        const headers = init.headers as Record<string, string>;
        return headers[key] || null;
      },
      has: (key: string) => {
        const headers = init.headers as Record<string, string>;
        return key in headers;
      },
      forEach: (callback: (value: string, key: string) => void) => {
        const headers = init.headers as Record<string, string>;
        Object.entries(headers).forEach(([key, value]) => callback(value, key));
      },
      entries: () => {
        const headers = init.headers as Record<string, string>;
        return Object.entries(headers)[Symbol.iterator]();
      }
    },
    nextUrl: fullUrl,
    json: async () => {
      if (typeof options?.body === 'object') {
        return options.body;
      }
      return options?.body ? JSON.parse(options.body) : {};
    },
    text: async () => {
      return typeof options?.body === 'string' ? options.body : JSON.stringify(options?.body || '');
    }
  };

  // Return as NextRequest-like object
  return mockRequest as unknown as NextRequest;
}

// Helper to get headers from NextRequest
export function getMockHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  if (request.headers instanceof Map) {
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (request.headers && typeof request.headers.get === 'function') {
    // Handle Headers object
    ['authorization', 'content-type'].forEach(key => {
      const value = request.headers.get(key);
      if (value) headers[key] = value;
    });
  }
  return headers;
}