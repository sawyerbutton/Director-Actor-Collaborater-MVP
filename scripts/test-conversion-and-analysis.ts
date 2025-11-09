/**
 * Test Script for MD→JSON Conversion and AI Cross-File Analysis
 *
 * Usage: npx tsx scripts/test-conversion-and-analysis.ts [projectId]
 */

import { scriptFileService } from '../lib/db/services/script-file.service';
import { projectService } from '../lib/db/services/project.service';
import { createScriptConverter } from '../lib/conversion/script-converter';
import { createAICrossFileAnalyzer } from '../lib/analysis/ai-cross-file-analyzer';

// Test data: Two simple script files with intentional cross-file issues
const TEST_SCRIPTS = [
  {
    filename: '第1集.md',
    episodeNumber: 1,
    rawContent: `# 第1集：初遇

## 场景1：INT. 咖啡厅 - 白天

**时间**: 2024年1月15日，星期一早晨

张三走进咖啡厅，环顾四周。这是一家温馨的小咖啡厅，墙上挂着油画。

**张三**：（对服务员）一杯美式咖啡，谢谢。

李四从门口走进来，看到张三。

**李四**：张三？好久不见！

**张三**：李四！你怎么在这里？

两人坐下聊天。张三提到他正在寻找一份新工作。

---

## 场景2：INT. 张三家 - 夜晚

**时间**: 同一天晚上

张三回到家中，这是一间小公寓。他打开笔记本电脑，开始浏览招聘网站。

**张三**：（自言自语）明天一定要找到工作。

他关掉电脑，上床睡觉。`
  },
  {
    filename: '第2集.md',
    episodeNumber: 2,
    rawContent: `# 第2集：新的开始

## 场景1：INT. 咖啡厅 - 白天

**时间**: 第二天早晨

张三再次来到咖啡厅。这次咖啡厅看起来很宽敞明亮，装修豪华。

**张三**：（对服务员）还是美式咖啡。

王五走了进来。

**王五**：你好，请问你是张三吗？

**张三**：是的，你是？

**王五**：我叫王五，初次见面。

（注意：这里有问题 - 王五应该在第1集就认识张三，但这里说"初次见面"）

---

## 场景2：EXT. 公园 - 下午

**时间**: 三个月后

（注意：时间跳跃过大，从第二天直接到三个月后）

张三和李四在公园散步。

**李四**：小张，你找到工作了吗？

（注意：第1集叫"张三"，这里突然叫"小张"）

**张三**：找到了，在一家科技公司工作。

**李四**：太好了！对了，那个咖啡厅的事情怎么样了？

（注意：第1集没有提到咖啡厅有什么"事情"，这是情节线索断裂）`
  }
];

async function main() {
  try {
    console.log('🚀 开始测试 MD→JSON 转换和 AI 跨文件分析');
    console.log('='.repeat(60));

    // Get projectId from command line or use existing one
    const projectId = process.argv[2] || 'cmhmzuduv0001qhvplxdcc3oq';

    console.log(`\n📦 使用项目 ID: ${projectId}`);

    // Verify project exists
    const project = await projectService.findById(projectId);
    if (!project) {
      throw new Error(`项目 ${projectId} 不存在`);
    }

    console.log(`✓ 项目找到: ${project.title}`);

    // Step 1: Upload test files
    console.log('\n' + '='.repeat(60));
    console.log('📝 步骤 1: 上传测试剧本文件');
    console.log('='.repeat(60));

    const uploadedFiles: any[] = [];

    for (const script of TEST_SCRIPTS) {
      console.log(`\n上传: ${script.filename}`);

      // Check if file already exists
      const existing = await scriptFileService.getFileByProjectAndFilename(
        projectId,
        script.filename
      );

      if (existing) {
        console.log(`  ⚠️  文件已存在，删除旧文件...`);
        await scriptFileService.deleteFile(existing.id);
      }

      const file = await scriptFileService.createFile({
        projectId,
        filename: script.filename,
        rawContent: script.rawContent,
        episodeNumber: script.episodeNumber
      });

      uploadedFiles.push(file);
      console.log(`  ✓ 文件上传成功: ${file.id}`);
      console.log(`    - 文件大小: ${file.fileSize} bytes`);
      console.log(`    - 转换状态: ${file.conversionStatus}`);
    }

    // Step 2: Convert MD → JSON
    console.log('\n' + '='.repeat(60));
    console.log('🔄 步骤 2: 执行 MD→JSON 转换');
    console.log('='.repeat(60));

    const converter = createScriptConverter();

    for (const file of uploadedFiles) {
      console.log(`\n转换: ${file.filename}`);

      // Update status to processing
      await scriptFileService.updateFile(file.id, {
        conversionStatus: 'processing'
      });

      // Perform conversion
      const result = await converter.convert(file.rawContent);

      if (result.success) {
        // Update database
        await scriptFileService.updateFile(file.id, {
          jsonContent: result.jsonContent as any,
          conversionStatus: 'completed',
          conversionError: null
        });

        console.log(`  ✓ 转换成功!`);
        console.log(`    - 场景数: ${result.jsonContent!.scenes.length}`);
        console.log(`    - 角色数: ${result.jsonContent!.metadata.characters.length}`);
        console.log(`    - 地点数: ${result.jsonContent!.metadata.locations.length}`);
        console.log(`    - 时间标记: ${result.jsonContent!.metadata.timeReferences.length}`);
        console.log(`    - 角色列表: ${result.jsonContent!.metadata.characters.join(', ')}`);
        console.log(`    - 时间标记: ${result.jsonContent!.metadata.timeReferences.join(', ')}`);
      } else {
        await scriptFileService.updateFile(file.id, {
          conversionStatus: 'failed',
          conversionError: result.error || 'Unknown error'
        });

        console.log(`  ✗ 转换失败: ${result.error}`);
      }
    }

    // Step 3: Run AI cross-file analysis
    console.log('\n' + '='.repeat(60));
    console.log('🤖 步骤 3: 执行 AI 跨文件分析');
    console.log('='.repeat(60));

    // Get all files with jsonContent
    const allFiles = await scriptFileService.getFilesByProjectId(projectId);
    const convertedFiles = allFiles.filter(f => f.jsonContent !== null);

    console.log(`\n找到 ${convertedFiles.length} 个已转换的文件`);

    if (convertedFiles.length < 2) {
      console.log('⚠️  需要至少 2 个文件才能进行跨文件分析');
      return;
    }

    // Create AI analyzer
    const analyzer = createAICrossFileAnalyzer({
      useAI: true,
      minConfidence: 0.5
    });

    console.log(`\n使用分析器: ${analyzer.constructor.name}`);
    console.log(`配置: useAI=true, minConfidence=0.5`);

    // Run analysis
    console.log(`\n开始分析 ${convertedFiles.length} 个文件...`);
    console.log('（这可能需要 30-60 秒，请耐心等待）\n');

    const analysisResult = await analyzer.analyze(convertedFiles);

    console.log(`\n✓ 分析完成!`);
    console.log(`  - 总耗时: ${analysisResult.metadata?.analysisTime || 'N/A'}ms`);
    console.log(`  - 发现问题: ${analysisResult.findings.length} 个`);

    // Display findings by type
    console.log('\n' + '='.repeat(60));
    console.log('📊 步骤 4: 分析结果详情');
    console.log('='.repeat(60));

    if (analysisResult.findings.length === 0) {
      console.log('\n✅ 太棒了！未发现跨文件一致性问题。');
    } else {
      const findingsByType = analysisResult.findings.reduce((acc, f) => {
        if (!acc[f.type]) {
          acc[f.type] = [];
        }
        acc[f.type].push(f);
        return acc;
      }, {} as Record<string, any[]>);

      for (const [type, findings] of Object.entries(findingsByType)) {
        console.log(`\n【${type}】 - ${findings.length} 个问题`);
        console.log('-'.repeat(60));

        findings.forEach((finding, idx) => {
          console.log(`\n问题 ${idx + 1}:`);
          console.log(`  严重程度: ${finding.severity}`);
          console.log(`  置信度: ${(finding.confidence * 100).toFixed(0)}%`);
          console.log(`  描述: ${finding.description}`);
          console.log(`  涉及文件:`);
          finding.affectedFiles.forEach((af: any) => {
            console.log(`    - ${af.filename} (第${af.episodeNumber}集)`);
            if (af.relevantScenes && af.relevantScenes.length > 0) {
              console.log(`      场景: ${af.relevantScenes.join(', ')}`);
            }
          });
          if (finding.evidence) {
            console.log(`  证据:`);
            Object.entries(finding.evidence).forEach(([key, value]) => {
              if (value) {
                console.log(`    ${key}: ${value}`);
              }
            });
          }
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 测试总结');
    console.log('='.repeat(60));
    console.log(`✓ 上传文件: ${uploadedFiles.length} 个`);
    console.log(`✓ 成功转换: ${convertedFiles.length} 个`);
    console.log(`✓ 发现问题: ${analysisResult.findings.length} 个`);

    const criticalCount = analysisResult.findings.filter(f => f.severity === 'critical').length;
    const warningCount = analysisResult.findings.filter(f => f.severity === 'warning').length;
    const infoCount = analysisResult.findings.filter(f => f.severity === 'info').length;

    console.log(`  - Critical: ${criticalCount}`);
    console.log(`  - Warning: ${warningCount}`);
    console.log(`  - Info: ${infoCount}`);

    console.log('\n🎉 测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message);
      console.error('堆栈:', error.stack);
    }
    process.exit(1);
  }
}

main();
