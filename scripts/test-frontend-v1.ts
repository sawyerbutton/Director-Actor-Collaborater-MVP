#!/usr/bin/env npx tsx
/**
 * Test script for V1 Frontend Integration
 * Tests the complete flow through the UI components
 */

import { v1ApiService } from '../lib/services/v1-api-service';

async function testFrontendIntegration() {
  console.log('🧪 Testing V1 Frontend Integration...\n');

  try {
    // Test 1: List existing projects
    console.log('📋 Test 1: List existing projects');
    const projects = await v1ApiService.listProjects();
    console.log(`✅ Found ${projects.items.length} projects`);
    if (projects.items.length > 0) {
      console.log(`   Latest: ${projects.items[0].title} (${projects.items[0].workflowStatus})`);
    }

    // Test 2: Create a new project with script
    console.log('\n📝 Test 2: Create new project');
    const testScript = `
# Scene 1 - Morning
Characters: Alice, Bob
Location: Office

Alice: Good morning, Bob!
Bob: Hi Alice, ready for the meeting?
Alice: Yes, I have all the reports ready.

# Scene 2 - Afternoon
Characters: Alice, Charlie
Location: Conference Room

Charlie: The project looks great!
Alice: Thank you, we worked hard on it.
    `.trim();

    const project = await v1ApiService.createProject(
      'Frontend Test Project ' + new Date().toISOString(),
      testScript,
      'Testing V1 frontend integration'
    );
    console.log(`✅ Created project: ${project.id}`);
    console.log(`   Status: ${project.workflowStatus}`);

    // Test 3: Start analysis
    console.log('\n🔬 Test 3: Start analysis job');
    const job = await v1ApiService.startAnalysis(project.id);
    console.log(`✅ Started job: ${job.jobId}`);

    // Test 4: Poll job status (just a few times)
    console.log('\n⏳ Test 4: Poll job status');
    let attempts = 0;
    const maxAttempts = 5;

    const pollJob = async () => {
      try {
        const status = await v1ApiService.getJobStatus(job.jobId);
        console.log(`   Attempt ${++attempts}: ${status.status}`);

        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          console.log(`✅ Job finished with status: ${status.status}`);
          if (status.error) {
            console.log(`   Error: ${status.error}`);
          }
          return status;
        }

        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return pollJob();
        }

        console.log('⏸️  Job still processing, stopping poll test');
        return status;
      } catch (error: any) {
        if (error.message?.includes('Rate limit')) {
          console.log('⚠️  Rate limited, waiting...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          return pollJob();
        }
        throw error;
      }
    };

    await pollJob();

    // Test 5: Get workflow status
    console.log('\n📊 Test 5: Get workflow status');
    const workflowStatus = await v1ApiService.getWorkflowStatus(project.id);
    console.log(`✅ Workflow status: ${workflowStatus.workflowStatus}`);
    console.log(`   Jobs - Queued: ${workflowStatus.statistics.queued}, Completed: ${workflowStatus.statistics.completed}`);

    // Test 6: Try to get diagnostic report
    console.log('\n📄 Test 6: Get diagnostic report');
    try {
      const report = await v1ApiService.getDiagnosticReport(project.id);
      if (report.report) {
        console.log(`✅ Got diagnostic report with ${report.report.findings.length} findings`);
      } else {
        console.log('ℹ️  No diagnostic report available yet');
      }
    } catch (error) {
      console.log('ℹ️  No diagnostic report available');
    }

    console.log('\n✨ All frontend integration tests completed successfully!');
    console.log('\n📱 You can now test the UI at: http://localhost:3000/v1-demo');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testFrontendIntegration().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});