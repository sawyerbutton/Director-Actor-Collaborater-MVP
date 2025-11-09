/**
 * 批量转换项目中所有待转换的文件
 */

import { scriptFileService } from '../lib/db/services/script-file.service';
import { createScriptConverter } from '../lib/conversion/script-converter';

async function main() {
  try {
    const projectId = process.argv[2] || 'cmhmzuduv0001qhvplxdcc3oq';

    console.log('🔄 批量转换待转换文件');
    console.log('='.repeat(60));
    console.log(`项目 ID: ${projectId}\n`);

    // 获取所有待转换和失败的文件
    const allFiles = await scriptFileService.getFilesByProjectId(projectId);
    const pendingFiles = allFiles.filter(
      f => f.conversionStatus === 'pending' || f.conversionStatus === 'failed'
    );

    console.log(`找到 ${pendingFiles.length} 个需要转换的文件:\n`);
    pendingFiles.forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.filename} (${f.conversionStatus})`);
    });

    if (pendingFiles.length === 0) {
      console.log('\n✅ 没有待转换的文件');
      return;
    }

    console.log('\n开始转换...\n');

    const converter = createScriptConverter();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      console.log(`[${i + 1}/${pendingFiles.length}] 转换: ${file.filename}`);

      try {
        // 更新状态为 processing
        await scriptFileService.updateFile(file.id, {
          conversionStatus: 'processing'
        });

        // 执行转换
        const result = await converter.convert(file.rawContent);

        if (result.success) {
          // 更新为成功
          await scriptFileService.updateFile(file.id, {
            jsonContent: result.jsonContent as any,
            conversionStatus: 'completed',
            conversionError: null
          });

          console.log(`  ✓ 成功! (${result.jsonContent!.scenes.length} 个场景)\n`);
          successCount++;
        } else {
          // 更新为失败
          await scriptFileService.updateFile(file.id, {
            conversionStatus: 'failed',
            conversionError: result.error || 'Unknown error'
          });

          console.log(`  ✗ 失败: ${result.error}\n`);
          failCount++;
        }

        // 延迟 2 秒避免 API 限流
        if (i < pendingFiles.length - 1) {
          console.log('  等待 2 秒...\n');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`  ✗ 错误:`, error instanceof Error ? error.message : error);

        await scriptFileService.updateFile(file.id, {
          conversionStatus: 'failed',
          conversionError: error instanceof Error ? error.message : 'Unknown error'
        });

        failCount++;
        console.log();
      }
    }

    // 总结
    console.log('='.repeat(60));
    console.log('📊 转换完成');
    console.log('='.repeat(60));
    console.log(`总计: ${pendingFiles.length} 个文件`);
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${failCount} 个`);

    if (failCount > 0) {
      console.log('\n提示: 失败的文件可以重新运行此脚本再次尝试');
    }

  } catch (error) {
    console.error('\n❌ 脚本执行失败:', error);
    process.exit(1);
  }
}

main();
