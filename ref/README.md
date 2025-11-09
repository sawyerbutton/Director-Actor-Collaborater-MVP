# Reference Documentation

This directory contains comprehensive reference guides for the ScriptAI project.

## Available References

### [AI Agents Reference](AI_AGENTS.md)
Complete guide to all 6 AI agents in the system:
- ConsistencyGuardian (ACT1 Logic Repair)
- CharacterArchitect (ACT2 Character Depth)
- RulesAuditor (ACT3 Worldbuilding)
- PacingStrategist (ACT4 Pacing)
- ThematicPolisher (ACT5 Theme)
- RevisionExecutive (Fix Generation)

Includes implementation details, prompt design, output formats, and performance characteristics.

### [API Reference](API_REFERENCE.md)
Complete V1 API documentation:
- All endpoints with request/response formats
- Authentication and rate limiting
- Error handling patterns
- Async job patterns
- Polling strategies
- Serverless compatibility

### [Database Schema Reference](DATABASE_SCHEMA.md)
Prisma ORM and PostgreSQL documentation:
- All database models and relationships
- Enums and indexes
- Service layer architecture
- Migration strategies
- Query optimization tips
- Connection pooling

### [Multi-File Analysis Reference](MULTI_FILE_ANALYSIS.md)
Comprehensive multi-file script analysis system (Sprint 3):
- Cross-file consistency checking (timeline, character, plot, setting)
- AI-assisted decision making (CrossFileAdvisor)
- Batch analysis and findings merging
- Multi-file analysis API endpoints
- Usage examples and best practices
- Configuration and troubleshooting
- Recent bug fixes (2025-11-09)

### [Bug Fixes Reference](BUG_FIXES.md) ✨ NEW
Critical bug fixes and troubleshooting guide:
- Cross-file analysis display issues
- React key warnings and solutions
- AI analyzer null pointer exceptions
- Data structure updates and best practices
- Prevention checklist for future development

### [Frontend Components Reference](FRONTEND_COMPONENTS.md)
Complete frontend guide:
- Page structure and routing
- Workspace components (Epic 005)
- UI component library (shadcn/ui)
- API client (v1ApiService)
- State management patterns
- Styling conventions

### [Testing Guide](TESTING_GUIDE.md)
Comprehensive testing documentation:
- Unit testing patterns (Jest)
- Integration testing patterns
- E2E testing (Playwright)
- Test conventions and best practices
- Mocking strategies
- WSL-specific configurations

### [Deployment Guide](DEPLOYMENT_GUIDE.md)
Production deployment guide:
- Vercel deployment steps
- Supabase database setup
- Environment configuration
- Monitoring and logging
- Common issues and solutions
- Scaling strategies

### [Workflow Reference](WORKFLOW_REFERENCE.md)
Complete five-act workflow system:
- Workflow state machine
- ACT1-5 detailed processes
- Synthesis engine
- Free Creation Mode
- Decision history
- Complete examples

## When to Use These References

### First Time in Codebase
1. Start with [Workflow Reference](WORKFLOW_REFERENCE.md) to understand the system
2. Read [AI Agents Reference](AI_AGENTS.md) to learn the agents
3. Check [API Reference](API_REFERENCE.md) for endpoint details

### Implementing New Features
1. Check [Workflow Reference](WORKFLOW_REFERENCE.md) for context
2. Review [AI Agents Reference](AI_AGENTS.md) for agent patterns
3. Follow [API Reference](API_REFERENCE.md) for endpoint structure
4. Check [Database Schema Reference](DATABASE_SCHEMA.md) for models
5. Use [Frontend Components Reference](FRONTEND_COMPONENTS.md) for UI patterns
6. For multi-file features, see [Multi-File Analysis Reference](MULTI_FILE_ANALYSIS.md)

### Debugging Issues
1. Check [Bug Fixes Reference](BUG_FIXES.md) for known issues and solutions
2. Review relevant reference guide for the component you're debugging
3. Check [API Reference](API_REFERENCE.md) for error handling patterns
4. Review [Testing Guide](TESTING_GUIDE.md) for testing the fix

### Writing Tests
1. Follow patterns in [Testing Guide](TESTING_GUIDE.md)
2. Check [API Reference](API_REFERENCE.md) for mocking strategies
3. Review [Database Schema Reference](DATABASE_SCHEMA.md) for data setup

### Deploying to Production
1. Follow [Deployment Guide](DEPLOYMENT_GUIDE.md) step by step
2. Check [API Reference](API_REFERENCE.md) for Serverless patterns
3. Review [Database Schema Reference](DATABASE_SCHEMA.md) for migration strategies

## Maintenance

These reference documents should be updated when:
- New features are added
- APIs are changed
- Database schema evolves
- Testing patterns change
- Deployment procedures change

Always keep references in sync with actual implementation.

## Related Documentation

- **CLAUDE.md** - Main project guide with quick start and conventions
- **docs/** - Detailed Epic guides, workflow documentation, and troubleshooting
- **README.md** - Project overview and getting started

## Contributing

When updating these references:
1. Keep formatting consistent
2. Include code examples
3. Update cross-references
4. Add timestamps for significant changes
5. Update CLAUDE.md pointers if needed
