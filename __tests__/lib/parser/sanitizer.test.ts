import { ScriptSanitizer } from '../../../lib/parser/sanitizer'

describe('ScriptSanitizer', () => {
  let sanitizer: ScriptSanitizer
  
  beforeEach(() => {
    sanitizer = new ScriptSanitizer(1024 * 1024) // 1MB limit for tests
  })
  
  describe('XSS Prevention', () => {
    it('should remove script tags', () => {
      const malicious = `INT. ROOM - DAY
      
      <script>alert('XSS')</script>
      
      JOHN:
      Hello world!`
      
      const sanitized = sanitizer.sanitizeInput(malicious)
      expect(sanitized).not.toContain('<script')
      expect(sanitized).not.toContain('</script>')
      expect(sanitized).toContain('JOHN:')
      expect(sanitized).toContain('Hello world!')
    })
    
    it('should remove iframe tags', () => {
      const malicious = `<iframe src="malicious.com"></iframe>
      
      MARY:
      Hi there!`
      
      const sanitized = sanitizer.sanitizeInput(malicious)
      expect(sanitized).not.toContain('<iframe')
      expect(sanitized).toContain('MARY:')
    })
    
    it('should remove event handlers', () => {
      const malicious = `<div onclick="alert('XSS')">
      
      Scene description`
      
      const sanitized = sanitizer.sanitizeInput(malicious)
      expect(sanitized).not.toContain('onclick=')
    })
    
    it('should remove javascript: protocol', () => {
      const malicious = `<a href="javascript:alert('XSS')">Click me</a>`
      
      const sanitized = sanitizer.sanitizeInput(malicious)
      expect(sanitized).not.toContain('javascript:')
    })
    
    it('should remove data URLs with HTML', () => {
      const malicious = `<a href="data:text/html,<script>alert('XSS')</script>">Link</a>`
      
      const sanitized = sanitizer.sanitizeInput(malicious)
      expect(sanitized).not.toContain('data:text/html')
    })
    
    it('should handle nested script tags', () => {
      const malicious = `<script><script>alert('XSS')</script></script>`
      
      const sanitized = sanitizer.sanitizeInput(malicious)
      expect(sanitized).not.toContain('<script')
    })
    
    it('should remove null bytes', () => {
      const malicious = `JOHN:\x00
      Hello\x00world!`
      
      const sanitized = sanitizer.sanitizeInput(malicious)
      expect(sanitized).not.toContain('\x00')
      expect(sanitized).toContain('Hello')
      expect(sanitized).toContain('world!')
    })
  })
  
  describe('HTML Entity Encoding', () => {
    it('should encode HTML entities', () => {
      const text = `<div>John & Mary's "dialogue" with <script>`
      const encoded = sanitizer.encodeHtmlEntities(text)
      
      expect(encoded).toBe('&lt;div&gt;John &amp; Mary&#39;s &quot;dialogue&quot; with &lt;script&gt;')
    })
    
    it('should encode special characters', () => {
      const text = `= / \` <>`
      const encoded = sanitizer.encodeHtmlEntities(text)
      
      expect(encoded).toContain('&#x3D;')
      expect(encoded).toContain('&#x2F;')
      expect(encoded).toContain('&#x60;')
      expect(encoded).toContain('&lt;')
      expect(encoded).toContain('&gt;')
    })
  })
  
  describe('Output Sanitization', () => {
    it('should sanitize string values', () => {
      const output = {
        dialogue: '<script>alert("XSS")</script>Hello'
      }
      
      const sanitized = sanitizer.sanitizeOutput(output)
      expect(sanitized.dialogue).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;Hello')
    })
    
    it('should sanitize arrays', () => {
      const output = {
        dialogues: [
          '<script>alert(1)</script>',
          'Normal text',
          '<img src=x onerror="alert(2)">'
        ]
      }
      
      const sanitized = sanitizer.sanitizeOutput(output)
      expect(sanitized.dialogues[0]).toContain('&lt;script&gt;')
      expect(sanitized.dialogues[1]).toBe('Normal text')
      expect(sanitized.dialogues[2]).toContain('&lt;img')
    })
    
    it('should sanitize nested objects', () => {
      const output = {
        scene: {
          title: '<b>Scene 1</b>',
          dialogue: {
            character: 'JOHN',
            content: '<script>alert("XSS")</script>'
          }
        }
      }
      
      const sanitized = sanitizer.sanitizeOutput(output)
      expect(sanitized.scene.title).toBe('&lt;b&gt;Scene 1&lt;&#x2F;b&gt;')
      expect(sanitized.scene.dialogue.content).toContain('&lt;script&gt;')
    })
    
    it('should preserve metadata fields', () => {
      const output = {
        parseTime: new Date('2025-01-01'),
        parseVersion: '1.0.0',
        originalLength: 1000,
        content: '<script>test</script>'
      }
      
      const sanitized = sanitizer.sanitizeOutput(output)
      expect(sanitized.parseTime).toEqual(new Date('2025-01-01'))
      expect(sanitized.parseVersion).toBe('1.0.0')
      expect(sanitized.originalLength).toBe(1000)
      expect(sanitized.content).toContain('&lt;script&gt;')
    })
  })
  
  describe('File Size Limits', () => {
    it('should reject files exceeding size limit', () => {
      const largeText = 'a'.repeat(2 * 1024 * 1024) // 2MB
      
      expect(() => sanitizer.sanitizeInput(largeText)).toThrow(/exceeds maximum allowed size/)
    })
    
    it('should accept files within size limit', () => {
      const normalText = 'a'.repeat(500 * 1024) // 500KB
      
      expect(() => sanitizer.sanitizeInput(normalText)).not.toThrow()
    })
    
    it('should allow setting custom size limit', () => {
      sanitizer.setMaxInputSize(100) // 100 bytes
      const text = 'a'.repeat(200)
      
      expect(() => sanitizer.sanitizeInput(text)).toThrow(/exceeds maximum allowed size/)
    })
    
    it('should get current size limit', () => {
      sanitizer.setMaxInputSize(5000)
      expect(sanitizer.getMaxInputSize()).toBe(5000)
    })
  })
  
  describe('Content Validation', () => {
    it('should detect script tags', () => {
      const text = `<script>alert('test')</script>`
      const validation = sanitizer.validateContent(text)
      
      expect(validation.isValid).toBe(false)
      expect(validation.warnings).toContain('Script tags detected and removed')
    })
    
    it('should detect multiple security issues', () => {
      const text = `<script>test</script>
      <iframe src="bad"></iframe>
      <div onclick="alert()">
      <a href="javascript:void(0)">
      <img src="data:text/html,test">`
      
      const validation = sanitizer.validateContent(text)
      
      expect(validation.isValid).toBe(false)
      expect(validation.warnings.length).toBeGreaterThan(3)
      expect(validation.warnings).toContain('Script tags detected and removed')
      expect(validation.warnings).toContain('Iframe tags detected and removed')
      expect(validation.warnings).toContain('Event handlers detected and removed')
    })
    
    it('should validate clean content', () => {
      const text = `INT. ROOM - DAY
      
      JOHN:
      Hello world!
      
      MARY:
      Hi there!`
      
      const validation = sanitizer.validateContent(text)
      
      expect(validation.isValid).toBe(true)
      expect(validation.warnings.length).toBe(0)
    })
  })
})