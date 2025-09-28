import { ScriptParser } from '@/lib/parser/script-parser';

describe('Parser File Format Restriction Tests', () => {
  let parser: ScriptParser;

  beforeEach(() => {
    parser = new ScriptParser();
  });

  describe('parseFile method', () => {
    it('should successfully parse TXT files', () => {
      const content = Buffer.from('Scene 1: Office\n\nJohn: Hello there!');
      const result = parser.parseFile(content, 'script.txt');

      expect(result.errors?.some(e => e.message.includes('Unsupported file format'))).toBeFalsy();
    });

    it('should successfully parse MD files', () => {
      const content = Buffer.from('# Scene 1: Office\n\n**John**: Hello there!');
      const result = parser.parseFile(content, 'script.md');

      expect(result.errors?.some(e => e.message.includes('Unsupported file format'))).toBeFalsy();
    });

    it('should successfully parse MARKDOWN files', () => {
      const content = Buffer.from('# Scene 1: Office\n\n**John**: Hello there!');
      const result = parser.parseFile(content, 'script.markdown');

      expect(result.errors?.some(e => e.message.includes('Unsupported file format'))).toBeFalsy();
    });

    it('should reject FDX files with clear error message', () => {
      const content = Buffer.from('<?xml version="1.0"?><FinalDraft></FinalDraft>');
      const result = parser.parseFile(content, 'script.fdx');

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Unsupported file format');
      expect(result.errors![0].message).toContain('.txt, .md, .markdown');
    });

    it('should reject FOUNTAIN files with clear error message', () => {
      const content = Buffer.from('INT. OFFICE - DAY\n\nJOHN\nHello there!');
      const result = parser.parseFile(content, 'script.fountain');

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Unsupported file format');
      expect(result.errors![0].message).toContain('.txt, .md, .markdown');
    });

    it('should reject DOCX files with clear error message', () => {
      const content = Buffer.from('PK'); // DOCX files start with PK (ZIP format)
      const result = parser.parseFile(content, 'script.docx');

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Unsupported file format');
    });

    it('should handle files without extension when no filename provided', () => {
      const content = Buffer.from('Scene 1: Office\n\nJohn: Hello there!');
      const result = parser.parseFile(content);

      // Should still parse when no filename is provided
      expect(result.errors?.some(e => e.message.includes('Unsupported file format'))).toBeFalsy();
    });

    it('should be case-insensitive for file extensions', () => {
      const content = Buffer.from('Scene 1: Office\n\nJohn: Hello there!');

      const txtResult = parser.parseFile(content, 'SCRIPT.TXT');
      expect(txtResult.errors?.some(e => e.message.includes('Unsupported file format'))).toBeFalsy();

      const mdResult = parser.parseFile(content, 'SCRIPT.MD');
      expect(mdResult.errors?.some(e => e.message.includes('Unsupported file format'))).toBeFalsy();

      const fdxResult = parser.parseFile(content, 'SCRIPT.FDX');
      expect(fdxResult.errors?.[0].message).toContain('Unsupported file format');
    });
  });

  describe('parse method', () => {
    it('should not have format restrictions for direct text parsing', () => {
      const content = 'INT. OFFICE - DAY\n\nJOHN\nHello there!';
      const result = parser.parse(content);

      // Direct text parsing should work regardless of content
      expect(result.errors?.some(e => e.message.includes('Unsupported file format'))).toBeFalsy();
    });
  });

  describe('Error messages', () => {
    it('should provide helpful error message listing supported formats', () => {
      const content = Buffer.from('test content');
      const result = parser.parseFile(content, 'script.invalid');

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toMatch(/Only .* files are supported/);
      expect(result.errors![0].message).toContain('.txt');
      expect(result.errors![0].message).toContain('.md');
      expect(result.errors![0].message).toContain('.markdown');
    });

    it('should set error type correctly', () => {
      const content = Buffer.from('test content');
      const result = parser.parseFile(content, 'script.fdx');

      expect(result.errors).toBeDefined();
      expect(result.errors![0].type).toBe('error');
    });
  });
});