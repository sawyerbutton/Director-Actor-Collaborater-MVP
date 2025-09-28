# Local Deployment Notes - Story 4.1 Testing

## Overview
This document records all modifications made during local testing of the production deployment.
**IMPORTANT**: These changes are for LOCAL TESTING ONLY and must be reverted before production deployment.

## 🚨 Critical Temporary Modifications (MUST REVERT)

### 1. Authentication Configuration (`/lib/auth.ts`)
**Changes Made:**
```typescript
// Added for local testing - REMOVE FOR PRODUCTION
trustHost: true, // Line 20 - Allows any host (security compromise)

cookies: {
  csrfToken: {
    name: `next-auth.csrf-token`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false, // Line 31 - Allow HTTP for local testing - MUST BE true IN PRODUCTION
    },
  },
},
```
**Reason**: NextAuth was rejecting localhost:3001 as untrusted host
**Production Fix**: Remove `trustHost: true` and set `secure: true` in cookie options

### 2. Rate Limiting Disabled (`/app/api/auth/[...nextauth]/route.ts`)
**Changes Made:**
```typescript
// Temporarily disabled rate limiting - entire middleware commented out
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```
**Reason**: Rate limiting was blocking authentication testing after failed CSRF attempts
**Production Fix**: Re-enable the full rate limiting middleware

### 3. Authentication Approach Changed
**Files Added (Temporary workaround):**
- `/app/auth/login/actions.ts` - Server action for authentication
- `/components/auth/simple-login-form.tsx` - Form using server actions

**Files Modified:**
- `/app/auth/login/page.tsx` - Changed from `LoginForm` to `SimpleLoginForm`

**Reason**: Client-side CSRF token handling wasn't working in production mode
**Production Consideration**: Evaluate if server actions are preferred or fix client-side CSRF handling

## ✅ Permanent Changes (Can Keep)

### 1. Test User Creation Script
**File**: `/scripts/create-test-user.js`
- Creates test user: test@example.com / test123
- Useful for development and testing
- Can be kept but shouldn't be run in production

### 2. Production Environment File
**File**: `.env.production.local`
- Contains production-like configuration for local testing
- Should be in .gitignore (already is)
- Template can be used for actual production deployment

## 📋 Local Deployment Process

### Prerequisites
1. Docker Desktop running with PostgreSQL container
2. Node.js 18+ installed
3. Environment variables configured

### Steps for Local Production Testing
```bash
# 1. Ensure Docker is running
docker ps

# 2. Set up production environment
cp .env.production.local .env

# 3. Push database schema
DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public" npx prisma db push --skip-generate

# 4. Create test user
node scripts/create-test-user.js

# 5. Build production version
NODE_ENV=production npm run build

# 6. Start production server
PORT=3001 NODE_ENV=production NEXTAUTH_URL=http://localhost:3001 NEXTAUTH_SECRET=cH4DkxQeb2P86mD4Q26yiSfa1uH5zPZMnNu613YcBmM= DATABASE_URL="postgresql://director_user:director_pass_2024@localhost:5432/director_actor_db?schema=public" DEEPSEEK_API_KEY=sk-5883c69dce7045fba8585a60e95b98b9 NEXT_PUBLIC_APP_URL=http://localhost:3001 npm start

# 7. Access application
# Open browser to http://localhost:3001
```

## 🔄 Reverting Changes for Production

### Before Production Deployment Checklist:
- [ ] Remove `trustHost: true` from `/lib/auth.ts`
- [ ] Set `secure: true` in CSRF cookie options in `/lib/auth.ts`
- [ ] Re-enable rate limiting in `/app/api/auth/[...nextauth]/route.ts`
- [ ] Decide on authentication approach (server actions vs client-side)
- [ ] Remove or update test user creation script
- [ ] Update environment variables for production domain
- [ ] Ensure all TypeScript errors are resolved
- [ ] Run full test suite

### Git Commands to Revert:
```bash
# Check modified files
git status

# Revert authentication configuration
git checkout -- lib/auth.ts

# Revert rate limiting
git checkout -- app/api/auth/[...nextauth]/route.ts

# Remove temporary server action files (if reverting to client-side auth)
git rm app/auth/login/actions.ts
git rm components/auth/simple-login-form.tsx

# Revert login page to use original form
git checkout -- app/auth/login/page.tsx
```

## 📝 Notes on Issues Encountered

### CSRF Token Issue
- **Problem**: NextAuth v5 CSRF protection wasn't working with client-side signIn
- **Symptoms**: "MissingCSRF" error despite token being available
- **Temporary Fix**: Switched to server actions which bypass client-side CSRF
- **Long-term Fix**: Investigate NextAuth v5 CSRF handling or stick with server actions

### TypeScript/ESLint Warnings
- Several type warnings in production build
- Don't affect functionality but should be addressed
- Main issues in:
  - Rate limiting middleware types
  - AI service implementations
  - Component prop types

## 🚀 Production Deployment Recommendations

1. **Use environment-specific configurations**
   - Separate .env files for dev/staging/production
   - Use CI/CD secrets for sensitive values

2. **Security hardening**
   - Enable all security features (CSRF, rate limiting, etc.)
   - Use HTTPS only in production
   - Implement proper session management

3. **Database considerations**
   - Use connection pooling for production
   - Implement proper migrations strategy
   - Regular backups

4. **Monitoring**
   - Add error tracking (Sentry, etc.)
   - Implement performance monitoring
   - Set up alerts for authentication failures

## Last Updated
Date: 2025-09-10
Updated by: BMad Product Owner (via Claude Code)
Story: 4.1 - Production Deployment Preparation