'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, FileText, GitCompare, Download } from 'lucide-react';
import { useRevisionStore } from '@/lib/stores/revision-store';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import { ScriptMerger } from '@/lib/services/script-merger';
import { cn } from '@/lib/utils';

type ViewMode = 'original' | 'modified' | 'diff';

export const ScriptPreview: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('diff');
  const originalScript = useAnalysisStore((state) => state.scriptContent);
  const { errors, getAcceptedSuggestions } = useRevisionStore();
  
  const merger = useMemo(() => {
    return new ScriptMerger(originalScript || '');
  }, [originalScript]);

  const mergeResult = useMemo(() => {
    return merger.processAcceptedErrors(errors);
  }, [merger, errors]);

  const statistics = useMemo(() => {
    return merger.getStatistics(errors);
  }, [merger, errors]);

  const renderOriginalScript = () => {
    return (
      <ScrollArea className="h-[500px] w-full">
        <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
          {originalScript || ''}
        </pre>
      </ScrollArea>
    );
  };

  const renderModifiedScript = () => {
    return (
      <ScrollArea className="h-[500px] w-full">
        <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
          {mergeResult.mergedScript}
        </pre>
      </ScrollArea>
    );
  };

  const renderDiffView = () => {
    return (
      <ScrollArea className="h-[500px] w-full">
        <div className="p-4 space-y-1">
          {mergeResult.changes.map((change, index) => {
            const lines = change.value.split('\n').filter(line => line !== '');
            
            return lines.map((line, lineIndex) => (
              <div
                key={`${index}-${lineIndex}`}
                className={cn(
                  'font-mono text-sm px-2 py-1 rounded',
                  change.type === 'add' && 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300',
                  change.type === 'remove' && 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 line-through',
                  change.type === 'normal' && 'text-gray-700 dark:text-gray-300'
                )}
              >
                <span className="inline-block w-8 text-gray-500 text-xs">
                  {change.lineNumber && change.lineNumber + lineIndex}
                </span>
                <span className="mr-2">
                  {change.type === 'add' && '+'}
                  {change.type === 'remove' && '-'}
                  {change.type === 'normal' && ' '}
                </span>
                {line}
              </div>
            ));
          })}
        </div>
      </ScrollArea>
    );
  };

  const renderConflicts = () => {
    if (mergeResult.conflicts.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
        <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          检测到修改冲突 ({mergeResult.conflicts.length})
        </h4>
        <ul className="space-y-1">
          {mergeResult.conflicts.map((conflict, index) => (
            <li key={index} className="text-xs text-yellow-700 dark:text-yellow-300">
              第 {conflict.line} 行: {conflict.description}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={20} />
            <span>剧本预览</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 text-sm">
              <Badge variant="outline">
                {statistics.acceptedCount} 修改已应用
              </Badge>
              <Badge variant="outline">
                {statistics.linesModified} 行已修改
              </Badge>
              {statistics.conflictsCount > 0 && (
                <Badge variant="destructive">
                  {statistics.conflictsCount} 冲突
                </Badge>
              )}
            </div>
          </div>
        </CardTitle>

        <div className="flex items-center gap-2 mt-4">
          <Button
            size="sm"
            variant={viewMode === 'original' ? 'default' : 'outline'}
            onClick={() => setViewMode('original')}
          >
            <FileText className="h-4 w-4 mr-1" />
            原始剧本
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'modified' ? 'default' : 'outline'}
            onClick={() => setViewMode('modified')}
          >
            <FileText className="h-4 w-4 mr-1" />
            修改后
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'diff' ? 'default' : 'outline'}
            onClick={() => setViewMode('diff')}
          >
            <GitCompare className="h-4 w-4 mr-1" />
            对比视图
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <Tabs value={viewMode} className="h-full">
          <TabsContent value="original" className="h-full mt-0">
            <div className="border rounded-lg">
              {renderOriginalScript()}
            </div>
          </TabsContent>
          
          <TabsContent value="modified" className="h-full mt-0">
            <div className="border rounded-lg">
              {renderModifiedScript()}
              {renderConflicts()}
            </div>
          </TabsContent>
          
          <TabsContent value="diff" className="h-full mt-0">
            <div className="border rounded-lg">
              {renderDiffView()}
              {renderConflicts()}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ScriptPreview;