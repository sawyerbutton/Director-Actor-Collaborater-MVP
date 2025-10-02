'use client';

import React, { useEffect } from 'react';
import { RevisionErrorList } from '@/components/revision/revision-error-list';
import { ScriptPreview } from '@/components/revision/script-preview';
import { ExportDialog } from '@/components/revision/export-dialog';
import { RevisionControls } from '@/components/revision/revision-controls';
import { useRevisionStore } from '@/lib/stores/revision-store';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, AlertCircle } from 'lucide-react';

export default function RevisionPage() {
  const { errors, getAcceptedSuggestions, getRejectedSuggestions, getPendingSuggestions } = useRevisionStore();
  const { scriptContent, analysisErrors } = useAnalysisStore((state) => ({
    scriptContent: state.scriptContent,
    analysisErrors: state.errors
  }));

  const acceptedCount = getAcceptedSuggestions().length;
  const rejectedCount = getRejectedSuggestions().length;
  const pendingCount = getPendingSuggestions().length;
  const totalCount = errors.length;

  if (!scriptContent && analysisErrors.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            请先上传剧本并进行分析，然后返回此页面查看修改建议。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">剧本修订</h1>
          <p className="text-muted-foreground mt-1">
            审查AI提供的修改建议，选择接受或拒绝，并导出修订后的剧本
          </p>
        </div>
        <div className="flex items-center gap-4">
          <RevisionControls />
          <ExportDialog />
        </div>
      </div>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">修订进度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalCount}</div>
              <div className="text-sm text-muted-foreground">总建议数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
              <div className="text-sm text-muted-foreground">已接受</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              <div className="text-sm text-muted-foreground">已拒绝</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">待处理</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="flex h-2 rounded-full overflow-hidden">
                {acceptedCount > 0 && (
                  <div
                    className="bg-green-600"
                    style={{ width: `${(acceptedCount / totalCount) * 100}%` }}
                  />
                )}
                {rejectedCount > 0 && (
                  <div
                    className="bg-red-600"
                    style={{ width: `${(rejectedCount / totalCount) * 100}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="suggestions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suggestions">修改建议</TabsTrigger>
          <TabsTrigger value="preview">剧本预览</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4">
          <RevisionErrorList />
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <ScriptPreview />
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <InfoIcon className="h-4 w-4" />
            使用提示
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 点击"接受"应用AI的修改建议，点击"拒绝"保留原始内容</li>
            <li>• 使用撤销（Ctrl+Z）和重做（Ctrl+Y）快捷键快速调整决定</li>
            <li>• 在"剧本预览"标签页查看修改后的完整剧本</li>
            <li>• 所有修改会自动保存为草稿，可以随时返回继续编辑</li>
            <li>• 导出时可以选择纯文本或Word格式，并包含修改统计信息</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}