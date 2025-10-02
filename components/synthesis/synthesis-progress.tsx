'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  FileText,
  AlertTriangle
} from 'lucide-react';

export type SynthesisStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface SynthesisProgressProps {
  status: SynthesisStatus;
  currentStep?: string;
  progress?: number;
  error?: string;
  versionId?: string;
  confidence?: number;
  className?: string;
}

const SYNTHESIS_STEPS = [
  { key: 'grouping', label: '分组决策' },
  { key: 'conflict_detection', label: '冲突检测' },
  { key: 'conflict_resolution', label: '冲突解决' },
  { key: 'style_analysis', label: '风格分析' },
  { key: 'prompt_building', label: '构建提示词' },
  { key: 'chunking', label: '分块处理' },
  { key: 'ai_synthesis', label: 'AI生成' },
  { key: 'merging', label: '合并内容' },
  { key: 'validation', label: '验证一致性' },
  { key: 'version_creation', label: '创建版本' }
];

export function SynthesisProgress({
  status,
  currentStep,
  progress = 0,
  error,
  versionId,
  confidence,
  className
}: SynthesisProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'QUEUED':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case 'PROCESSING':
        return <Loader2 className="h-5 w-5 animate-spin text-purple-600" />;
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'QUEUED':
        return <Badge variant="outline" className="bg-blue-50">队列中</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-purple-600">处理中</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-600">已完成</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">失败</Badge>;
    }
  };

  const getCurrentStepIndex = () => {
    if (!currentStep) return -1;
    return SYNTHESIS_STEPS.findIndex(step => step.key === currentStep);
  };

  const stepIndex = getCurrentStepIndex();
  const completedSteps = stepIndex >= 0 ? stepIndex : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle>合成进度</CardTitle>
              <CardDescription>
                {status === 'COMPLETED'
                  ? '最终剧本已生成'
                  : status === 'FAILED'
                  ? '合成失败'
                  : '正在生成最终剧本...'}
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {(status === 'QUEUED' || status === 'PROCESSING') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                步骤 {completedSteps + 1}/{SYNTHESIS_STEPS.length}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Current Step */}
        {status === 'PROCESSING' && currentStep && (
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
              <span className="text-sm font-medium text-purple-900">
                当前步骤: {SYNTHESIS_STEPS.find(s => s.key === currentStep)?.label}
              </span>
            </div>
          </div>
        )}

        {/* Steps List */}
        {status !== 'FAILED' && (
          <div className="space-y-2">
            {SYNTHESIS_STEPS.map((step, index) => {
              const isCompleted = index < stepIndex;
              const isCurrent = index === stepIndex;
              const isPending = index > stepIndex;

              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 p-2 rounded ${
                    isCurrent ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      isCompleted
                        ? 'text-gray-600 line-through'
                        : isCurrent
                        ? 'font-medium text-purple-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Success Result */}
        {status === 'COMPLETED' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <p className="font-medium">✓ 合成成功完成！</p>
                {versionId && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    <span>版本ID: {versionId}</span>
                  </div>
                )}
                {confidence !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4" />
                    <span>置信度: {(confidence * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {status === 'FAILED' && error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">合成失败</p>
              <p className="text-sm">{error}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Info */}
        {status === 'PROCESSING' && (
          <div className="text-sm text-muted-foreground bg-gray-50 rounded-lg p-3">
            <p>💡 <strong>提示：</strong>合成过程可能需要1-5分钟，请耐心等待。
            您可以关闭此窗口，系统会在后台继续处理。</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
