#!/usr/bin/env npx tsx

/**
 * Script to test V1 API endpoints for workflow system
 */

const API_BASE = 'http://localhost:3000/api/v1';

// Test script content
const TEST_SCRIPT_CONTENT = `
INT. OFFICE - DAY

JOHN enters the room looking tired.

JOHN
I need some coffee.

SARAH looks up from her desk.

SARAH
There's fresh coffee in the break room.

INT. BREAK ROOM - DAY

John pours himself a cup of coffee.

JOHN
This is exactly what I needed.

INT. OFFICE - DAY

John returns to his desk with his coffee.

SARAH
Feel better?

JOHN
Much better, thanks!
`;

async function testAPI() {
  console.log('🚀 Testing V1 API Endpoints...\n');

  try {
    // Step 1: Create a new project
    console.log('1️⃣ Creating new project...');
    const createProjectResponse = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Workflow Project',
        description: 'Testing the new workflow system',
        content: TEST_SCRIPT_CONTENT,
      }),
    });

    if (!createProjectResponse.ok) {
      throw new Error(`Failed to create project: ${createProjectResponse.statusText}`);
    }

    const projectData = await createProjectResponse.json();
    const projectId = projectData.data.id;
    console.log(`✅ Project created: ${projectId}`);
    console.log(`   Workflow Status: ${projectData.data.workflowStatus}`);

    // Step 2: Trigger Act 1 Analysis
    console.log('\n2️⃣ Triggering Act 1 analysis...');
    const analyzeResponse = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
      }),
    });

    if (!analyzeResponse.ok) {
      throw new Error(`Failed to trigger analysis: ${analyzeResponse.statusText}`);
    }

    const analyzeData = await analyzeResponse.json();
    const jobId = analyzeData.data.jobId;
    console.log(`✅ Analysis job created: ${jobId}`);

    // Step 3: Poll job status
    console.log('\n3️⃣ Polling job status...');
    let jobComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (!jobComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await fetch(`${API_BASE}/analyze/jobs/${jobId}`);
      if (!statusResponse.ok) {
        throw new Error(`Failed to get job status: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();
      const status = statusData.data.status;
      const progress = statusData.data.progress || 0;

      console.log(`   Status: ${status} | Progress: ${progress}%`);

      if (status === 'COMPLETED' || status === 'FAILED') {
        jobComplete = true;
        if (status === 'FAILED') {
          console.error(`❌ Job failed: ${statusData.data.error}`);
          return;
        }
      }

      attempts++;
    }

    if (!jobComplete) {
      console.log('⏱️ Job is still processing after 30 seconds');
    }

    // Step 4: Get project status
    console.log('\n4️⃣ Getting project workflow status...');
    const projectStatusResponse = await fetch(`${API_BASE}/projects/${projectId}/status`);
    if (!projectStatusResponse.ok) {
      throw new Error(`Failed to get project status: ${projectStatusResponse.statusText}`);
    }

    const projectStatusData = await projectStatusResponse.json();
    console.log(`✅ Workflow Status: ${projectStatusData.data.workflowStatus}`);
    console.log(`   Script Versions: ${projectStatusData.data.scriptVersions}`);
    console.log(`   Job Statistics:`, projectStatusData.data.statistics);

    // Step 5: Get diagnostic report
    console.log('\n5️⃣ Getting diagnostic report...');
    const reportResponse = await fetch(`${API_BASE}/projects/${projectId}/report`);
    if (!reportResponse.ok) {
      if (reportResponse.status === 404) {
        console.log('   No report available yet (analysis may still be processing)');
      } else {
        throw new Error(`Failed to get report: ${reportResponse.statusText}`);
      }
    } else {
      const reportData = await reportResponse.json();
      const report = reportData.data.report;
      if (report) {
        console.log(`✅ Diagnostic Report Retrieved:`);
        console.log(`   Findings: ${report.findings.length}`);
        console.log(`   Confidence: ${report.confidence}`);
        console.log(`   Summary: ${report.summary}`);

        if (report.findings.length > 0) {
          console.log('\n   Sample Findings:');
          report.findings.slice(0, 3).forEach((finding: any, i: number) => {
            console.log(`   ${i + 1}. [${finding.severity}] ${finding.type}: ${finding.description}`);
          });
        }
      }
    }

    // Step 6: List projects
    console.log('\n6️⃣ Listing all projects...');
    const listResponse = await fetch(`${API_BASE}/projects`);
    if (!listResponse.ok) {
      throw new Error(`Failed to list projects: ${listResponse.statusText}`);
    }

    const listData = await listResponse.json();
    console.log(`✅ Total Projects: ${listData.data.pagination.total}`);
    listData.data.items.forEach((project: any) => {
      console.log(`   - ${project.title} (${project.workflowStatus})`);
    });

    console.log('\n✅ All V1 API tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAPI().then(() => {
  console.log('\n👍 Test script completed');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});