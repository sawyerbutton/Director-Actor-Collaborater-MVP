describe('Simple Unit Test', () => {
  it('should perform basic math', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle strings', () => {
    const str = 'Hello World';
    expect(str).toContain('World');
  });

  it('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });
});