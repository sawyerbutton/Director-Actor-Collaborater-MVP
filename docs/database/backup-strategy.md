# Database Backup Strategy

## Overview
This document outlines the backup and disaster recovery strategy for the Director-Actor-Collaborator MVP PostgreSQL database hosted on Supabase.

## Backup Types

### 1. Automatic Backups (Supabase Managed)
- **Frequency**: Daily automatic backups
- **Retention**: 7 days (Free tier) / 30 days (Pro tier)
- **Recovery**: Point-in-time recovery available on Pro tier
- **Location**: Supabase managed storage

### 2. Manual Backups
- **Method**: pg_dump via Supabase CLI or direct connection
- **Frequency**: Before major deployments or migrations
- **Storage**: External storage (AWS S3, Google Cloud Storage, or local)

## Backup Procedures

### Automated Daily Backup (Supabase)
Supabase automatically handles daily backups. No action required.

### Manual Backup Script
```bash
#!/bin/bash
# backup.sh - Manual database backup script

# Load environment variables
source .env.local

# Set backup filename with timestamp
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

# Perform backup using pg_dump
pg_dump $DIRECT_DATABASE_URL > backups/$BACKUP_FILE

# Compress the backup
gzip backups/$BACKUP_FILE

echo "Backup completed: backups/$BACKUP_FILE.gz"
```

### Backup Using Prisma
```bash
# Export data as SQL
npx prisma db pull
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > backup.sql
```

## Backup Verification

### Daily Verification Checklist
1. Check Supabase dashboard for successful backup status
2. Verify backup size is consistent with database size
3. Test restoration on staging environment (monthly)

### Verification Script
```typescript
// lib/db/backup-verify.ts
import { prisma } from './client';

export async function verifyBackupIntegrity() {
  const checks = {
    userCount: await prisma.user.count(),
    projectCount: await prisma.project.count(),
    analysisCount: await prisma.analysis.count(),
    timestamp: new Date().toISOString(),
  };
  
  console.log('Database State:', checks);
  return checks;
}
```

## Recovery Time Objectives (RTO)

| Scenario | Target RTO | Method |
|----------|------------|--------|
| Data corruption | < 1 hour | Restore from Supabase backup |
| Accidental deletion | < 30 minutes | Point-in-time recovery |
| Regional outage | < 4 hours | Failover to backup region |
| Complete loss | < 24 hours | Restore from external backup |

## Recovery Point Objectives (RPO)

| Data Type | Maximum Data Loss | Backup Method |
|-----------|------------------|---------------|
| User data | 24 hours | Daily automated backup |
| Projects | 24 hours | Daily automated backup |
| Analysis results | 24 hours | Daily automated backup |
| System configuration | 0 (version controlled) | Git repository |

## Backup Storage Locations

### Primary (Supabase)
- Location: Same region as database
- Access: Via Supabase dashboard
- Security: Encrypted at rest

### Secondary (Recommended)
- Location: External cloud storage (S3/GCS)
- Frequency: Weekly
- Retention: 90 days
- Encryption: AES-256

## Security Considerations

1. **Encryption**: All backups must be encrypted
2. **Access Control**: Limit backup access to authorized personnel only
3. **Audit Logging**: Track all backup and restore operations
4. **Testing**: Monthly restore tests in isolated environment
5. **Compliance**: Ensure GDPR compliance for EU user data

## Monitoring and Alerts

### Backup Monitoring
```typescript
// lib/db/backup-monitor.ts
export async function checkLastBackup() {
  // Check Supabase API for last backup status
  // Send alert if backup is older than 25 hours
  // Log to monitoring service
}
```

### Alert Conditions
- Backup failure
- Backup older than 25 hours
- Backup size variance > 20%
- Restore test failure

## Disaster Recovery Plan

### Phase 1: Assessment (0-15 minutes)
1. Identify the issue and scope
2. Notify stakeholders
3. Activate recovery team

### Phase 2: Recovery Decision (15-30 minutes)
1. Determine recovery method
2. Select appropriate backup
3. Prepare recovery environment

### Phase 3: Restoration (30 minutes - 4 hours)
1. Execute restoration procedure
2. Verify data integrity
3. Run validation tests

### Phase 4: Validation (1-2 hours)
1. Verify application functionality
2. Check data consistency
3. Performance testing

### Phase 5: Communication
1. Update stakeholders
2. Document incident
3. Post-mortem analysis

## Backup Commands Reference

```bash
# Create manual backup
npm run db:backup

# Restore from backup
npm run db:restore backup_file.sql

# Verify backup
npm run db:verify

# Export schema only
npx prisma db pull --schema-only

# Export data only
npx prisma db seed --preview-feature
```

## Contact Information

### Primary Contact
- Database Administrator
- Email: dba@example.com
- Phone: +1-XXX-XXX-XXXX

### Escalation Path
1. Database Administrator
2. DevOps Lead
3. CTO

## Review Schedule

This backup strategy should be reviewed:
- Quarterly for effectiveness
- After any major incident
- When scaling beyond 10GB database size
- Before major version upgrades

## Appendix

### Backup Script Installation
1. Create `scripts/backup.sh` with the backup script
2. Set executable permissions: `chmod +x scripts/backup.sh`
3. Add to crontab for scheduled execution
4. Configure external storage credentials

### Testing Restore Procedure
1. Create test database
2. Restore backup to test database
3. Run verification queries
4. Compare with production metrics
5. Document results

Last Updated: 2025-09-07
Version: 1.0