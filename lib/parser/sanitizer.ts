/**
 * Security sanitizer for script parser
 * Prevents XSS attacks by sanitizing user input
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
}

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
  /data:text\/html/gi,
  /vbscript:/gi
]

export class ScriptSanitizer {
  private maxInputSize: number
  
  constructor(maxInputSizeBytes: number = 10 * 1024 * 1024) { // 10MB default
    this.maxInputSize = maxInputSizeBytes
  }
  
  /**
   * Sanitize input text to prevent XSS attacks
   */
  public sanitizeInput(text: string): string {
    // Check file size
    const sizeInBytes = new Blob([text]).size
    if (sizeInBytes > this.maxInputSize) {
      throw new Error(`Input size (${sizeInBytes} bytes) exceeds maximum allowed size (${this.maxInputSize} bytes)`)
    }
    
    // Remove dangerous patterns
    let sanitized = text
    for (const pattern of DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '')
    }
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '')
    
    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    return sanitized
  }
  
  /**
   * Encode HTML entities in output to prevent XSS when displaying
   */
  public encodeHtmlEntities(text: string): string {
    return text.replace(/[&<>"'`=\/]/g, (match) => HTML_ENTITIES[match] || match)
  }
  
  /**
   * Sanitize output for safe display
   */
  public sanitizeOutput(obj: any): any {
    if (typeof obj === 'string') {
      return this.encodeHtmlEntities(obj)
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeOutput(item))
    }
    
    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Skip sanitizing certain metadata fields
          if (key === 'parseTime' || key === 'parseVersion' || key === 'originalLength') {
            sanitized[key] = obj[key]
          } else {
            sanitized[key] = this.sanitizeOutput(obj[key])
          }
        }
      }
      return sanitized
    }
    
    return obj
  }
  
  /**
   * Validate script content for suspicious patterns
   */
  public validateContent(text: string): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = []
    
    // Check for script tags
    if (/<script/i.test(text)) {
      warnings.push('Script tags detected and removed')
    }
    
    // Check for iframe tags
    if (/<iframe/i.test(text)) {
      warnings.push('Iframe tags detected and removed')
    }
    
    // Check for event handlers
    if (/on\w+\s*=/i.test(text)) {
      warnings.push('Event handlers detected and removed')
    }
    
    // Check for javascript: protocol
    if (/javascript:/i.test(text)) {
      warnings.push('JavaScript protocol detected and removed')
    }
    
    // Check for data URLs with HTML
    if (/data:text\/html/i.test(text)) {
      warnings.push('Data URLs with HTML detected and removed')
    }
    
    return {
      isValid: warnings.length === 0,
      warnings
    }
  }
  
  /**
   * Set maximum input size
   */
  public setMaxInputSize(bytes: number): void {
    this.maxInputSize = bytes
  }
  
  /**
   * Get maximum input size
   */
  public getMaxInputSize(): number {
    return this.maxInputSize
  }
}