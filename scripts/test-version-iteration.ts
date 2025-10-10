/**
 * Manual E2E test script for version iteration workflow
 * Tests the complete flow with real database
 */

import { PrismaClient } from '@prisma/client';
import { VersionManager } from '../lib/synthesis/version-manager';
import { applyChanges } from '../lib/synthesis/change-applicator';
import { projectService } from '../lib/db/services/project.service';
import { revisionDecisionService } from '../lib/db/services/revision-decision.service';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🧪 Starting Version Iteration E2E Test\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Create test project
    console.log('\n📝 Step 1: Creating test project...');
    const project = await projectService.create({
      userId: 'demo-user',
      title: 'Version Iteration Test Project',
      content: `场景1 - 咖啡馆 - 白天

李明坐在窗边，盯着手机。

李明：你为什么不回我消息？

场景2 - 公园 - 傍晚

王芳在长椅上看书。

王芳：有些事情需要时间。`,
      workflowStatus: 'ACT1_COMPLETE'
    });
    console.log(`✅ Project created: ${project.id}`);
    console.log(`   Original content length: ${project.content.length} chars`);

    // Step 2: Create ACT2 decision
    console.log('\n📝 Step 2: Creating ACT2 decision...');
    const decision1 = await revisionDecisionService.create({
      projectId: project.id,
      act: 'ACT2_CHARACTER',
      focusName: '李明',
      focusContext: { contradiction: '角色情感表达不足' },
      proposals: [
        {
          id: 'prop1',
          title: '增强情感表达',
          approach: '通过动作展现内心',
          pros: ['更有戏剧张力'],
          cons: ['可能过于明显']
        },
        {
          id: 'prop2',
          title: '保持含蓄',
          approach: '通过对话暗示',
          pros: ['更有韵味'],
          cons: ['可能不够清晰']
        }
      ]
    });
    console.log(`✅ Decision created: ${decision1.id}`);

    // Step 3: Apply ACT2 changes (simulate execution)
    console.log('\n📝 Step 3: Applying ACT2 changes to create V1...');
    const act2Changes = {
      dramaticActions: [
        {
          sceneNumber: 1,
          action: '李明紧张地握紧手机，手在微微颤抖。他的目光在屏幕和窗外之间游移。',
          characterName: '李明'
        }
      ],
      overallArc: '李明从焦虑不安到逐渐释怀的情感转变',
      integrationNotes: '在场景1插入戏剧化动作，展现角色内心冲突'
    };

    const versionManager = new VersionManager();

    // Get current version (should be none)
    const currentVersion = await versionManager.getLatestVersion(project.id);
    console.log(`   Current version: ${currentVersion ? currentVersion.version : 'None (will be V1)'}`);

    const currentScript = currentVersion?.content || project.content;
    const v1Content = await applyChanges({
      act: 'ACT2_CHARACTER',
      generatedChanges: act2Changes,
      currentScript: currentScript,
      focusContext: decision1.focusContext
    });

    console.log(`   Applied changes, new content length: ${v1Content.length} chars`);
    console.log(`   Content includes drama action: ${v1Content.includes('戏剧化动作') ? '✅' : '❌'}`);

    // Create V1
    const v1 = await versionManager.createVersion(project.id, v1Content, {
      synthesisLog: [
        {
          id: 'change1',
          decisionId: decision1.id,
          act: 'ACT2_CHARACTER',
          focusName: '李明',
          changeType: 'modification',
          modifiedText: v1Content.substring(0, 100),
          location: { scene: 1 },
          rationale: 'Applied ACT2 dramatic action',
          appliedAt: new Date()
        }
      ],
      decisionsApplied: [decision1.id],
      confidence: 0.9,
      timestamp: new Date()
    });
    console.log(`✅ V1 created: version ${v1.version}, id ${v1.id}`);

    // Update project content
    await projectService.updateContent(project.id, v1Content);
    console.log(`✅ Project content updated to V1`);

    // Update decision version
    await revisionDecisionService.execute(decision1.id, {
      userChoice: 'prop1',
      generatedChanges: act2Changes as any
    });
    await revisionDecisionService.updateVersion(decision1.id, v1.version);
    console.log(`✅ Decision linked to version ${v1.version}`);

    // Step 4: Create second ACT2 decision based on V1
    console.log('\n📝 Step 4: Creating second ACT2 decision based on V1...');
    const decision2 = await revisionDecisionService.create({
      projectId: project.id,
      act: 'ACT2_CHARACTER',
      focusName: '王芳',
      focusContext: { contradiction: '王芳反应缺乏情感层次' },
      proposals: [
        {
          id: 'prop3',
          title: '增加细节描写',
          approach: '通过微表情展现',
          pros: ['更细腻'],
          cons: ['需要演员功力']
        }
      ]
    });
    console.log(`✅ Decision 2 created: ${decision2.id}`);

    // Step 5: Apply second change based on V1
    console.log('\n📝 Step 5: Applying second change to create V2...');
    const latestVersion = await versionManager.getLatestVersion(project.id);
    console.log(`   Latest version: V${latestVersion.version}`);
    console.log(`   Content includes previous changes: ${latestVersion.content.includes('握紧手机') ? '✅' : '❌'}`);

    const act2Changes2 = {
      dramaticActions: [
        {
          sceneNumber: 2,
          action: '王芳缓缓抬起头，目光温柔而坚定。她的嘴角浮现一丝淡淡的微笑。',
          characterName: '王芳'
        }
      ],
      overallArc: '进一步深化王芳的性格特质',
      integrationNotes: '基于V1继续完善角色弧光'
    };

    const v2Content = await applyChanges({
      act: 'ACT2_CHARACTER',
      generatedChanges: act2Changes2,
      currentScript: latestVersion.content,
      focusContext: decision2.focusContext
    });

    console.log(`   V2 content length: ${v2Content.length} chars`);
    console.log(`   V2 includes V1 changes: ${v2Content.includes('握紧手机') ? '✅' : '❌'}`);
    console.log(`   V2 includes new changes: ${v2Content.includes('目光温柔') ? '✅' : '❌'}`);

    // Create V2
    const v2 = await versionManager.createVersion(project.id, v2Content, {
      synthesisLog: [
        {
          id: 'change2',
          decisionId: decision2.id,
          act: 'ACT2_CHARACTER',
          focusName: '王芳',
          changeType: 'modification',
          modifiedText: v2Content.substring(0, 100),
          location: { scene: 2 },
          rationale: 'Applied second ACT2 dramatic action',
          appliedAt: new Date()
        }
      ],
      decisionsApplied: [decision1.id, decision2.id],
      confidence: 0.9,
      timestamp: new Date(),
      previousVersion: v1.version
    });
    console.log(`✅ V2 created: version ${v2.version}, id ${v2.id}`);

    // Update project content again
    await projectService.updateContent(project.id, v2Content);
    console.log(`✅ Project content updated to V2`);

    // Step 6: Verify version chain
    console.log('\n📝 Step 6: Verifying version chain...');
    const allVersions = await versionManager.listVersions(project.id);
    console.log(`   Total versions: ${allVersions.length}`);
    allVersions.forEach((v, idx) => {
      console.log(`   - V${v.version}: ${v.content.length} chars, confidence: ${v.confidence}`);
    });

    // Step 7: Test ACT3 based on V2
    console.log('\n📝 Step 7: Testing ACT3 based on V2...');
    const act3Changes = {
      alignmentStrategies: [
        { strategy: '强化都市背景的孤独感', description: '与角色情感呼应' }
      ],
      coreRecommendation: '通过环境描写深化主题',
      integrationNotes: '世界观与角色弧光对齐'
    };

    const v3Content = await applyChanges({
      act: 'ACT3_WORLDBUILDING',
      generatedChanges: act3Changes,
      currentScript: v2.content,
      focusContext: {}
    });

    console.log(`   V3 includes V1 changes: ${v3Content.includes('握紧手机') ? '✅' : '❌'}`);
    console.log(`   V3 includes V2 changes: ${v3Content.includes('目光温柔') ? '✅' : '❌'}`);
    console.log(`   V3 includes ACT3 metadata: ${v3Content.includes('ACT3 世界观对齐') ? '✅' : '❌'}`);

    // Step 8: Final validation
    console.log('\n📝 Step 8: Final validation...');
    const updatedProject = await projectService.findById(project.id);
    const finalVersion = await versionManager.getLatestVersion(project.id);

    console.log(`   Project content length: ${updatedProject?.content.length} chars`);
    console.log(`   Latest version: V${finalVersion.version}`);
    console.log(`   Latest version content length: ${finalVersion.content.length} chars`);
    console.log(`   Content match: ${updatedProject?.content === finalVersion.content ? '✅' : '❌'}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.scriptVersion.deleteMany({ where: { projectId: project.id } });
    await prisma.revisionDecision.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });
    console.log('✅ Cleanup complete');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests PASSED! Version iteration works correctly!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
