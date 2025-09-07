import { env } from '@/lib/config/env';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should validate and return environment variables', () => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.NEXT_PUBLIC_API_VERSION = 'v1';
    
    const config = env.getAll();
    
    expect(config.NODE_ENV).toBe('test');
    expect(config.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    expect(config.NEXT_PUBLIC_API_VERSION).toBe('v1');
  });

  it('should provide environment check methods', () => {
    process.env.NODE_ENV = 'development';
    expect(env.isDevelopment()).toBe(true);
    expect(env.isProduction()).toBe(false);
    expect(env.isTest()).toBe(false);
    
    process.env.NODE_ENV = 'production';
    expect(env.isDevelopment()).toBe(false);
    expect(env.isProduction()).toBe(true);
    expect(env.isTest()).toBe(false);
    
    process.env.NODE_ENV = 'test';
    expect(env.isDevelopment()).toBe(false);
    expect(env.isProduction()).toBe(false);
    expect(env.isTest()).toBe(true);
  });

  it('should use default values when not provided', () => {
    delete process.env.LOG_LEVEL;
    delete process.env.ENABLE_API_DOCS;
    
    const config = env.getAll();
    
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.ENABLE_API_DOCS).toBe(true);
  });

  it('should transform string values to correct types', () => {
    process.env.ENABLE_API_DOCS = 'true';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
    
    const config = env.getAll();
    
    expect(typeof config.ENABLE_API_DOCS).toBe('boolean');
    expect(config.ENABLE_API_DOCS).toBe(true);
    expect(typeof config.RATE_LIMIT_WINDOW_MS).toBe('number');
    expect(config.RATE_LIMIT_WINDOW_MS).toBe(60000);
    expect(typeof config.RATE_LIMIT_MAX_REQUESTS).toBe('number');
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(100);
  });
});