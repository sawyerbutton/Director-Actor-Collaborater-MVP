'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export interface Finding {
  type: 'character' | 'timeline' | 'scene' | 'plot' | 'dialogue';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  location?: {
    sceneNumber?: number;
    characterName?: string;
    dialogueIndex?: number;
  };
  suggestion?: string;
}

export interface FindingsSelectorProps {
  findings: Finding[];
  onSelect: (finding: Finding) => void;
  className?: string;
  selectedFinding?: Finding;
  processedFindings?: Set<number>;
  getProcessedCount?: (finding: Finding) => number;
}

function getSeverityIcon(severity: Finding['severity']) {
  switch (severity) {
    case 'critical':
    case 'high':
      return <AlertTriangle className="w-4 h-4" />;
    case 'medium':
      return <Info className="w-4 h-4" />;
    case 'low':
      return <CheckCircle2 className="w-4 h-4" />;
  }
}

function getSeverityColor(severity: Finding['severity']): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
}

function getTypeLabel(type: Finding['type']): string {
  const labels: Record<Finding['type'], string> = {
    character: '角色',
    timeline: '时间线',
    scene: '场景',
    plot: '情节',
    dialogue: '对话'
  };
  return labels[type];
}

export function FindingsSelector({
  findings,
  onSelect,
  className,
  selectedFinding,
  processedFindings,
  getProcessedCount
}: FindingsSelectorProps) {
  const [filter, setFilter] = useState<Finding['type'] | 'all'>('all');

  const filteredFindings = filter === 'all'
    ? findings
    : findings.filter(f => f.type === filter);

  // Group by type
  const findingsByType = filteredFindings.reduce((acc, finding) => {
    if (!acc[finding.type]) {
      acc[finding.type] = [];
    }
    acc[finding.type].push(finding);
    return acc;
  }, {} as Record<Finding['type'], Finding[]>);

  const types: Finding['type'][] = ['character', 'timeline', 'scene', 'plot', 'dialogue'];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          全部 ({findings.length})
        </Button>
        {types.map(type => {
          const count = findings.filter(f => f.type === type).length;
          if (count === 0) return null;
          return (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type)}
            >
              {getTypeLabel(type)} ({count})
            </Button>
          );
        })}
      </div>

      {/* Findings list */}
      <div className="space-y-3">
        {filteredFindings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              没有发现问题
            </CardContent>
          </Card>
        ) : (
          filteredFindings.map((finding, index) => {
            const isSelected = selectedFinding === finding;
            const isProcessed = processedFindings?.has(index) || false;
            const processedCount = getProcessedCount?.(finding) || 0;
            return (
            <Card
              key={index}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md relative',
                isSelected && 'ring-2 ring-blue-500 bg-blue-50/50 border-blue-300',
                isProcessed && !isSelected && 'opacity-60 bg-gray-50'
              )}
              onClick={() => onSelect(finding)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                    {getSeverityIcon(finding.severity)}
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(finding.type)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getSeverityColor(finding.severity))}
                    >
                      {finding.severity}
                    </Badge>
                    {isProcessed && (
                      <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        已处理 {processedCount > 1 && `(${processedCount}次)`}
                      </Badge>
                    )}
                  </div>
                  {isSelected && (
                    <Badge className="bg-blue-600">已选择</Badge>
                  )}
                </div>
                <CardTitle className={cn(
                  'text-base mt-2',
                  isSelected && 'text-blue-900',
                  isProcessed && !isSelected && 'text-gray-600'
                )}>
                  {finding.description}
                </CardTitle>
                {finding.location && (
                  <CardDescription className="text-xs">
                    {finding.location.sceneNumber && `场景 ${finding.location.sceneNumber}`}
                    {finding.location.characterName && ` • ${finding.location.characterName}`}
                  </CardDescription>
                )}
              </CardHeader>
              {finding.suggestion && (
                <CardContent className="pt-0">
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">建议：</span> {finding.suggestion}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
