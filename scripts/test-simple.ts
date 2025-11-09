/**
 * 简化测试脚本 - 仅测试已存在的转换文件
 */

import { scriptFileService } from '../lib/db/services/script-file.service';
import { createAICrossFileAnalyzer } from '../lib/analysis/ai-cross-file-analyzer';

async function main() {
  try {
    console.log('🚀 测试 AI 跨文件分析');
    console.log('='.repeat(60));

    const projectId = 'cmhmzuduv0001qhvplxdcc3oq';

    // 获取所有已转换的文件
    const allFiles = await scriptFileService.getFilesByProjectId(projectId);
    const convertedFiles = allFiles.filter(f => f.jsonContent !== null);

    console.log(`\n找到 ${convertedFiles.length} 个已转换的文件:`);
    convertedFiles.forEach(f => {
      console.log(`  - ${f.filename} (第${f.episodeNumber}集)`);
    });

    if (convertedFiles.length < 2) {
      console.log('\n⚠️  需要至少 2 个已转换的文件');
      console.log('提示: 请先运行完整测试脚本上传和转换文件');
      return;
    }

    // 创建 AI 分析器
    const analyzer = createAICrossFileAnalyzer({
      useAI: true,
      minConfidence: 0.5
    });

    console.log('\n开始 AI 分析...');
    console.log('（预计需要 60-90 秒）\n');

    const startTime = Date.now();
    const result = await analyzer.analyze(convertedFiles);
    const duration = Date.now() - startTime;

    console.log('\n✓ 分析完成!');
    console.log(`  - 耗时: ${duration}ms (${(duration/1000).toFixed(1)}秒)`);
    console.log(`  - 发现问题: ${result.findings.length} 个`);

    // 按类型分组显示
    if (result.findings.length === 0) {
      console.log('\n✅ 未发现跨文件一致性问题');
    } else {
      const byType = result.findings.reduce((acc, f) => {
        if (!acc[f.type]) acc[f.type] = [];
        acc[f.type].push(f);
        return acc;
      }, {} as Record<string, any[]>);

      console.log('\n' + '='.repeat(60));
      console.log('📊 分析结果详情');
      console.log('='.repeat(60));

      for (const [type, findings] of Object.entries(byType)) {
        console.log(`\n【${type}】 - ${findings.length} 个问题`);
        console.log('-'.repeat(60));

        findings.forEach((f, idx) => {
          console.log(`\n问题 ${idx + 1}:`);
          console.log(`  严重程度: ${f.severity}`);
          console.log(`  置信度: ${(f.confidence * 100).toFixed(0)}%`);
          console.log(`  描述: ${f.description}`);
          console.log(`  涉及文件:`);
          f.affectedFiles.forEach((af: any) => {
            console.log(`    - ${af.filename} (第${af.episodeNumber}集)`);
            if (af.relevantScenes && af.relevantScenes.length > 0) {
              console.log(`      场景: ${af.relevantScenes.join(', ')}`);
            }
          });
        });
      }
    }

    // 统计
    console.log('\n' + '='.repeat(60));
    console.log('📈 统计总结');
    console.log('='.repeat(60));

    const critical = result.findings.filter(f => f.severity === 'critical').length;
    const warning = result.findings.filter(f => f.severity === 'warning').length;
    const info = result.findings.filter(f => f.severity === 'info').length;

    console.log(`总问题数: ${result.findings.length}`);
    console.log(`  - Critical: ${critical}`);
    console.log(`  - Warning: ${warning}`);
    console.log(`  - Info: ${info}`);

    console.log('\n🎉 测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('详情:', error.message);
    }
    process.exit(1);
  }
}

main();
