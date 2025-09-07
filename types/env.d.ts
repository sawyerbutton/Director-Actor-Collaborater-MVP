declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Application
      NODE_ENV: 'development' | 'production' | 'test';
      NEXT_PUBLIC_APP_URL: string;
      NEXT_PUBLIC_API_VERSION: string;
      
      // Database
      DATABASE_URL?: string;
      
      // Authentication
      NEXTAUTH_URL?: string;
      NEXTAUTH_SECRET?: string;
      
      // AI Service
      DEEPSEEK_API_KEY?: string;
      DEEPSEEK_API_URL?: string;
      
      // Monitoring
      LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
      ENABLE_API_DOCS?: string;
      
      // Rate Limiting
      RATE_LIMIT_WINDOW_MS?: string;
      RATE_LIMIT_MAX_REQUESTS?: string;
    }
  }
}

export {};