# Database Recovery Process

## Quick Reference

| Issue | Solution | Time | Page |
|-------|----------|------|------|
| Accidental deletion | Point-in-time recovery | 30 min | #2 |
| Corruption | Restore from backup | 1 hour | #3 |
| Performance issue | Query optimization | Variable | #4 |
| Connection issues | Reset connection pool | 5 min | #5 |

## 1. Pre-Recovery Checklist

Before starting any recovery process:

- [ ] Identify the exact issue and scope
- [ ] Document current database state
- [ ] Notify relevant stakeholders
- [ ] Create incident ticket
- [ ] Backup current state (if possible)

## 2. Point-in-Time Recovery

### When to Use
- Accidental data deletion
- Unwanted bulk updates
- Need to restore to specific moment

### Steps
1. Access Supabase Dashboard
2. Navigate to Database → Backups
3. Select "Point in time recovery"
4. Choose target timestamp
5. Initiate recovery
6. Verify restored data

### Command Line Alternative
```bash
# Using Supabase CLI
supabase db restore --timestamp "2025-01-07 10:30:00"

# Verify restoration
npm run db:verify
```

## 3. Full Backup Restoration

### When to Use
- Database corruption
- Major data loss
- Failed migration rollback

### Steps

#### From Supabase Backup
1. Access Supabase Dashboard
2. Navigate to Database → Backups
3. Select backup to restore
4. Click "Restore"
5. Confirm restoration

#### From Manual Backup
```bash
# 1. Stop application
npm run stop

# 2. Create backup of current state
pg_dump $DATABASE_URL > pre_restore_backup.sql

# 3. Restore from backup file
psql $DATABASE_URL < backups/backup_20250107.sql

# 4. Verify restoration
npm run db:verify

# 5. Restart application
npm run start
```

## 4. Query Performance Recovery

### Identifying Slow Queries
```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;
```

### Quick Fixes
1. **Add Missing Indexes**
```sql
-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY n_distinct DESC;

-- Add index example
CREATE INDEX idx_project_userid ON "Project"("userId");
```

2. **Vacuum and Analyze**
```sql
VACUUM ANALYZE;
```

3. **Reset Query Plans**
```sql
DISCARD PLANS;
```

## 5. Connection Pool Recovery

### Symptoms
- "Too many connections" errors
- Application timeouts
- Database unresponsive

### Recovery Steps
```bash
# 1. Check current connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 2. Terminate idle connections
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
  AND state_change < now() - interval '10 minutes';"

# 3. Restart application to reset pool
npm run restart

# 4. Monitor connection health
npm run db:health
```

### Prisma Client Reset
```typescript
// lib/db/reset-connection.ts
import { prisma } from './client';

export async function resetPrismaConnection() {
  await prisma.$disconnect();
  await new Promise(resolve => setTimeout(resolve, 1000));
  await prisma.$connect();
  console.log('Prisma connection reset');
}
```

## 6. Data Corruption Recovery

### Detection
```sql
-- Check for corruption
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verify constraints
SELECT conname, contype, convalidated 
FROM pg_constraint 
WHERE NOT convalidated;
```

### Recovery Steps
1. **Identify Corrupted Tables**
```bash
pg_dump $DATABASE_URL --table=corrupted_table > table_backup.sql
```

2. **Attempt Repair**
```sql
REINDEX TABLE corrupted_table;
VACUUM FULL corrupted_table;
```

3. **If Repair Fails - Recreate**
```sql
-- Save good data
CREATE TABLE temp_backup AS 
SELECT * FROM corrupted_table 
WHERE /* conditions to filter good data */;

-- Drop and recreate
DROP TABLE corrupted_table CASCADE;
-- Recreate using Prisma migration
npx prisma migrate deploy

-- Restore data
INSERT INTO corrupted_table SELECT * FROM temp_backup;
```

## 7. Migration Rollback

### Failed Migration Recovery
```bash
# 1. Check migration status
npx prisma migrate status

# 2. Rollback last migration
npx prisma migrate resolve --rolled-back <migration_name>

# 3. Fix the migration file
# Edit prisma/migrations/<timestamp>_<name>/migration.sql

# 4. Reapply migration
npx prisma migrate deploy
```

## 8. Emergency Procedures

### Complete Database Loss
1. **Immediate Actions**
   - Switch to maintenance mode
   - Notify all stakeholders
   - Activate disaster recovery team

2. **Recovery**
```bash
# Create new database
npx supabase db create emergency-restore

# Restore from latest backup
psql $NEW_DATABASE_URL < latest_backup.sql

# Update environment variables
export DATABASE_URL=$NEW_DATABASE_URL

# Run migrations to ensure schema
npx prisma migrate deploy

# Verify data integrity
npm run db:verify

# Switch application to new database
npm run deploy
```

### Data Inconsistency
```typescript
// lib/db/consistency-check.ts
export async function checkDataConsistency() {
  const orphanedAnalyses = await prisma.analysis.findMany({
    where: {
      project: {
        is: null
      }
    }
  });

  const orphanedProjects = await prisma.project.findMany({
    where: {
      user: {
        is: null
      }
    }
  });

  return {
    orphanedAnalyses: orphanedAnalyses.length,
    orphanedProjects: orphanedProjects.length,
    healthy: orphanedAnalyses.length === 0 && orphanedProjects.length === 0
  };
}
```

## 9. Recovery Validation

### Post-Recovery Checklist
- [ ] All tables accessible
- [ ] Row counts match expected
- [ ] Application connects successfully
- [ ] Critical queries perform well
- [ ] No error logs in past 5 minutes
- [ ] User authentication works
- [ ] Data relationships intact

### Validation Queries
```sql
-- Check table counts
SELECT 
  'User' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 
  'Project', COUNT(*) FROM "Project"
UNION ALL
SELECT 
  'Analysis', COUNT(*) FROM "Analysis";

-- Verify relationships
SELECT 
  COUNT(*) as orphaned_projects
FROM "Project" p
LEFT JOIN "User" u ON p."userId" = u.id
WHERE u.id IS NULL;

-- Check recent activity
SELECT 
  MAX("createdAt") as last_created,
  MAX("updatedAt") as last_updated
FROM "Project";
```

## 10. Prevention Measures

### Daily Tasks
- Monitor backup completion
- Check database metrics
- Review slow query logs

### Weekly Tasks
- Test backup restoration
- Analyze query performance
- Update indexes if needed

### Monthly Tasks
- Full disaster recovery drill
- Review and update this document
- Capacity planning review

## Support Contacts

### Internal
- Database Team: db-team@example.com
- DevOps: devops@example.com
- On-call: +1-XXX-XXX-XXXX

### External
- Supabase Support: support.supabase.com
- Status Page: status.supabase.com

## Recovery Time Targets

| Scenario | Target | Maximum |
|----------|--------|---------|
| Connection reset | 5 min | 15 min |
| Query optimization | 30 min | 2 hours |
| Point-in-time recovery | 30 min | 1 hour |
| Full backup restore | 1 hour | 4 hours |
| Complete rebuild | 4 hours | 24 hours |

Last Updated: 2025-09-07
Version: 1.0