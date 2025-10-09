/**
 * Act 1 Analysis Debug Script
 *
 * This script helps diagnose issues with Act 1 analysis jobs stuck in PROCESSING state
 *
 * Usage:
 * npx tsx scripts/debug-act1-analysis.ts [jobId]
 */

import { PrismaClient, JobStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function debugAct1Analysis(jobId?: string) {
  try {
    console.log('🔍 Act 1 Analysis Debug Tool\n');
    console.log('='.repeat(50));

    // 1. Check environment variables
    console.log('\n📋 Environment Check:');
    console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '✅ Set' : '❌ Not set');
    console.log('DEEPSEEK_API_URL:', process.env.DEEPSEEK_API_URL || 'Not set (will use default)');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');

    // 2. Get recent analysis jobs
    console.log('\n📊 Recent Analysis Jobs:');

    let jobs;
    if (jobId) {
      const job = await prisma.analysisJob.findUnique({
        where: { id: jobId },
        include: { project: true }
      });
      jobs = job ? [job] : [];
    } else {
      jobs = await prisma.analysisJob.findMany({
        where: {
          type: 'ACT1_ANALYSIS'
        },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
    }

    if (jobs.length === 0) {
      console.log('❌ No Act 1 analysis jobs found');
      return;
    }

    jobs.forEach((job, index) => {
      console.log(`\n--- Job ${index + 1} ---`);
      console.log('ID:', job.id);
      console.log('Project:', job.project?.title || 'Unknown');
      console.log('Status:', job.status);
      console.log('Created:', job.createdAt.toISOString());
      console.log('Updated:', job.updatedAt.toISOString());

      const timeSinceCreation = Date.now() - job.createdAt.getTime();
      const timeSinceUpdate = Date.now() - job.updatedAt.getTime();

      console.log(`Time since creation: ${Math.round(timeSinceCreation / 1000)}s`);
      console.log(`Time since last update: ${Math.round(timeSinceUpdate / 1000)}s`);

      if (job.status === JobStatus.PROCESSING && timeSinceUpdate > 120000) {
        console.log('⚠️  WARNING: Job stuck in PROCESSING for over 2 minutes!');
        console.log('   This suggests the API call may have failed silently or timed out.');
      }

      if (job.error) {
        console.log('❌ Error:', job.error);
      }

      if (job.result) {
        console.log('✅ Result:', JSON.stringify(job.result).substring(0, 200) + '...');
      }

      console.log('Metadata:', JSON.stringify(job.metadata, null, 2));
    });

    // 3. Check for processing jobs
    const processingJobs = jobs.filter(j => j.status === JobStatus.PROCESSING);
    if (processingJobs.length > 0) {
      console.log(`\n⚠️  Found ${processingJobs.length} job(s) in PROCESSING state`);
      console.log('\nPossible causes:');
      console.log('1. DeepSeek API is slow or not responding');
      console.log('2. Network connection issues');
      console.log('3. Timeout too short for large scripts');
      console.log('4. API key invalid or rate limited');
      console.log('5. Server memory or resource constraints');

      console.log('\n🔧 Suggested actions:');
      console.log('1. Check server logs for detailed error messages');
      console.log('2. Verify DeepSeek API key is valid');
      console.log('3. Test API connection: curl -X POST https://api.deepseek.com/v1/chat/completions \\');
      console.log('   -H "Authorization: Bearer YOUR_API_KEY" \\');
      console.log('   -H "Content-Type: application/json" \\');
      console.log('   -d \'{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}\'');
      console.log('4. If stuck, manually reset job status:');
      processingJobs.forEach(job => {
        console.log(`   npx prisma studio # Then update job ${job.id} status to FAILED`);
      });
    }

    // 4. Check diagnostic reports
    console.log('\n📝 Diagnostic Reports:');
    const reports = await prisma.diagnosticReport.findMany({
      where: {
        projectId: { in: jobs.map(j => j.projectId) }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    if (reports.length === 0) {
      console.log('❌ No diagnostic reports found');
      console.log('   This confirms the analysis has not completed successfully');
    } else {
      reports.forEach((report, index) => {
        console.log(`\n--- Report ${index + 1} ---`);
        console.log('Project ID:', report.projectId);
        console.log('Created:', report.createdAt.toISOString());
        console.log('Summary:', report.summary?.substring(0, 100) + '...');
        const findings = report.findings as any;
        if (findings && Array.isArray(findings)) {
          console.log('Total Findings:', findings.length);
        }
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Debug complete\n');

  } catch (error) {
    console.error('❌ Debug script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line args
const jobId = process.argv[2];

debugAct1Analysis(jobId);
