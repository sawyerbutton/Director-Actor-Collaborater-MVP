'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface DecisionCardProps {
  decision: {
    id: string;
    act: string;
    focusName: string;
    focusContext: any;
    proposals: any[];
    userChoice: string | null;
    generatedChanges: any;
    createdAt: string;
  };
}

export function DecisionCard({ decision }: DecisionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getActLabel = (act: string) => {
    const labels: Record<string, string> = {
      ACT2_CHARACTER: 'Act 2 - 角色弧光',
      ACT3_WORLDBUILDING: 'Act 3 - 世界观',
      ACT4_PACING: 'Act 4 - 节奏优化',
      ACT5_THEME: 'Act 5 - 主题润色'
    };
    return labels[act] || act;
  };

  const renderChanges = () => {
    if (!decision.generatedChanges) {
      return <p className="text-sm text-muted-foreground">暂无生成内容</p>;
    }

    switch (decision.act) {
      case 'ACT2_CHARACTER':
        return (
          <div className="space-y-3">
            {decision.generatedChanges.dramaticActions?.length > 0 && (
              <div>
                <h5 className="font-medium text-sm mb-2">戏剧化动作:</h5>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {decision.generatedChanges.dramaticActions.slice(0, 3).map((action: any, idx: number) => (
                    <li key={idx}>
                      场景 {action.sceneNumber}: {action.action.substring(0, 60)}
                      {action.action.length > 60 && '...'}
                    </li>
                  ))}
                  {decision.generatedChanges.dramaticActions.length > 3 && (
                    <li className="text-muted-foreground">
                      + {decision.generatedChanges.dramaticActions.length - 3} 个更多动作
                    </li>
                  )}
                </ul>
              </div>
            )}
            {decision.generatedChanges.overallArc && (
              <div>
                <h5 className="font-medium text-sm mb-1">整体弧线:</h5>
                <p className="text-sm text-muted-foreground">
                  {decision.generatedChanges.overallArc.substring(0, 100)}
                  {decision.generatedChanges.overallArc.length > 100 && '...'}
                </p>
              </div>
            )}
            {decision.generatedChanges.integrationNotes && (
              <div>
                <h5 className="font-medium text-sm mb-1">集成说明:</h5>
                <p className="text-sm text-muted-foreground">
                  {decision.generatedChanges.integrationNotes}
                </p>
              </div>
            )}
          </div>
        );

      case 'ACT3_WORLDBUILDING':
        return (
          <div className="space-y-2">
            {decision.generatedChanges.coreRecommendation && (
              <div>
                <h5 className="font-medium text-sm mb-1">核心建议:</h5>
                <p className="text-sm text-muted-foreground">
                  {decision.generatedChanges.coreRecommendation.substring(0, 100)}
                  {decision.generatedChanges.coreRecommendation.length > 100 && '...'}
                </p>
              </div>
            )}
            {decision.generatedChanges.alignmentStrategies && (
              <div>
                <h5 className="font-medium text-sm mb-1">对齐策略:</h5>
                <p className="text-sm text-muted-foreground">
                  {decision.generatedChanges.alignmentStrategies.length} 条策略
                </p>
              </div>
            )}
            {decision.generatedChanges.integrationNotes && (
              <div>
                <h5 className="font-medium text-sm mb-1">集成说明:</h5>
                <p className="text-sm text-muted-foreground">
                  {decision.generatedChanges.integrationNotes}
                </p>
              </div>
            )}
          </div>
        );

      case 'ACT4_PACING':
        return (
          <div className="space-y-2">
            {decision.generatedChanges.expectedImprovement && (
              <div>
                <h5 className="font-medium text-sm mb-1">预期改进:</h5>
                <p className="text-sm text-muted-foreground">
                  {decision.generatedChanges.expectedImprovement.substring(0, 100)}
                  {decision.generatedChanges.expectedImprovement.length > 100 && '...'}
                </p>
              </div>
            )}
            {decision.generatedChanges.changes && (
              <div>
                <h5 className="font-medium text-sm mb-1">变更内容:</h5>
                <p className="text-sm text-muted-foreground">
                  {decision.generatedChanges.changes.length} 处变更
                </p>
              </div>
            )}
            {decision.generatedChanges.integrationNotes && (
              <div>
                <h5 className="font-medium text-sm mb-1">集成说明:</h5>
                <p className="text-sm text-muted-foreground">
                  {decision.generatedChanges.integrationNotes}
                </p>
              </div>
            )}
          </div>
        );

      case 'ACT5_THEME':
        return (
          <div className="space-y-2">
            {decision.generatedChanges.characterCore && (
              <div>
                <h5 className="font-medium text-sm mb-1">角色核心:</h5>
                {decision.generatedChanges.characterCore.coreFears && (
                  <p className="text-sm text-muted-foreground">
                    核心恐惧: {decision.generatedChanges.characterCore.coreFears.join(', ')}
                  </p>
                )}
                {decision.generatedChanges.characterCore.coreBeliefs && (
                  <p className="text-sm text-muted-foreground mt-1">
                    核心信念: {decision.generatedChanges.characterCore.coreBeliefs.join(', ')}
                  </p>
                )}
              </div>
            )}
            {decision.generatedChanges.integrationNotes && (
              <div>
                <h5 className="font-medium text-sm mb-1">集成说明:</h5>
                <p className="text-sm text-muted-foreground">
                  {decision.generatedChanges.integrationNotes}
                </p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(decision.generatedChanges, null, 2)}
          </pre>
        );
    }
  };

  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{getActLabel(decision.act)}</Badge>
              <span className="font-medium text-sm">{decision.focusName}</span>
            </div>
            {decision.userChoice && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                已执行
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(decision.createdAt).toLocaleString('zh-CN')}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-3">生成的修改内容:</h4>
            {renderChanges()}
          </div>
        </CardContent>
      )}

      <div className="px-6 pb-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              收起
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              查看详情
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
