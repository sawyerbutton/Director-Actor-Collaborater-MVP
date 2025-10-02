'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Film, Sparkles } from 'lucide-react';

export interface DramaticAction {
  sequence: number;
  scene: string;
  action: string;
  reveals: string;
  dramaticFunction?: string;
}

export interface ChangesDisplayProps {
  changes: DramaticAction[];
  overallArc?: string;
  integrationNotes?: string;
  onAccept?: () => void;
  onModify?: (changes: DramaticAction[]) => void;
  className?: string;
}

export function ChangesDisplay({
  changes,
  overallArc,
  integrationNotes,
  onAccept,
  onModify,
  className
}: ChangesDisplayProps) {
  if (changes.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-gray-500">
          暂无生成的变更
        </CardContent>
      </Card>
    );
  }

  // Sort by sequence
  const sortedChanges = [...changes].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall arc summary */}
      {overallArc && (
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              整体弧线
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{overallArc}</p>
          </CardContent>
        </Card>
      )}

      {/* Dramatic actions */}
      <div className="space-y-3">
        {sortedChanges.map((change) => (
          <Card key={change.sequence} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    场景 {change.sequence}
                  </Badge>
                  <Film className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              <CardTitle className="text-base mt-2">{change.scene}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Action description */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  戏剧动作
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {change.action}
                </p>
              </div>

              {/* What it reveals */}
              <div className="bg-green-50 p-3 rounded-md">
                <h4 className="text-sm font-medium text-green-900 mb-1">
                  揭示内容
                </h4>
                <p className="text-sm text-green-700">{change.reveals}</p>
              </div>

              {/* Dramatic function */}
              {change.dramaticFunction && (
                <div className="bg-purple-50 p-3 rounded-md">
                  <h4 className="text-sm font-medium text-purple-900 mb-1">
                    戏剧功能
                  </h4>
                  <p className="text-sm text-purple-700">{change.dramaticFunction}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration notes */}
      {integrationNotes && (
        <Card className="bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm">整合建议</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{integrationNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {(onAccept || onModify) && (
        <div className="flex gap-3 justify-end pt-4">
          {onModify && (
            <Button variant="outline" onClick={() => onModify(changes)}>
              修改方案
            </Button>
          )}
          {onAccept && (
            <Button onClick={onAccept}>
              接受并应用
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
