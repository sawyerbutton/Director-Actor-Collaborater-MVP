#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Ensures all required environment variables are set before deployment
 */

const requiredEnvVars = {
  // Core Application
  'NODE_ENV': 'Environment mode (development/test/production)',
  'NEXTAUTH_URL': 'NextAuth base URL',
  'NEXTAUTH_SECRET': 'NextAuth secret key (min 32 characters)',
  
  // Database
  'DATABASE_URL': 'PostgreSQL connection string',
  
  // AI Service
  'DEEPSEEK_API_KEY': 'DeepSeek API key',
  
  // Production only
  ...(process.env.NODE_ENV === 'production' ? {
    'NEXT_PUBLIC_APP_URL': 'Public application URL',
    'REDIS_URL': 'Redis connection string for rate limiting',
  } : {})
};

const optionalEnvVars = {
  'DIRECT_DATABASE_URL': 'Direct database connection (for migrations)',
  'DEEPSEEK_API_ENDPOINT': 'DeepSeek API endpoint (defaults to https://api.deepseek.com/v1)',
  'RATE_LIMIT_WINDOW_MS': 'Rate limit window in milliseconds',
  'RATE_LIMIT_MAX_REQUESTS': 'Max requests per rate limit window',
  'SENTRY_DSN': 'Sentry error tracking DSN',
  'NEXT_PUBLIC_GA_ID': 'Google Analytics ID',
};

console.log('🔍 Checking environment variables...\n');

let hasErrors = false;
const missingRequired = [];
const presentOptional = [];

// Check required variables
for (const [key, description] of Object.entries(requiredEnvVars)) {
  if (!process.env[key]) {
    console.error(`❌ Missing required: ${key}`);
    console.error(`   ${description}`);
    missingRequired.push(key);
    hasErrors = true;
  } else {
    console.log(`✅ ${key}: Set`);
    
    // Additional validations
    if (key === 'NEXTAUTH_SECRET' && process.env[key].length < 32) {
      console.error(`   ⚠️  Warning: NEXTAUTH_SECRET should be at least 32 characters`);
    }
    
    if (key === 'DATABASE_URL' && !process.env[key].includes('postgresql://')) {
      console.error(`   ⚠️  Warning: DATABASE_URL should be a PostgreSQL connection string`);
    }
  }
}

console.log('\n📋 Optional variables:');

// Check optional variables
for (const [key, description] of Object.entries(optionalEnvVars)) {
  if (process.env[key]) {
    console.log(`✅ ${key}: Set`);
    presentOptional.push(key);
  } else {
    console.log(`➖ ${key}: Not set (${description})`);
  }
}

// Summary
console.log('\n📊 Summary:');
console.log(`Required: ${Object.keys(requiredEnvVars).length - missingRequired.length}/${Object.keys(requiredEnvVars).length} set`);
console.log(`Optional: ${presentOptional.length}/${Object.keys(optionalEnvVars).length} set`);

if (hasErrors) {
  console.error('\n❌ Environment validation failed!');
  console.error('Please set all required environment variables before deployment.');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
  
  // Additional warnings for production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.REDIS_URL) {
      console.warn('\n⚠️  Warning: REDIS_URL not set - rate limiting will use in-memory storage (not recommended for production)');
    }
    
    if (!process.env.SENTRY_DSN) {
      console.warn('⚠️  Warning: SENTRY_DSN not set - error tracking disabled');
    }
  }
  
  process.exit(0);
}