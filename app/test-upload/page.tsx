'use client';

import { EnhancedScriptUpload } from '@/components/analysis/enhanced-script-upload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestUploadPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>文件上传增强测试 - Epic 002</CardTitle>
          <CardDescription>
            测试拖拽上传和 Markdown 格式支持功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedScriptUpload />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>功能特性</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✅</span>
              <div>
                <strong>拖拽上传</strong>: 支持拖拽文件到指定区域上传
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✅</span>
              <div>
                <strong>Markdown 支持</strong>: 自动识别并解析 .md 格式文件
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✅</span>
              <div>
                <strong>多文件上传</strong>: 支持同时上传多个文件
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✅</span>
              <div>
                <strong>视觉反馈</strong>: 拖拽时的实时视觉反馈
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✅</span>
              <div>
                <strong>进度显示</strong>: 上传进度实时显示
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✅</span>
              <div>
                <strong>错误处理</strong>: 友好的错误提示和恢复机制
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Markdown 剧本示例</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
{`# 场景 1 - 内景 - 咖啡店 - 日

咖啡店里人来人往，午后的阳光透过窗户洒进来。

**服务员**: 欢迎光临！请问需要点什么？

**顾客**: 一杯拿铁，谢谢。

*(服务员微笑着记下订单)*

**服务员**: 好的，请稍等。

## 淡出

# 场景 2 - 外景 - 街道 - 夜

繁忙的街道上，霓虹灯闪烁。

**路人甲**: 这个城市从不睡觉。`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}