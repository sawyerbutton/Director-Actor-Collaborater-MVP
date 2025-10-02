'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SynthesisTriggerDialog, type SynthesisOptions } from '@/components/synthesis/synthesis-trigger-dialog';
import { SynthesisProgress, type SynthesisStatus } from '@/components/synthesis/synthesis-progress';
import {
  ArrowLeft,
  Download,
  FileText,
  GitCompare,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';

interface ScriptVersion {
  id: string;
  version: number;
  content: string;
  changeLog?: string;
  synthesisMetadata?: any;
  confidence?: number;
  createdAt: string;
}

export default function SynthesisPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [decisionsCount, setDecisionsCount] = useState(0);
  const [synthesisJobId, setSynthesisJobId] = useState<string | null>(null);
  const [synthesisStatus, setSynthesisStatus] = useState<SynthesisStatus | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [v2Version, setV2Version] = useState<ScriptVersion | null>(null);
  const [v1Version, setV1Version] = useState<ScriptVersion | null>(null);

  // Load project data
  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // Poll synthesis job status
  useEffect(() => {
    if (!synthesisJobId) return;

    const pollInterval = setInterval(async () => {
      await checkSynthesisStatus();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [synthesisJobId, synthesisStatus]);

  const loadProjectData = async () => {
    try {
      setIsLoading(true);

      // Get project details
      const projectRes = await fetch(`/api/v1/projects/${projectId}`);
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProjectTitle(projectData.data.title);
      }

      // Get decisions count
      const decisionsRes = await fetch(`/api/v1/projects/${projectId}/decisions`);
      if (decisionsRes.ok) {
        const decisionsData = await decisionsRes.json();
        setDecisionsCount(decisionsData.data.decisions?.length || 0);
      }

      // Get versions
      const versionsRes = await fetch(`/api/v1/projects/${projectId}/versions`);
      if (versionsRes.ok) {
        const versionsData = await versionsRes.json();
        const versions = versionsData.data.versions || [];

        // Find V1 and V2
        setV1Version(versions.find((v: ScriptVersion) => v.version === 1) || null);
        setV2Version(versions.find((v: ScriptVersion) => v.version === 2) || null);
      }
    } catch (err) {
      console.error('Failed to load project data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerSynthesis = async (options: SynthesisOptions) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/v1/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          options
        })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger synthesis');
      }

      const data = await response.json();
      setSynthesisJobId(data.data.jobId);
      setSynthesisStatus('QUEUED');
    } catch (err) {
      console.error('Failed to trigger synthesis:', err);
      setError(err instanceof Error ? err.message : 'Failed to trigger synthesis');
    } finally {
      setIsLoading(false);
    }
  };

  const checkSynthesisStatus = async () => {
    if (!synthesisJobId) return;

    try {
      const response = await fetch(`/api/v1/synthesize/${synthesisJobId}/status`);
      if (!response.ok) return;

      const data = await response.json();
      const jobData = data.data;

      setSynthesisStatus(jobData.status);
      setProgress(jobData.progress || 0);
      setCurrentStep(jobData.currentStep || '');

      if (jobData.status === 'COMPLETED') {
        // Load the V2 version
        if (jobData.versionId) {
          const versionRes = await fetch(`/api/v1/versions/${jobData.versionId}`);
          if (versionRes.ok) {
            const versionData = await versionRes.json();
            setV2Version(versionData.data);
          }
        }
      } else if (jobData.status === 'FAILED') {
        setError(jobData.error || 'Synthesis failed');
      }
    } catch (err) {
      console.error('Failed to check synthesis status:', err);
    }
  };

  const handleExport = async (versionId: string, format: 'TXT' | 'MD') => {
    try {
      const response = await fetch('/api/v1/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId,
          format,
          includeMetadata: true,
          includeChangeLog: true
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const data = await response.json();
      const jobId = data.data.jobId;

      // Poll export job
      const checkExport = async () => {
        const exportRes = await fetch(`/api/v1/export/${jobId}`);
        if (exportRes.ok) {
          const exportData = await exportRes.json();
          if (exportData.data.status === 'COMPLETED') {
            window.open(exportData.data.downloadUrl, '_blank');
          } else {
            setTimeout(checkExport, 1000);
          }
        }
      };

      checkExport();
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/iteration/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回迭代
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-purple-600" />
              剧本合成
            </h1>
            <p className="text-muted-foreground mt-1">
              {projectTitle} - 生成最终剧本版本
            </p>
          </div>
        </div>
        {!v2Version && (
          <SynthesisTriggerDialog
            projectId={projectId}
            decisionsCount={decisionsCount}
            onTrigger={handleTriggerSynthesis}
            isLoading={isLoading}
            disabled={synthesisStatus === 'PROCESSING' || synthesisStatus === 'QUEUED'}
          />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Synthesis Progress */}
      {synthesisStatus && !v2Version && (
        <SynthesisProgress
          status={synthesisStatus}
          currentStep={currentStep}
          progress={progress}
          error={error || undefined}
        />
      )}

      {/* V2 Version Display */}
      {v2Version && (
        <div className="space-y-6">
          {/* Success Banner */}
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">✓ 最终剧本已成功生成！</p>
                  <p className="text-sm mt-1">
                    版本V2 | 置信度: {((v2Version.confidence || 0) * 100).toFixed(1)}% |
                    生成时间: {new Date(v2Version.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(v2Version.id, 'TXT')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    导出 TXT
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(v2Version.id, 'MD')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    导出 MD
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Tabs */}
          <Tabs defaultValue="v2" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="v2">
                <FileText className="mr-2 h-4 w-4" />
                最终剧本 (V2)
              </TabsTrigger>
              <TabsTrigger value="changelog">
                <Clock className="mr-2 h-4 w-4" />
                修改日志
              </TabsTrigger>
              <TabsTrigger value="comparison">
                <GitCompare className="mr-2 h-4 w-4" />
                版本对比
              </TabsTrigger>
            </TabsList>

            {/* V2 Script Content */}
            <TabsContent value="v2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>最终剧本 (Version 2)</CardTitle>
                      <CardDescription>
                        整合了所有Acts 2-5决策的完整剧本
                      </CardDescription>
                    </div>
                    <Badge className="bg-purple-600">V2</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {v2Version.content}
                    </pre>
                  </div>

                  {/* Metadata */}
                  {v2Version.synthesisMetadata && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-2">合成元数据</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">应用决策数:</span>
                          <span className="ml-2 font-medium">
                            {v2Version.synthesisMetadata.decisionsApplied?.length || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">解决冲突数:</span>
                          <span className="ml-2 font-medium">
                            {v2Version.synthesisMetadata.conflictsResolved || 0}
                          </span>
                        </div>
                        {v2Version.synthesisMetadata.styleProfile && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">风格特征:</span>
                            <span className="ml-2 font-medium">
                              {v2Version.synthesisMetadata.styleProfile.tone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Change Log */}
            <TabsContent value="changelog">
              <Card>
                <CardHeader>
                  <CardTitle>修改日志</CardTitle>
                  <CardDescription>
                    从V1到V2的所有修改记录
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">
                      {v2Version.changeLog || '暂无修改日志'}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Version Comparison */}
            <TabsContent value="comparison">
              <Card>
                <CardHeader>
                  <CardTitle>版本对比</CardTitle>
                  <CardDescription>
                    V1 (原始) vs V2 (合成后)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Badge variant="outline">V1</Badge>
                        原始剧本
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono text-xs">
                          {v1Version?.content.substring(0, 2000)}...
                        </pre>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Badge className="bg-purple-600">V2</Badge>
                        最终剧本
                      </h4>
                      <div className="bg-purple-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono text-xs">
                          {v2Version.content.substring(0, 2000)}...
                        </pre>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <Button variant="outline">
                      <GitCompare className="mr-2 h-4 w-4" />
                      查看详细差异
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Empty State */}
      {!synthesisStatus && !v2Version && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-purple-400" />
            <h3 className="text-xl font-medium mb-2">准备开始合成</h3>
            <p className="text-muted-foreground mb-6">
              已完成 {decisionsCount} 个决策，点击上方按钮开始生成最终剧本
            </p>
            {decisionsCount === 0 && (
              <Alert className="max-w-md mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  请先在迭代工作区完成至少一个Act 2-5的决策
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
