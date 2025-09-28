#!/usr/bin/env tsx
/**
 * 诊断脚本：智能修复功能失败分析
 * Epic-001 Story 1: 诊断和定位Bug根因
 *
 * 使用方法：
 * 1. 安装依赖: npm install
 * 2. 设置环境变量: cp .env.example .env.diagnosis
 * 3. 运行脚本: npx tsx scripts/diagnose-repair-failure.ts
 */

import { RevisionExecutive } from '../lib/agents/revision-executive';
import { ConsistencyGuardian } from '../lib/agents/consistency-guardian';
import { ScriptParser } from '../lib/parser/script-parser';
import { DeepSeekClient } from '../lib/api/deepseek/client';
import * as fs from 'fs/promises';
import * as path from 'path';

// 诊断配置
const DIAGNOSIS_CONFIG = {
  outputDir: 'diagnosis-reports',
  testScriptPath: 'test-data/sample-script-with-errors.txt',
  maxRetries: 3,
  timeout: 30000,
  verbose: true
};

// 测试场景
const TEST_SCENARIOS = [
  {
    name: 'Simple Character Error',
    script: `
      场景 1 - 内景 - 咖啡店 - 日
      JOHN走进咖啡店。

      MARY: 早上好，Tom！

      JOHN: 早上好，Mary。
    `,
    expectedError: 'character_consistency'
  },
  {
    name: 'Timeline Error',
    script: `
      场景 1 - 内景 - 办公室 - 早上9点
      ALICE在开会。

      场景 2 - 内景 - 餐厅 - 早上8点
      ALICE在吃早餐。
    `,
    expectedError: 'timeline_consistency'
  },
  {
    name: 'Complex Mixed Errors',
    script: `
      场景 1 - 外景 - 街道 - 夜晚
      下着大雨。BOB撑着伞走在街上。

      场景 2 - 内景 - BOB的家 - 同一时间
      BOB在看电视，阳光从窗户照进来。
    `,
    expectedError: 'multiple_errors'
  }
];

// 诊断结果接口
interface DiagnosisResult {
  scenario: string;
  success: boolean;
  error?: Error;
  apiCalls: number;
  responseTime: number;
  detectedErrors?: any[];
  repairAttempts?: any[];
  logs: string[];
}

class RepairDiagnostic {
  private results: DiagnosisResult[] = [];
  private logs: string[] = [];

  constructor(
    private revisionExecutive: RevisionExecutive,
    private consistencyGuardian: ConsistencyGuardian,
    private scriptParser: ScriptParser
  ) {}

  // 主诊断流程
  async runDiagnosis(): Promise<void> {
    console.log('🔍 开始智能修复功能诊断...\n');

    // 1. 检查环境配置
    await this.checkEnvironment();

    // 2. 测试API连接
    await this.testAPIConnection();

    // 3. 运行测试场景
    for (const scenario of TEST_SCENARIOS) {
      await this.testScenario(scenario);
    }

    // 4. 生成诊断报告
    await this.generateReport();

    console.log('\n✅ 诊断完成！报告已保存到:', path.join(DIAGNOSIS_CONFIG.outputDir, 'diagnosis-report.json'));
  }

  // 检查环境配置
  private async checkEnvironment(): Promise<void> {
    this.log('=== 环境检查 ===');

    const checks = {
      'DEEPSEEK_API_KEY': !!process.env.DEEPSEEK_API_KEY,
      'DEEPSEEK_API_URL': !!process.env.DEEPSEEK_API_URL,
      'DATABASE_URL': !!process.env.DATABASE_URL,
      'Node Version': process.version,
      'Platform': process.platform
    };

    for (const [key, value] of Object.entries(checks)) {
      this.log(`${key}: ${value}`);
    }

    if (!checks['DEEPSEEK_API_KEY']) {
      throw new Error('缺少 DEEPSEEK_API_KEY 环境变量');
    }
  }

  // 测试API连接
  private async testAPIConnection(): Promise<void> {
    this.log('\n=== API连接测试 ===');

    const startTime = Date.now();
    try {
      // 尝试简单的API调用
      const client = new DeepSeekClient();
      const response = await client.chat({
        messages: [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: 'Reply with "OK" if you receive this.' }
        ],
        temperature: 0
      });

      const responseTime = Date.now() - startTime;
      this.log(`API响应成功 (${responseTime}ms)`);
      this.log(`响应内容: ${response.choices?.[0]?.message?.content || 'No content'}`);
    } catch (error) {
      this.log(`API连接失败: ${error.message}`);
      throw error;
    }
  }

  // 测试单个场景
  private async testScenario(scenario: any): Promise<void> {
    console.log(`\n📝 测试场景: ${scenario.name}`);

    const result: DiagnosisResult = {
      scenario: scenario.name,
      success: false,
      apiCalls: 0,
      responseTime: 0,
      logs: []
    };

    const startTime = Date.now();

    try {
      // 1. 解析剧本
      result.logs.push('解析剧本...');
      const parsedScript = await this.scriptParser.parse(scenario.script);

      // 2. 检测错误
      result.logs.push('检测逻辑错误...');
      const errors = await this.consistencyGuardian.analyzeScript(parsedScript);
      result.detectedErrors = errors;
      result.apiCalls++;

      if (errors.length === 0) {
        result.logs.push('警告: 未检测到预期的错误');
      } else {
        result.logs.push(`检测到 ${errors.length} 个错误`);

        // 3. 尝试修复
        result.logs.push('尝试修复错误...');
        result.repairAttempts = [];

        for (const error of errors) {
          try {
            const repair = await this.revisionExecutive.generateFix(error);
            result.repairAttempts.push({
              error: error,
              repair: repair,
              success: true
            });
            result.apiCalls++;
          } catch (repairError) {
            result.repairAttempts.push({
              error: error,
              repair: null,
              success: false,
              errorMessage: repairError.message
            });
            throw repairError; // 这里是关键失败点
          }
        }
      }

      result.success = true;
      result.logs.push('✅ 场景测试成功');

    } catch (error) {
      result.error = error;
      result.logs.push(`❌ 错误: ${error.message}`);
      result.logs.push(`错误栈: ${error.stack}`);

      // 分析错误类型
      this.analyzeError(error, result);
    }

    result.responseTime = Date.now() - startTime;
    this.results.push(result);

    // 输出结果摘要
    console.log(`  状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    console.log(`  耗时: ${result.responseTime}ms`);
    console.log(`  API调用: ${result.apiCalls}次`);
    if (result.error) {
      console.log(`  错误: ${result.error.message}`);
    }
  }

  // 分析错误类型
  private analyzeError(error: Error, result: DiagnosisResult): void {
    result.logs.push('\n=== 错误分析 ===');

    // 检查常见错误模式
    if (error.message.includes('timeout')) {
      result.logs.push('错误类型: 超时');
      result.logs.push('建议: 增加超时时间或优化API调用');
    } else if (error.message.includes('API')) {
      result.logs.push('错误类型: API错误');
      result.logs.push('建议: 检查API密钥和端点配置');
    } else if (error.message.includes('parse')) {
      result.logs.push('错误类型: 解析错误');
      result.logs.push('建议: 检查响应格式验证逻辑');
    } else if (error.message.includes('validation')) {
      result.logs.push('错误类型: 验证错误');
      result.logs.push('建议: 检查Zod schema定义');
    } else {
      result.logs.push('错误类型: 未知');
      result.logs.push('建议: 需要深入调试');
    }
  }

  // 生成诊断报告
  private async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalScenarios: this.results.length,
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        totalApiCalls: this.results.reduce((sum, r) => sum + r.apiCalls, 0),
        averageResponseTime: Math.round(
          this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length
        )
      },
      results: this.results,
      systemLogs: this.logs,
      recommendations: this.generateRecommendations()
    };

    // 确保输出目录存在
    await fs.mkdir(DIAGNOSIS_CONFIG.outputDir, { recursive: true });

    // 保存JSON报告
    const reportPath = path.join(DIAGNOSIS_CONFIG.outputDir, 'diagnosis-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // 保存可读报告
    const readableReport = this.generateReadableReport(report);
    const readablePath = path.join(DIAGNOSIS_CONFIG.outputDir, 'diagnosis-report.md');
    await fs.writeFile(readablePath, readableReport);
  }

  // 生成建议
  private generateRecommendations(): string[] {
    const recommendations = [];

    const failedResults = this.results.filter(r => !r.success);

    if (failedResults.length > 0) {
      // 分析失败模式
      const hasTimeouts = failedResults.some(r => r.error?.message.includes('timeout'));
      const hasAPIErrors = failedResults.some(r => r.error?.message.includes('API'));
      const hasValidationErrors = failedResults.some(r => r.error?.message.includes('validation'));

      if (hasTimeouts) {
        recommendations.push('实施重试机制with指数退避');
        recommendations.push('增加API调用超时时间到30秒');
      }

      if (hasAPIErrors) {
        recommendations.push('添加API响应格式验证');
        recommendations.push('实施fallback机制');
        recommendations.push('检查DeepSeek API最新文档');
      }

      if (hasValidationErrors) {
        recommendations.push('更新Zod validation schemas');
        recommendations.push('添加响应格式转换层');
      }

      recommendations.push('增强错误日志记录');
      recommendations.push('添加性能监控指标');
    }

    return recommendations;
  }

  // 生成可读报告
  private generateReadableReport(report: any): string {
    return `# 智能修复功能诊断报告

生成时间: ${report.timestamp}

## 执行摘要

- 测试场景数: ${report.summary.totalScenarios}
- 成功: ${report.summary.successful}
- 失败: ${report.summary.failed}
- API调用总数: ${report.summary.totalApiCalls}
- 平均响应时间: ${report.summary.averageResponseTime}ms

## 测试结果

${report.results.map(r => `
### ${r.scenario}
- 状态: ${r.success ? '✅ 成功' : '❌ 失败'}
- 响应时间: ${r.responseTime}ms
- API调用: ${r.apiCalls}次
${r.error ? `- 错误: ${r.error.message}` : ''}
${r.detectedErrors ? `- 检测到错误: ${r.detectedErrors.length}个` : ''}
${r.repairAttempts ? `- 修复尝试: ${r.repairAttempts.length}次` : ''}
`).join('\n')}

## 建议

${report.recommendations.map(r => `- ${r}`).join('\n')}

## 详细日志

请查看 diagnosis-report.json 获取完整日志信息。
`;
  }

  // 记录日志
  private log(message: string): void {
    if (DIAGNOSIS_CONFIG.verbose) {
      console.log(message);
    }
    this.logs.push(message);
  }
}

// 主函数
async function main() {
  try {
    // 初始化组件
    const scriptParser = new ScriptParser();
    const consistencyGuardian = new ConsistencyGuardian();
    const revisionExecutive = new RevisionExecutive();

    // 运行诊断
    const diagnostic = new RepairDiagnostic(
      revisionExecutive,
      consistencyGuardian,
      scriptParser
    );

    await diagnostic.runDiagnosis();

    process.exit(0);
  } catch (error) {
    console.error('💥 诊断过程中发生致命错误:', error);
    process.exit(1);
  }
}

// 运行诊断
if (require.main === module) {
  main();
}