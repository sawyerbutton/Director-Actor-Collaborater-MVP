/**
 * 检查所有文件的转换状态
 */
import { scriptFileService } from '../lib/db/services/script-file.service';

async function main() {
  const projectId = 'cmhmzuduv0001qhvplxdcc3oq';
  const files = await scriptFileService.getFilesByProjectId(projectId);

  console.log('\n📊 文件转换状态:');
  console.log('='.repeat(80));

  files.forEach((f, idx) => {
    const hasJson = f.jsonContent !== null;
    const status = f.conversionStatus;
    const statusIcon = status === 'completed' ? '✅' : status === 'processing' ? '⏳' : status === 'failed' ? '❌' : '⏸️';

    console.log(`${idx + 1}. ${statusIcon} ${f.filename.padEnd(35)} | ${status.padEnd(10)} | ${hasJson ? 'JSON ✓' : 'JSON ✗'}`);
  });

  const completed = files.filter(f => f.conversionStatus === 'completed').length;
  const failed = files.filter(f => f.conversionStatus === 'failed').length;
  const pending = files.filter(f => f.conversionStatus === 'pending').length;

  console.log('='.repeat(80));
  console.log(`总计: ${files.length} | 成功: ${completed} | 失败: ${failed} | 待转换: ${pending}`);
}

main();
