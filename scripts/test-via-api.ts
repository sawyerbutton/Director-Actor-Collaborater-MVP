/**
 * 通过 API 端点测试完整流程
 */

const projectId = 'cmhmzuduv0001qhvplxdcc3oq';
const apiBase = 'http://localhost:3000/api/v1';

// 测试数据
const testScripts = [
  {
    filename: '第1集.md',
    episodeNumber: 1,
    content: `# 第1集：初遇

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
    content: `# 第2集：新的开始

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
    console.log('🚀 通过 API 测试完整流程');
    console.log('='.repeat(60));

    // Step 1: 上传文件
    console.log('\n📝 步骤 1: 上传测试文件');
    console.log('-'.repeat(60));

    const uploadedFiles = [];
    for (const script of testScripts) {
      console.log(`\n上传: ${script.filename}`);

      const formData = new FormData();
      const blob = new Blob([script.content], { type: 'text/markdown' });
      formData.append('file', blob, script.filename);
      formData.append('episodeNumber', script.episodeNumber.toString());

      const uploadRes = await fetch(`${apiBase}/projects/${projectId}/files`, {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error(`上传失败: ${uploadRes.statusText}`);
      }

      const uploadData = await uploadRes.json();
      uploadedFiles.push(uploadData.data);
      console.log(`  ✓ 文件ID: ${uploadData.data.id}`);
    }

    // Step 2: 等待转换完成
    console.log('\n\n🔄 步骤 2: 等待 MD→JSON 转换');
    console.log('-'.repeat(60));
    console.log('等待 10 秒让后台转换完成...\n');

    await new Promise(resolve => setTimeout(resolve, 10000));

    // 检查转换状态
    for (const file of uploadedFiles) {
      const statusRes = await fetch(`${apiBase}/projects/${projectId}/files`);
      const statusData = await statusRes.json();
      const fileStatus = statusData.data.files.find((f: any) => f.id === file.id);
      console.log(`${file.filename}: ${fileStatus.conversionStatus}`);
    }

    // Step 3: 运行跨文件分析
    console.log('\n\n🤖 步骤 3: 运行 AI 跨文件分析');
    console.log('-'.repeat(60));
    console.log('开始分析（预计 60-90 秒）...\n');

    const analysisRes = await fetch(
      `${apiBase}/projects/${projectId}/analyze/cross-file`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            useAI: true,
            minConfidence: 0.5
          }
        })
      }
    );

    if (!analysisRes.ok) {
      throw new Error(`分析失败: ${analysisRes.statusText}`);
    }

    const analysisData = await analysisRes.json();
    const findings = analysisData.data.findings;

    console.log('✓ 分析完成!');
    console.log(`  - 发现问题: ${findings.length} 个\n`);

    // Step 4: 显示结果
    if (findings.length === 0) {
      console.log('✅ 未发现跨文件一致性问题');
    } else {
      console.log('📊 发现的问题:');
      console.log('='.repeat(60));

      const byType = findings.reduce((acc: any, f: any) => {
        if (!acc[f.type]) acc[f.type] = [];
        acc[f.type].push(f);
        return acc;
      }, {});

      for (const [type, items] of Object.entries(byType)) {
        const typedItems = items as any[];
        console.log(`\n【${type}】 - ${typedItems.length} 个问题`);
        console.log('-'.repeat(60));

        typedItems.forEach((f, idx) => {
          console.log(`\n${idx + 1}. ${f.description}`);
          console.log(`   严重程度: ${f.severity} | 置信度: ${(f.confidence * 100).toFixed(0)}%`);
          console.log(`   涉及文件: ${f.affectedFiles.map((af: any) => af.filename).join(', ')}`);
        });
      }
    }

    console.log('\n\n🎉 测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('详情:', error.message);
    }
    process.exit(1);
  }
}

main();
