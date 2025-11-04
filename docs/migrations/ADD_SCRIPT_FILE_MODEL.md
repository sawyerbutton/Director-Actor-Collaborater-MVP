# Migration: Add ScriptFile Model

**Date**: 2025-01-03
**Sprint**: Sprint 1 - 多文件基础架构
**Migration ID**: TBD (auto-generated)

---

## 📋 Migration Summary

This migration adds the `ScriptFile` model to support multi-file script projects, enabling:
- Upload and manage multiple script files per project
- Store both raw content and JSON-converted structure
- Track conversion status and errors
- Support episode numbering and sorting

---

## 🔧 Schema Changes

### New Model: ScriptFile

```prisma
model ScriptFile {
  id                String   @id @default(cuid())
  projectId         String
  filename          String   // 原始文件名（如"第1集.md"）
  episodeNumber     Int?     // 集数编号（用于排序，从文件名提取）
  rawContent        String   @db.Text // 原始文本内容
  jsonContent       Json?    // 转换后的结构化JSON
  contentHash       String   // SHA256哈希（用于检测重复）
  fileSize          Int      // 文件大小（bytes）
  conversionStatus  String   @default("pending") // pending, processing, completed, failed
  conversionError   String?  @db.Text // 转换错误信息
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 关联关系
  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, filename]) // 同一项目内文件名唯一
  @@index([projectId])
  @@index([projectId, episodeNumber])
}
```

### Updated Model: Project

Added relationship:
```prisma
scriptFiles     ScriptFile[]      // 多文件模式（新增）
```

**Note**: The existing `content` field is preserved for backward compatibility with single-file projects.

---

## 🚀 Migration Steps

### Step 1: Generate Migration

```bash
npx prisma migrate dev --name add_script_file_model
```

This will:
1. Create a new migration file in `prisma/migrations/`
2. Generate SQL DDL statements
3. Apply the migration to your database
4. Update Prisma Client

### Step 2: Verify Migration

```bash
# Check migration status
npx prisma migrate status

# View generated SQL (optional)
cat prisma/migrations/[timestamp]_add_script_file_model/migration.sql
```

Expected SQL (approximate):
```sql
-- CreateTable
CREATE TABLE "ScriptFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "episodeNumber" INTEGER,
    "rawContent" TEXT NOT NULL,
    "jsonContent" JSONB,
    "contentHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "conversionStatus" TEXT NOT NULL DEFAULT 'pending',
    "conversionError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScriptFile_projectId_idx" ON "ScriptFile"("projectId");

-- CreateIndex
CREATE INDEX "ScriptFile_projectId_episodeNumber_idx" ON "ScriptFile"("projectId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptFile_projectId_filename_key" ON "ScriptFile"("projectId", "filename");

-- AddForeignKey
ALTER TABLE "ScriptFile" ADD CONSTRAINT "ScriptFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Step 3: Regenerate Prisma Client

```bash
npx prisma generate
```

This updates TypeScript types to include the new `ScriptFile` model.

---

## 🧪 Testing the Migration

### Verify Database Schema

```bash
# Connect to PostgreSQL
docker exec -it director-postgres psql -U director_user -d director_actor_db

# Check table exists
\dt

# Describe ScriptFile table
\d "ScriptFile"

# Verify indexes
\di

# Exit
\q
```

### Test in Prisma Studio

```bash
npx prisma studio
```

Navigate to `ScriptFile` table and verify:
- All fields are present
- Indexes are created
- Foreign key to `Project` works

### Test Programmatically

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testScriptFile() {
  // Create test project
  const project = await prisma.project.create({
    data: {
      userId: 'demo-user',
      title: 'Test Multi-File Project',
      content: '', // Empty for multi-file mode
    },
  });

  // Create test script file
  const scriptFile = await prisma.scriptFile.create({
    data: {
      projectId: project.id,
      filename: '第1集.md',
      episodeNumber: 1,
      rawContent: '测试内容...',
      contentHash: 'test-hash-123',
      fileSize: 100,
    },
  });

  console.log('ScriptFile created:', scriptFile);

  // Query with relation
  const projectWithFiles = await prisma.project.findUnique({
    where: { id: project.id },
    include: { scriptFiles: true },
  });

  console.log('Project with files:', projectWithFiles);

  // Cleanup
  await prisma.scriptFile.delete({ where: { id: scriptFile.id } });
  await prisma.project.delete({ where: { id: project.id } });
}

testScriptFile();
```

---

## ⚠️ Rollback (if needed)

If you need to rollback this migration:

```bash
# Rollback one migration
npx prisma migrate resolve --rolled-back [migration_name]

# Or manually drop the table (DANGEROUS - use with caution)
docker exec -it director-postgres psql -U director_user -d director_actor_db -c "DROP TABLE \"ScriptFile\" CASCADE;"
```

**WARNING**: Rollback will delete all data in the `ScriptFile` table!

---

## 📊 Performance Considerations

### Indexes Created

1. **projectId**: Fast lookup of all files in a project
2. **projectId + episodeNumber**: Fast sorted retrieval by episode order
3. **projectId + filename**: Ensure uniqueness and fast duplicate checks

### Expected Query Performance

- List files for project: `O(log n)` with index
- Find by filename: `O(log n)` with unique index
- Order by episode: `O(n log n)` for sorting (optimized by compound index)

### Disk Space

Approximate storage per file:
- Small script (1000 lines): ~50KB raw + ~100KB JSON = ~150KB
- Medium script (3000 lines): ~150KB raw + ~300KB JSON = ~450KB
- Large script (10000 lines): ~500KB raw + ~1MB JSON = ~1.5MB

For 5 medium scripts per project: ~2.25MB

---

## 🔄 Data Migration (if needed)

If you have existing single-file projects to migrate:

```typescript
// Convert existing Project.content to ScriptFile
async function migrateExistingProjects() {
  const projects = await prisma.project.findMany({
    where: {
      scriptFiles: { none: {} }, // No files yet
      content: { not: '' }, // Has content
    },
  });

  for (const project of projects) {
    await prisma.scriptFile.create({
      data: {
        projectId: project.id,
        filename: `${project.title}.md`,
        episodeNumber: 1,
        rawContent: project.content,
        contentHash: createHash('sha256').update(project.content).digest('hex'),
        fileSize: Buffer.byteLength(project.content, 'utf8'),
      },
    });
  }

  console.log(`Migrated ${projects.length} projects`);
}
```

**Note**: This is optional for Beta version. Existing projects can continue using single-file mode.

---

## ✅ Post-Migration Checklist

- [ ] Migration applied successfully
- [ ] Prisma Client regenerated
- [ ] No errors in TypeScript compilation
- [ ] Database indexes verified
- [ ] Foreign key constraints working
- [ ] Test script file creation/query
- [ ] Backup database before production deployment

---

## 📝 Related Files

- **Schema**: `prisma/schema.prisma`
- **Service**: `lib/db/services/script-file.service.ts` (to be created in Sprint 1)
- **API**: `app/api/v1/projects/[id]/files/route.ts` (to be created in Sprint 1)

---

## 🔗 References

- **Requirements**: `MULTI_SCRIPT_ANALYSIS_REQUIREMENTS.md`
- **Sprint 1 Task**: T1.1 - Create ScriptFile Prisma model
- **Related Models**: Project, DiagnosticReport (findings structure will be updated in Sprint 3)

---

**Migration Status**: ⏳ Ready to execute
**Next Step**: Run `npx prisma migrate dev --name add_script_file_model`
