'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ActProgressBar, type ActType as WorkspaceActType } from '@/components/workspace/act-progress-bar';
import { FindingsSelector, type Finding } from '@/components/workspace/findings-selector';
import { ProposalComparison, type Proposal as WorkspaceProposal } from '@/components/workspace/proposal-comparison';
import { ChangesDisplay } from '@/components/workspace/changes-display';
import { v1ApiService } from '@/lib/services/v1-api-service';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  BookOpen
} from 'lucide-react';

type ActType = 'ACT2_CHARACTER' | 'ACT3_WORLDBUILDING' | 'ACT4_PACING' | 'ACT5_THEME';

interface WorkflowStep {
  step: 'select_focus' | 'view_proposals' | 'view_changes' | 'completed';
  data?: any;
}

// Use Finding type from workspace component
// DiagnosticFinding will be transformed to Finding

interface ProposeResponse {
  decisionId: string;
  focusContext: any;
  proposals: WorkspaceProposal[];
  recommendation?: string;
}

interface ExecuteResponse {
  decisionId: string;
  generatedChanges: any;
}

export default function IterationPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // State management
  const [currentAct, setCurrentAct] = useState<ActType>('ACT2_CHARACTER');
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>({ step: 'select_focus' });
  const [isLoading, setIsLoading] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Project data
  const [projectTitle, setProjectTitle] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState('');
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null);

  // Iteration data
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [proposeResponse, setProposeResponse] = useState<ProposeResponse | null>(null);
  const [executeResponse, setExecuteResponse] = useState<ExecuteResponse | null>(null);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [decisionsCount, setDecisionsCount] = useState(0);

  // Load project data on mount
  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get project details
      const project = await v1ApiService.getProject(projectId);
      setProjectTitle(project.title);
      setWorkflowStatus(project.workflowStatus);

      // Get diagnostic report if Act 1 is complete
      if (project.workflowStatus !== 'INITIALIZED' && project.workflowStatus !== 'ACT1_RUNNING') {
        const reportData = await v1ApiService.getDiagnosticReport(projectId);
        console.log('[Iteration Page] Diagnostic report loaded:', {
          hasReport: !!reportData.report,
          findingsCount: reportData.report?.findings?.length || 0,
          workflowStatus: project.workflowStatus
        });
        setDiagnosticReport(reportData.report);
      } else {
        console.log('[Iteration Page] Act 1 not complete yet. Status:', project.workflowStatus);
      }

      // Load existing decisions
      await loadDecisions();
    } catch (err) {
      console.error('Failed to load project data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDecisions = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/decisions`);
      if (response.ok) {
        const data = await response.json();
        setDecisions(data.data.decisions || []);
        setDecisionsCount(data.data.decisions?.length || 0);
      }
    } catch (err) {
      console.error('Failed to load decisions:', err);
    }
  };

  // Act type metadata
  const getActMetadata = (act: ActType) => {
    const metadata = {
      ACT2_CHARACTER: {
        title: 'Act 2 - 角色弧光',
        description: '修复角色行为矛盾，构建一致的角色发展弧线',
        icon: '🎭',
        focusLabel: '选择角色矛盾',
        proposalLabel: '解决方案提案',
        changesLabel: '戏剧化修改'
      },
      ACT3_WORLDBUILDING: {
        title: 'Act 3 - 世界观审查',
        description: '审查设定逻辑一致性，确保世界观与主题对齐',
        icon: '🌍',
        focusLabel: '选择设定问题',
        proposalLabel: '世界观解决方案',
        changesLabel: '设定修正策略'
      },
      ACT4_PACING: {
        title: 'Act 4 - 节奏优化',
        description: '优化情节节奏，重新分配冲突和情感空间',
        icon: '⚡',
        focusLabel: '选择节奏问题',
        proposalLabel: '节奏优化策略',
        changesLabel: '结构调整方案'
      },
      ACT5_THEME: {
        title: 'Act 5 - 主题润色',
        description: '强化角色深度，定义核心恐惧与信念',
        icon: '✨',
        focusLabel: '选择角色',
        proposalLabel: '角色深度分析',
        changesLabel: '角色核心定义'
      }
    };
    return metadata[act];
  };

  const actMeta = getActMetadata(currentAct);

  // Handle finding selection
  const handleFindingSelect = (finding: Finding) => {
    setSelectedFinding(finding);
  };

  // Handle propose - get AI proposals
  const handlePropose = async () => {
    if (!selectedFinding) {
      setError('请先选择一个焦点问题');
      return;
    }

    try {
      setIsProposing(true);
      setError(null);

      const response = await fetch('/api/v1/iteration/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          act: currentAct,
          focusName: extractFocusName(selectedFinding),
          contradiction: selectedFinding.description,
          scriptContext: selectedFinding.suggestion || ''
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`获取提案失败: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      setProposeResponse(data.data);
      setWorkflowStep({ step: 'view_proposals', data: data.data });
    } catch (err) {
      console.error('Propose failed:', err);
      setError(err instanceof Error ? err.message : '获取AI提案失败，请重试');
    } finally {
      setIsProposing(false);
    }
  };

  // Handle execute - apply selected proposal
  const handleExecute = async (proposalId: string, index: number) => {
    if (!proposeResponse) return;

    try {
      setIsExecuting(true);
      setError(null);

      const response = await fetch('/api/v1/iteration/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionId: proposeResponse.decisionId,
          proposalChoice: index // Send as number (0 or 1), not string
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`执行方案失败: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.log('[Execute] Response data:', data.data);
      console.log('[Execute] Generated Changes:', data.data.generatedChanges);
      setExecuteResponse(data.data);
      setWorkflowStep({ step: 'view_changes', data: data.data });

      // Reload decisions
      await loadDecisions();
    } catch (err) {
      console.error('Execute failed:', err);
      setError(err instanceof Error ? err.message : '执行方案失败，请重试');
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle completing current iteration
  const handleComplete = () => {
    setWorkflowStep({ step: 'completed' });
    // Reset for next iteration
    setTimeout(() => {
      setSelectedFinding(null);
      setProposeResponse(null);
      setExecuteResponse(null);
      setWorkflowStep({ step: 'select_focus' });
    }, 2000);
  };

  // Helper function to transform diagnostic findings to Finding type
  const transformDiagnosticFindings = (diagnosticFindings: any[]): Finding[] => {
    return diagnosticFindings.map((f) => ({
      type: f.type as Finding['type'],
      severity: (f.severity === 'critical' || f.severity === 'high' || f.severity === 'medium' || f.severity === 'low')
        ? f.severity
        : 'medium' as Finding['severity'],
      description: f.description,
      location: f.location,
      suggestion: f.suggestion
    }));
  };

  // Helper function to extract focus name from finding
  const extractFocusName = (finding: Finding): string => {
    // Try to extract character/element name from description
    // This is a simple implementation, can be enhanced
    const characterName = finding.location?.characterName;
    if (characterName) return characterName;

    const match = finding.description.match(/([^\s]+)(?:的|在|说)/);
    return match ? match[1] : finding.type;
  };

  // Helper function to determine completed acts based on executed decisions
  const getCompletedActs = (): ActType[] => {
    const actDecisions: Record<string, number> = {
      ACT2_CHARACTER: 0,
      ACT3_WORLDBUILDING: 0,
      ACT4_PACING: 0,
      ACT5_THEME: 0
    };

    // Count executed decisions per act
    decisions.forEach(decision => {
      if (decision.userChoice && decision.generatedChanges) {
        actDecisions[decision.act] = (actDecisions[decision.act] || 0) + 1;
      }
    });

    // Return acts with at least 1 executed decision
    return Object.keys(actDecisions)
      .filter(act => actDecisions[act] > 0) as ActType[];
  };

  // Show loading while data is being fetched
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">加载项目数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if Act 1 is complete
  if (!diagnosticReport) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>请先完成 Act 1 基础诊断，然后返回此页面进行迭代修改。</p>
              {workflowStatus && (
                <p className="text-sm text-muted-foreground">
                  当前工作流状态: <Badge variant="outline">{workflowStatus}</Badge>
                </p>
              )}
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/analysis/${projectId}`)}
                >
                  前往 Act 1 分析
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/analysis/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回分析
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {actMeta.icon} {actMeta.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {projectTitle} - {actMeta.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {decisionsCount > 0 && (
            <Button
              onClick={() => router.push(`/synthesis/${projectId}`)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              生成最终剧本 ({decisionsCount})
            </Button>
          )}
          <Badge variant="outline" className="text-lg px-4 py-2">
            {workflowStatus}
          </Badge>
        </div>
      </div>

      {/* Act Progress Bar */}
      <ActProgressBar
        currentAct={currentAct}
        completedActs={getCompletedActs()}
        onActClick={(act: WorkspaceActType) => {
          setCurrentAct(act as ActType);
          // Reset workflow when changing acts
          setWorkflowStep({ step: 'select_focus' });
          setSelectedFinding(null);
          setProposeResponse(null);
          setExecuteResponse(null);
        }}
      />

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="workflow" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflow">迭代工作流</TabsTrigger>
          <TabsTrigger value="history">决策历史 ({decisions.length})</TabsTrigger>
        </TabsList>

        {/* Workflow Tab */}
        <TabsContent value="workflow" className="space-y-4">
          {/* Step 1: Select Focus */}
          {workflowStep.step === 'select_focus' && (
            <Card>
              <CardHeader>
                <CardTitle>{actMeta.focusLabel}</CardTitle>
                <CardDescription>
                  从 Act 1 诊断报告中选择一个问题作为本次迭代的焦点
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FindingsSelector
                  findings={transformDiagnosticFindings(diagnosticReport?.findings || [])}
                  onSelect={handleFindingSelect}
                  selectedFinding={selectedFinding || undefined}
                />

                {selectedFinding && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* Selected Finding Summary */}
                    <Alert className="bg-blue-50 border-blue-200">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium text-blue-900">
                            已选择焦点问题：
                          </p>
                          <div className="bg-white p-3 rounded-md border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {selectedFinding.type === 'character' && '角色'}
                                {selectedFinding.type === 'timeline' && '时间线'}
                                {selectedFinding.type === 'scene' && '场景'}
                                {selectedFinding.type === 'plot' && '情节'}
                                {selectedFinding.type === 'dialogue' && '对话'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {selectedFinding.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-900">
                              {selectedFinding.description}
                            </p>
                            {selectedFinding.location?.characterName && (
                              <p className="text-xs text-gray-600 mt-2">
                                角色: {selectedFinding.location.characterName}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-blue-700 mt-2">
                            点击下方按钮，让 AI 为此问题生成解决方案
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>

                    {/* Submit Button */}
                    <Button
                      onClick={handlePropose}
                      disabled={isProposing}
                      className="w-full"
                      size="lg"
                    >
                      {isProposing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          AI分析中，请稍候...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          获取AI解决方案提案
                        </>
                      )}
                    </Button>
                    {isProposing && (
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        AI正在分析问题并生成解决方案，预计需要10-30秒
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: View Proposals */}
          {workflowStep.step === 'view_proposals' && proposeResponse && (
            <Card>
              <CardHeader>
                <CardTitle>{actMeta.proposalLabel}</CardTitle>
                <CardDescription>
                  AI为您生成了以下解决方案，请选择最合适的一个
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProposalComparison
                  proposals={proposeResponse.proposals}
                  onSelect={handleExecute}
                  selectedId={proposeResponse.recommendation}
                  isExecuting={isExecuting}
                />

                <div className="mt-4 pt-4 border-t flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setWorkflowStep({ step: 'select_focus' });
                      setProposeResponse(null);
                    }}
                  >
                    重新选择问题
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: View Changes */}
          {workflowStep.step === 'view_changes' && executeResponse && (
            <Card>
              <CardHeader>
                <CardTitle>{actMeta.changesLabel}</CardTitle>
                <CardDescription>
                  AI已根据您选择的方案生成具体的修改内容
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Render changes based on current Act */}
                {currentAct === 'ACT2_CHARACTER' && (
                  <ChangesDisplay
                    changes={executeResponse.generatedChanges?.dramaticActions || []}
                    overallArc={executeResponse.generatedChanges?.overallArc}
                    integrationNotes={executeResponse.generatedChanges?.integrationNotes}
                  />
                )}

                {/* For other Acts, show raw JSON data temporarily */}
                {currentAct !== 'ACT2_CHARACTER' && (
                  <div className="space-y-4">
                    {executeResponse.generatedChanges ? (
                      <Card>
                        <CardHeader>
                          <CardTitle>生成的修改内容</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-sm">
                            {JSON.stringify(executeResponse.generatedChanges, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          暂无生成的变更数据
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setWorkflowStep({ step: 'select_focus' });
                      setSelectedFinding(null);
                      setProposeResponse(null);
                      setExecuteResponse(null);
                    }}
                  >
                    继续下一个问题
                  </Button>
                  <Button onClick={handleComplete}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    完成本次迭代
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Completed */}
          {workflowStep.step === 'completed' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✓ 本次迭代已完成！决策已保存到数据库。
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>决策历史记录</CardTitle>
              <CardDescription>
                查看本项目所有Act的决策记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              {decisions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无决策记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {decisions.map((decision) => (
                    <div
                      key={decision.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>{decision.act.replace('_', ' ')}</Badge>
                            <span className="font-medium">{decision.focusName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {JSON.stringify(decision.focusContext).substring(0, 100)}...
                          </p>
                          {decision.userChoice && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-green-600">
                                ✓ 已执行方案 #{decision.userChoice}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(decision.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
