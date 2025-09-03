/**
 * Input sanitization utilities for XSS prevention
 */

/**
 * Sanitize text input to prevent XSS attacks
 * Escapes HTML entities and removes dangerous patterns
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // HTML entity encoding
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  let sanitized = input.replace(/[&<>"'\/]/g, char => htmlEntities[char]);
  
  // Remove dangerous patterns
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URIs that could contain scripts
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  // Remove on* event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Remove script tags (even encoded ones)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  return sanitized;
}

/**
 * Sanitize file name to prevent path traversal
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';
  
  // Remove path traversal patterns
  let sanitized = fileName.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[\/\\]/g, '_');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const extension = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 250) + extension;
  }
  
  return sanitized;
}

/**
 * Validate and sanitize JSON strings
 */
export function sanitizeJSON(jsonString: string): object | null {
  try {
    // Parse JSON to validate structure
    const parsed = JSON.parse(jsonString);
    
    // Recursively sanitize string values
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeInput(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          // Sanitize keys as well
          const sanitizedKey = sanitizeInput(key);
          sanitized[sanitizedKey] = sanitizeObject(obj[key]);
        }
        return sanitized;
      }
      return obj;
    };
    
    return sanitizeObject(parsed);
  } catch (error) {
    console.error('Invalid JSON:', error);
    return null;
  }
}

/**
 * Create a content security policy for preventing XSS
 */
export function getCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
    "style-src 'self' 'unsafe-inline'", // For Tailwind CSS
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.deepseek.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}