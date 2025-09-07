import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_API_VERSION: z.string().default('v1'),
  
  // Database
  DATABASE_URL: z.string().url().optional(),
  
  // Authentication
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  
  // AI Service
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_API_URL: z.string().url().optional(),
  
  // Monitoring
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_API_DOCS: z.string().optional().transform(val => val === 'true').default(() => 'true'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().optional().transform(val => Number(val || 60000)).default(() => '60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().optional().transform(val => Number(val || 100)).default(() => '100')
});

export type Env = z.infer<typeof envSchema>;

class EnvManager {
  private static instance: EnvManager;
  private env: Env | null = null;

  private constructor() {}

  static getInstance(): EnvManager {
    if (!EnvManager.instance) {
      EnvManager.instance = new EnvManager();
    }
    return EnvManager.instance;
  }

  static resetInstance(): void {
    EnvManager.instance = null as any;
  }

  validate(): Env {
    // Don't cache in test environment
    if (this.env && process.env.NODE_ENV !== 'test') {
      return this.env;
    }

    try {
      this.env = envSchema.parse(process.env);
      return this.env;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join('\n');
        
        console.error('Environment validation failed:\n', issues);
        
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Invalid environment configuration');
        }
      }
      throw error;
    }
  }

  get(key: keyof Env): any {
    const env = this.validate();
    return env[key];
  }

  getAll(): Env {
    return this.validate();
  }

  isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  isTest(): boolean {
    return this.get('NODE_ENV') === 'test';
  }
}

export const env = EnvManager.getInstance();

export function validateEnv(): void {
  env.validate();
  console.log(`Environment validated successfully for ${env.get('NODE_ENV')} mode`);
}