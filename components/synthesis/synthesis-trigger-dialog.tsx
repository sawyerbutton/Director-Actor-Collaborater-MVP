'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react';

export interface SynthesisOptions {
  preserveOriginalStyle: boolean;
  conflictResolution: 'latest_takes_precedence' | 'merge_compatible' | 'prioritize_by_severity' | 'auto_reconcile';
  changeIntegrationMode: 'auto_reconcile' | 'manual_review';
  includeChangeLog: boolean;
  validateCoherence: boolean;
}

export interface SynthesisTriggerDialogProps {
  projectId: string;
  decisionsCount: number;
  onTrigger: (options: SynthesisOptions) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SynthesisTriggerDialog({
  projectId,
  decisionsCount,
  onTrigger,
  isLoading = false,
  disabled = false
}: SynthesisTriggerDialogProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<SynthesisOptions>({
    preserveOriginalStyle: true,
    conflictResolution: 'auto_reconcile',
    changeIntegrationMode: 'auto_reconcile',
    includeChangeLog: true,
    validateCoherence: true
  });

  const handleTrigger = async () => {
    await onTrigger(options);
    setOpen(false);
  };

  const canSynthesize = decisionsCount > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          disabled={disabled || !canSynthesize}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          生成最终剧本 (V2)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            合成最终剧本
          </DialogTitle>
          <DialogDescription>
            将所有 Acts 2-5 的决策智能合成为最终剧本版本 (V2)
          </DialogDescription>
        </DialogHeader>

        {!canSynthesize && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              至少需要完成一个 Act 2-5 的决策才能进行合成。
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* Stats */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{decisionsCount}</div>
                <div className="text-sm text-gray-600">已完成决策</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">~{Math.floor(decisionsCount * 1.5)}分钟</div>
                <div className="text-sm text-gray-600">预计合成时间</div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="preserve-style">保持原文风格</Label>
                <p className="text-sm text-muted-foreground">
                  分析原剧本的6维度风格并在生成时保持一致
                </p>
              </div>
              <Switch
                id="preserve-style"
                checked={options.preserveOriginalStyle}
                onCheckedChange={(checked: boolean) =>
                  setOptions({ ...options, preserveOriginalStyle: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-changelog">包含修改日志</Label>
                <p className="text-sm text-muted-foreground">
                  在导出时附带详细的修改记录
                </p>
              </div>
              <Switch
                id="include-changelog"
                checked={options.includeChangeLog}
                onCheckedChange={(checked: boolean) =>
                  setOptions({ ...options, includeChangeLog: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="validate-coherence">一致性验证</Label>
                <p className="text-sm text-muted-foreground">
                  合成后进行完整性和连贯性检查
                </p>
              </div>
              <Switch
                id="validate-coherence"
                checked={options.validateCoherence}
                onCheckedChange={(checked: boolean) =>
                  setOptions({ ...options, validateCoherence: checked })
                }
              />
            </div>

            <div className="pt-2 border-t">
              <Label>冲突解决策略</Label>
              <p className="text-sm text-muted-foreground mb-2">
                当不同Act的决策产生冲突时的处理方式
              </p>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={options.conflictResolution}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    conflictResolution: e.target.value as any
                  })
                }
              >
                <option value="auto_reconcile">自动协调 (推荐)</option>
                <option value="latest_takes_precedence">后续决策优先</option>
                <option value="prioritize_by_severity">按严重程度优先</option>
                <option value="merge_compatible">合并兼容修改</option>
              </select>
            </div>
          </div>

          {/* Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>注意：</strong>合成过程将调用DeepSeek API生成完整的最终剧本，
              根据剧本长度可能需要1-5分钟。合成完成后可在版本历史中查看V2版本。
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            取消
          </Button>
          <Button onClick={handleTrigger} disabled={isLoading || !canSynthesize}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                合成中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                开始合成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
