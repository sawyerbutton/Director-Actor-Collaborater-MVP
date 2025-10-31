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
import { DecisionCard } from '@/components/workspace/decision-card';
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
  // P0-2: 自由创作模式状态 (2025-10-11)
  const [isFreeCreationMode, setIsFreeCreationMode] = useState(false);
  const [manualFocusName, setManualFocusName] = useState('');
  const [manualFocusDescription, setManualFocusDescription] = useState('');

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

  // Act type metadata - 创作深化定位
  const getActMetadata = (act: ActType) => {
    const metadata = {
      ACT2_CHARACTER: {
        title: 'Act 2 - 角色深度创作',
        description: '构建角色成长弧线和心理深度（基于 Act 1 修复后的剧本）',
        icon: '🎭',
        focusLabel: '选择角色创作焦点',
        proposalLabel: 'AI创作方案提案',
        changesLabel: '角色深化修改'
      },
      ACT3_WORLDBUILDING: {
        title: 'Act 3 - 世界观丰富化',
        description: '深化世界观细节和设定逻辑（不是修复错误，而是丰富世界）',
        icon: '🌍',
        focusLabel: '选择世界观焦点',
        proposalLabel: 'AI创作方案',
        changesLabel: '世界观深化'
      },
      ACT4_PACING: {
        title: 'Act 4 - 叙事节奏优化',
        description: '优化情节节奏和戏剧张力（从流畅到扣人心弦）',
        icon: '⚡',
        focusLabel: '选择节奏焦点',
        proposalLabel: 'AI节奏优化方案',
        changesLabel: '节奏优化调整'
      },
      ACT5_THEME: {
        title: 'Act 5 - 主题精神深化',
        description: '定义角色内核和主题意境（从表层故事到精神深度）',
        icon: '✨',
        focusLabel: '选择主题焦点',
        proposalLabel: 'AI主题深化方案',
        changesLabel: '主题精神定义'
      }
    };
    return metadata[act];
  };

  const actMeta = getActMetadata(currentAct);

  // Handle finding selection
  const handleFindingSelect = (finding: Finding) => {
    setSelectedFinding(finding);
  };

  // Handle propose - get AI proposals (async job with polling)
  // P0-2: Support both diagnostic-driven and free creation modes
  const handlePropose = async () => {
    // Validate input based on mode
    if (isFreeCreationMode) {
      // Free creation mode validation
      if (!manualFocusName.trim() || !manualFocusDescription.trim()) {
        setError('请填写焦点名称和创作意图描述');
        return;
      }
    } else {
      // Diagnostic-driven mode validation
      if (!selectedFinding) {
        setError('请先选择一个焦点问题');
        return;
      }
    }

    try {
      setIsProposing(true);
      setError(null);

      // Prepare request body based on mode
      const requestBody = isFreeCreationMode ? {
        projectId,
        act: currentAct,
        focusName: manualFocusName.trim(),
        contradiction: manualFocusDescription.trim(),
        scriptContext: '' // No specific context in free mode
      } : {
        projectId,
        act: currentAct,
        focusName: extractFocusName(selectedFinding!),
        contradiction: selectedFinding!.description,
        scriptContext: selectedFinding!.suggestion || ''
      };

      // Step 1: Create async job
      const response = await fetch('/api/v1/iteration/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`创建任务失败: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const jobId = data.data.jobId;

      console.log('[Propose] Job created:', jobId);

      // Step 2: Poll job status until complete
      const pollInterval = setInterval(async () => {
        try {
          // Trigger processing first (Serverless compatibility)
          await v1ApiService.triggerProcessing();

          // Check job status
          const statusResponse = await fetch(`/api/v1/iteration/jobs/${jobId}`);
          if (!statusResponse.ok) {
            throw new Error('获取任务状态失败');
          }

          const statusData = await statusResponse.json();
          const jobStatus = statusData.data;

          console.log('[Propose] Job status:', jobStatus.status);

          if (jobStatus.status === 'COMPLETED') {
            clearInterval(pollInterval);

            // Extract result from job
            const result = jobStatus.result;
            setProposeResponse({
              decisionId: result.decisionId,
              focusContext: result.focusContext,
              proposals: result.proposals,
              recommendation: result.recommendation
            });
            setWorkflowStep({ step: 'view_proposals', data: result });
            setIsProposing(false);
          } else if (jobStatus.status === 'FAILED') {
            clearInterval(pollInterval);
            setError(jobStatus.error || 'AI分析失败');
            setIsProposing(false);
          }
          // Continue polling if status is QUEUED or PROCESSING
        } catch (err) {
          console.error('[Propose] Polling error:', err);
          // Don't stop polling on error, allow retry
        }
      }, 5000); // Poll every 5 seconds

    } catch (err) {
      console.error('Propose failed:', err);
      setError(err instanceof Error ? err.message : '获取AI提案失败，请重试');
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

      // Reload project data to get updated workflow status
      const project = await v1ApiService.getProject(projectId);
      setWorkflowStatus(project.workflowStatus);
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

  // Filter findings by current Act (each Act focuses on specific finding types)
  const filterFindingsByAct = (findings: Finding[], act: ActType): Finding[] => {
    const actFindingTypeMap: Record<ActType, Finding['type'][]> = {
      ACT2_CHARACTER: ['character'],  // Focus on character contradictions
      ACT3_WORLDBUILDING: ['scene', 'plot'],  // Focus on worldbuilding and setting logic
      ACT4_PACING: ['timeline'],  // Focus on pacing and rhythm
      ACT5_THEME: ['character', 'dialogue']  // Focus on character depth and thematic dialogue
    };

    const allowedTypes = actFindingTypeMap[act];
    return findings.filter(f => allowedTypes.includes(f.type));
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

  // Helper function to determine unlocked acts (全解锁模式 - 修复2025-10-11)
  const getUnlockedActs = (): ActType[] => {
    // ✅ P0修复：移除渐进式解锁，支持产品Plan B定位
    // Acts 2-5 独立价值，用户可自由选择工作流
    if (diagnosticReport) {
      // 如果ACT1完成，解锁所有创作深化Acts
      return ['ACT2_CHARACTER', 'ACT3_WORLDBUILDING', 'ACT4_PACING', 'ACT5_THEME'];
    }
    // 如果ACT1未完成，仍然只开放ACT2（降级兼容）
    return ['ACT2_CHARACTER'];
  };

  // Helper function to check if a finding is processed
  const isFindingProcessed = (finding: Finding): boolean => {
    return decisions.some(decision => {
      if (!decision.userChoice || !decision.generatedChanges) return false;

      // Match by description similarity
      const focusDesc = String(decision.focusContext?.contradiction || '');
      return focusDesc.includes(finding.description) ||
             finding.description.includes(focusDesc);
    });
  };

  // Count how many times a finding was processed
  const getProcessedCount = (finding: Finding): number => {
    return decisions.filter(decision => {
      if (!decision.userChoice || !decision.generatedChanges) return false;

      const focusDesc = String(decision.focusContext?.contradiction || '');
      return focusDesc.includes(finding.description) ||
             finding.description.includes(focusDesc);
    }).length;
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
        unlockedActs={getUnlockedActs()}
        onActClick={(act: WorkspaceActType) => {
          setCurrentAct(act as ActType);
          // Reset workflow when changing acts
          setWorkflowStep({ step: 'select_focus' });
          setSelectedFinding(null);
          setProposeResponse(null);
          setExecuteResponse(null);
        }}
      />

      {/* P1-2: 使用指引 (2025-10-11) */}
      {decisionsCount === 0 && (
        <Alert className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <BookOpen className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-900">
            <p className="font-medium mb-2">💡 工作流程指引</p>
            <ol className="text-sm space-y-1 list-decimal list-inside text-purple-800">
              <li><strong>选择焦点</strong>：从 ACT1 诊断问题中选择，或使用自由创作模式手动输入</li>
              <li><strong>获取方案</strong>：AI 生成 2 个创作增强方案（30-60秒）</li>
              <li><strong>选择执行</strong>：选择最合适的方案，AI 生成具体修改</li>
              <li><strong>重复迭代</strong>：切换不同 Act 继续深化创作</li>
              <li><strong>生成剧本</strong>：完成后点击右上角"生成最终剧本"按钮</li>
            </ol>
            <p className="text-xs text-purple-600 mt-2">
              提示：所有 Acts 2-5 可自由切换，无需按顺序完成
            </p>
          </AlertDescription>
        </Alert>
      )}

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
                  {currentAct === 'ACT2_CHARACTER' && '💡 不是修复错误，而是深化角色弧线：从平面角色 → 立体角色（成长、转变、内在冲突）'}
                  {currentAct === 'ACT3_WORLDBUILDING' && '💡 不是修复错误，而是丰富世界观：从合理设定 → 引人入胜的世界（细节、深度、主题对齐）'}
                  {currentAct === 'ACT4_PACING' && '💡 不是修复错误，而是优化节奏：从流畅叙事 → 扣人心弦的节奏（张力、留白、高潮分布）'}
                  {currentAct === 'ACT5_THEME' && '💡 不是修复错误，而是深化主题：从表层故事 → 精神内核（恐惧、信念、共情）'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Transform and filter findings based on current Act
                  const allFindings = transformDiagnosticFindings(diagnosticReport?.findings || []);
                  const filteredFindings = filterFindingsByAct(allFindings, currentAct);

                  // P0-2: If no findings for this Act, offer free creation mode
                  if (filteredFindings.length === 0) {
                    return (
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription>
                          <p className="font-medium mb-2 text-blue-900">当前 Act 没有 ACT1 诊断问题</p>
                          <p className="text-sm text-blue-700 mb-3">
                            {currentAct === 'ACT2_CHARACTER' && 'ACT2 关注角色深化，但 ACT1 诊断中没有发现角色类型的问题。'}
                            {currentAct === 'ACT3_WORLDBUILDING' && 'ACT3 关注世界观丰富化，但 ACT1 诊断中没有发现场景或情节类型的问题。'}
                            {currentAct === 'ACT4_PACING' && 'ACT4 关注节奏优化，但 ACT1 诊断中没有发现时间线类型的问题。'}
                            {currentAct === 'ACT5_THEME' && 'ACT5 关注主题深化，但 ACT1 诊断中没有发现角色或对话类型的问题。'}
                          </p>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-blue-900">💡 您可以：</p>
                            <div className="flex flex-col gap-2">
                              <Button
                                onClick={() => setIsFreeCreationMode(true)}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                size="sm"
                              >
                                <Sparkles className="mr-2 h-4 w-4" />
                                使用自由创作模式（手动输入焦点）
                              </Button>
                              <p className="text-xs text-blue-600 text-center">
                                或切换到其他 Act，或直接进入合成阶段
                              </p>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    );
                  }

                  // P0-2: Free creation mode input (when enabled)
                  if (isFreeCreationMode) {
                    return (
                      <div className="space-y-4">
                        <Alert className="bg-purple-50 border-purple-200">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <AlertDescription className="text-purple-900">
                            <p className="font-medium">自由创作模式</p>
                            <p className="text-sm text-purple-700 mt-1">
                              手动输入您想要深化的创作焦点，AI 将基于当前剧本生成增强方案。
                            </p>
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium mb-1 block">
                              焦点名称 *
                            </label>
                            <input
                              type="text"
                              value={manualFocusName}
                              onChange={(e) => setManualFocusName(e.target.value)}
                              placeholder={
                                currentAct === 'ACT2_CHARACTER' ? '例如：主角李明' :
                                currentAct === 'ACT3_WORLDBUILDING' ? '例如：未来都市世界观' :
                                currentAct === 'ACT4_PACING' ? '例如：第二幕节奏' :
                                '例如：角色内心世界'
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-1 block">
                              创作意图描述 *
                            </label>
                            <textarea
                              value={manualFocusDescription}
                              onChange={(e) => setManualFocusDescription(e.target.value)}
                              placeholder={
                                currentAct === 'ACT2_CHARACTER' ? '描述您希望如何深化这个角色的成长弧线、内在冲突或心理转变...' :
                                currentAct === 'ACT3_WORLDBUILDING' ? '描述您希望如何丰富世界观的细节、设定逻辑或戏剧张力...' :
                                currentAct === 'ACT4_PACING' ? '描述您希望如何优化这部分的节奏、张力或情感强度...' :
                                '描述您希望如何深化主题、角色精神内核或情感共鸣...'
                              }
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={handlePropose}
                              disabled={isProposing || !manualFocusName.trim() || !manualFocusDescription.trim()}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            >
                              {isProposing ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  AI分析中...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  获取AI创作方案
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setIsFreeCreationMode(false);
                                setManualFocusName('');
                                setManualFocusDescription('');
                              }}
                              variant="outline"
                              disabled={isProposing}
                            >
                              取消
                            </Button>
                          </div>
                          {isProposing && (
                            <p className="text-sm text-muted-foreground text-center">
                              AI正在分析并生成创作方案，预计需要30-60秒...
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <FindingsSelector
                      findings={filteredFindings}
                      onSelect={handleFindingSelect}
                      selectedFinding={selectedFinding || undefined}
                      processedFindings={new Set(
                        filteredFindings
                          .map((f, idx) => isFindingProcessed(f) ? idx : -1)
                          .filter((idx: number) => idx !== -1)
                      )}
                      getProcessedCount={(finding) => getProcessedCount(finding)}
                    />
                  );
                })()}

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
                        AI正在分析问题并生成解决方案，预计需要30-60秒，请耐心等待...
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
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="space-y-2">
                    <p>✓ 本次迭代已完成！决策已保存到数据库。</p>
                    {/* Check if new act is unlocked */}
                    {(() => {
                      const unlockedActs = getUnlockedActs();
                      const completedActs = getCompletedActs();
                      const actOrder: ActType[] = ['ACT2_CHARACTER', 'ACT3_WORLDBUILDING', 'ACT4_PACING', 'ACT5_THEME'];
                      const currentIndex = actOrder.indexOf(currentAct);
                      const nextAct = actOrder[currentIndex + 1];

                      if (nextAct && unlockedActs.includes(nextAct) && !completedActs.includes(nextAct)) {
                        const nextActName = getActMetadata(nextAct).title;
                        return (
                          <div className="mt-3 pt-3 border-t border-green-300">
                            <p className="font-semibold text-green-900 flex items-center gap-2">
                              🎉 恭喜！{nextActName} 已解锁
                            </p>
                            <p className="text-sm text-green-700 mt-1">
                              点击上方进度条中的"{nextActName}"可以切换到下一个阶段
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
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
                    <DecisionCard key={decision.id} decision={decision} />
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
