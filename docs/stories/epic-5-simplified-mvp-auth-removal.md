# Epic 5: Simplified MVP - Remove Authentication Module

## Epic Goal

Remove the NextAuth authentication system from the Director-Actor-Collaborator MVP to create a simplified, barrier-free demo experience that focuses on the core multi-agent script editing functionality without requiring user registration or login.

## Epic Description

### Existing System Context

- **Current relevant functionality:** Full NextAuth integration with JWT sessions, credential-based authentication, protected routes via middleware, and user-specific data isolation
- **Technology stack:** Next.js 14+ (App Router), NextAuth v5, Prisma ORM with PostgreSQL, TypeScript, Tailwind CSS
- **Integration points:**
  - `/lib/auth.ts` - NextAuth configuration
  - `/middleware.ts` - Route protection logic
  - Multiple page components checking session state
  - Database User model and session management

### Enhancement Details

**What's being changed:**
- Complete removal of NextAuth dependencies and authentication logic
- Replacement with a default/guest user system for immediate access
- Simplification of middleware to remove auth checks
- Modification of all protected pages to work without authentication
- Database operations to use default user context

**How it integrates:**
- Implement a `getDefaultUser()` function to replace `auth()` session checks
- Create a mock session context for components that expect user data
- Maintain database compatibility by using a single default user record
- Keep existing API structure but remove auth validation

**Success criteria:**
- Application loads directly to main functionality without login
- All core features (script creation, multi-agent editing, revision) work immediately
- No authentication-related errors or redirects
- Code changes are reversible through git history
- Database maintains compatibility with future auth re-implementation

## Stories

### Story 1: Remove Authentication Dependencies and Create Default User System
**Description:** Remove NextAuth package and dependencies, create a default user mechanism that replaces session checks throughout the application. This includes creating utility functions for default user context and updating the database to support a default user record.

### Story 2: Simplify Middleware and Update Protected Routes
**Description:** Remove authentication checks from middleware.ts, update all protected page components (dashboard, projects, analysis, settings) to work without session validation, and ensure direct access to core functionality.

### Story 3: Cleanup UI and Optimize User Flow
**Description:** Remove login/register/forgot-password pages, update navigation to remove auth-related links, simplify the landing page to directly showcase core features, and ensure the 3-step workflow (create script → edit with agents → review changes) is immediately accessible.

## Compatibility Requirements

- [x] Existing APIs remain structurally unchanged (auth validation removed)
- [x] Database schema changes are backward compatible (default user added, no schema modifications)
- [x] UI changes follow existing Tailwind/shadcn patterns
- [x] Performance impact is minimal (actually improved due to no auth overhead)
- [x] Changes are tracked in git for easy reversal

## Risk Mitigation

**Primary Risk:** Loss of user data isolation and security in production environment
**Mitigation:**
- Clear documentation that this is a demo-only configuration
- Environment variable flag to distinguish demo vs production mode
- Preserved auth code structure for easy re-implementation
- Default user clearly marked in database

**Rollback Plan:**
- All changes committed with clear commit messages
- Original auth implementation preserved in git history
- Re-enable by reverting commits or cherry-picking auth restoration
- Database compatible with both modes

## Definition of Done

- [ ] All stories completed with acceptance criteria met
- [ ] Core multi-agent functionality verified (create, edit, revise scripts)
- [ ] No authentication prompts or barriers to access
- [ ] Application starts directly at main functionality
- [ ] Documentation updated with demo setup instructions
- [ ] No regression in core script editing features
- [ ] Code is clean, commented for reversibility
- [ ] Default user properly initialized in database
- [ ] 3-step workflow validated: Open → Edit → Review

## Implementation Notes

### Technical Considerations

1. **Default User Implementation:**
   ```typescript
   // Replace auth() calls with:
   export async function getDefaultUser() {
     return {
       user: {
         id: 'default-user',
         email: 'demo@example.com',
         name: 'Demo User'
       }
     }
   }
   ```

2. **Database Seeding:**
   - Create migration to add default user if not exists
   - Ensure all operations reference this user

3. **Environment Configuration:**
   - Add `DEMO_MODE=true` flag
   - Conditional imports based on mode for future flexibility

### File Impact Analysis

**Files to Modify:**
- `/lib/auth.ts` → `/lib/mock-auth.ts`
- `/middleware.ts` → Remove auth checks
- All page.tsx files with auth checks
- Navigation components
- Database seed scripts

**Files to Remove:**
- `/app/auth/*` directory
- Auth-related API routes
- NextAuth configuration files

### Validation Checklist

Before marking complete:
- [ ] Can access dashboard immediately without login
- [ ] Can create new script without authentication
- [ ] Can edit script with multiple agents
- [ ] Can review and save changes
- [ ] No auth-related errors in console
- [ ] Database operations work with default user
- [ ] UI is clean without auth elements
- [ ] Documentation reflects demo setup

---

## Story Manager Handoff

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing Next.js 14+ system with App Router, TypeScript, Prisma, and PostgreSQL
- Integration points: All components currently using `auth()` from NextAuth, middleware.ts protecting routes, database User model
- Existing patterns to follow: Server components with async data fetching, Tailwind CSS for styling, shadcn/ui components
- Critical compatibility requirements: Database schema backward compatibility, git-reversible changes, maintain core functionality
- Each story must include verification that core multi-agent editing functionality remains intact

The epic should maintain system integrity while delivering a simplified, authentication-free demo experience that showcases the Director-Actor-Collaborator pattern immediately upon access."