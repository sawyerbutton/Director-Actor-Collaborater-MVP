import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Sanitize string input
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [], // Strip all HTML tags for API input
      ALLOWED_ATTR: []
    });
  }
  
  if (Array.isArray(input)) {
    // Recursively sanitize array elements
    return input.map(item => sanitizeInput(item));
  }
  
  if (input && typeof input === 'object') {
    // Recursively sanitize object properties
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize the key as well
      const sanitizedKey = DOMPurify.sanitize(key, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
      sanitized[sanitizedKey] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  // Return non-string primitives as-is
  return input;
}

/**
 * Sanitize script content while preserving formatting
 */
export function sanitizeScriptContent(content: string): string {
  // For script content, we want to preserve formatting but prevent XSS
  // Remove any potential script tags or event handlers
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // No HTML tags allowed in script content
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
  });
}

/**
 * Validate request size (in bytes)
 */
export function validateRequestSize(content: string, maxSizeInMB: number = 10): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  const sizeInBytes = new Blob([content]).size;
  return sizeInBytes <= maxSizeInBytes;
}

/**
 * Request size validation error
 */
export class RequestSizeError extends Error {
  constructor(maxSizeInMB: number = 10) {
    super(`Request size exceeds maximum allowed size of ${maxSizeInMB}MB`);
    this.name = 'RequestSizeError';
  }
}