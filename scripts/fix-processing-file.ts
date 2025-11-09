/**
 * 修复卡在 processing 状态的文件
 */
import { scriptFileService } from '../lib/db/services/script-file.service';
import { createScriptConverter } from '../lib/conversion/script-converter';

async function main() {
  const projectId = 'cmhmzuduv0001qhvplxdcc3oq';

  const allFiles = await scriptFileService.getFilesByProjectId(projectId);
  const processingFiles = allFiles.filter(f => f.conversionStatus === 'processing');

  if (processingFiles.length === 0) {
    console.log('✅ 没有 processing 状态的文件');
    return;
  }

  console.log(`找到 ${processingFiles.length} 个 processing 状态的文件，开始转换:\n`);

  const converter = createScriptConverter();

  for (const file of processingFiles) {
    console.log(`[转换] ${file.filename}`);

    const result = await converter.convert(file.rawContent);

    if (result.success) {
      await scriptFileService.updateFile(file.id, {
        jsonContent: result.jsonContent as any,
        conversionStatus: 'completed',
        conversionError: null
      });
      console.log(`  ✓ 成功! (${result.jsonContent!.scenes.length} 个场景)\n`);
    } else {
      await scriptFileService.updateFile(file.id, {
        conversionStatus: 'failed',
        conversionError: result.error
      });
      console.log(`  ✗ 失败: ${result.error}\n`);
    }
  }
}

main();
