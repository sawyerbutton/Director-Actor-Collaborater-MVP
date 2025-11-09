'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Loader2, AlertCircle, FileSearch, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { CrossFileFindingsDisplay, CrossFileFinding } from '@/components/analysis/cross-file-findings-display'

interface ProjectInfo {
  id: string
  title: string
  description: string | null
  fileCount: number
  workflowStatus: string
}

interface InternalFinding {
  fileId: string
  filename: string
  episodeNumber: number | null
  type: string
  severity: string
  description: string
  confidence: number
}

interface AnalysisSummary {
  totalFiles: number
  analyzedFiles: number
  totalInternalErrors: number
  totalCrossFileErrors: number
  lastAnalyzedAt: string | null
}

export default function MultiFileAnalysisResultsPage({
  params
}: {
  params: { projectId: string }
}) {
  const router = useRouter()
  const projectId = params.projectId

  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [crossFileFindings, setCrossFileFindings] = useState<CrossFileFinding[]>([])
  const [internalFindings, setInternalFindings] = useState<InternalFinding[]>([])
  const [summary, setSummary] = useState<AnalysisSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAllData()
  }, [projectId])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch project info
      const projectResponse = await fetch(`/api/v1/projects/${projectId}`)
      if (!projectResponse.ok) {
        throw new Error('获取项目信息失败')
      }
      const projectData = await projectResponse.json()
      setProject(projectData.data)

      // Fetch diagnostic report (contains both internal and cross-file findings)
      const reportResponse = await fetch(`/api/v1/projects/${projectId}/report`)
      if (reportResponse.ok) {
        const reportData = await reportResponse.json()
        const report = reportData.data.report  // Fixed: Access report from data.report, not data directly

        // Extract internal findings
        if (report.findings?.internalFindings) {
          setInternalFindings(report.findings.internalFindings)
        }

        // Extract cross-file findings
        if (report.findings?.crossFileFindings) {
          setCrossFileFindings(report.findings.crossFileFindings)
        }

        // Extract summary
        if (report.findings?.summary) {
          const summaryData = {
            totalFiles: report.findings.summary.totalFiles || 0,
            analyzedFiles: report.findings.summary.analyzedFiles || 0,
            totalInternalErrors: report.findings.summary.totalInternalErrors || 0,
            totalCrossFileErrors: report.findings.summary.totalCrossFileErrors || 0,
            lastAnalyzedAt: report.updatedAt
          };
          console.log('[Analysis Page] Setting summary:', summaryData);
          setSummary(summaryData);
        }
      } else {
        // No report yet - show empty state
        setSummary({
          totalFiles: projectData.data.fileCount || 0,
          analyzedFiles: 0,
          totalInternalErrors: 0,
          totalCrossFileErrors: 0,
          lastAnalyzedAt: null
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载分析结果失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshAnalysis = async () => {
    try {
      setRefreshing(true)
      setError(null)

      const response = await fetch(`/api/v1/projects/${projectId}/analyze/cross-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkTypes: ['cross_file_timeline', 'cross_file_character', 'cross_file_plot', 'cross_file_setting']
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || '重新分析失败')
      }

      // Refresh data after analysis
      await fetchAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新分析失败')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/multi-file/${projectId}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回项目管理
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{project?.title || '项目分析结果'}</h1>
              <p className="text-gray-600 mt-2">
                多文件剧本一致性分析结果
              </p>
            </div>
            <Button
              onClick={handleRefreshAnalysis}
              disabled={refreshing || (project?.fileCount || 0) < 2}
              variant="outline"
            >
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新分析
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">文件总数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalFiles}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">已分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.analyzedFiles}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">内部问题</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{summary.totalInternalErrors}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">跨文件问题</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.totalCrossFileErrors}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Analysis Yet */}
        {(() => {
          const shouldShowEmpty = !summary || !summary.analyzedFiles || summary.analyzedFiles === 0;
          console.log('[Analysis Page] Render decision:', { summary, shouldShowEmpty, crossFileFindings: crossFileFindings.length });
          return shouldShowEmpty;
        })() ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileSearch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">还未进行分析</h3>
                <p className="text-gray-600 mb-6">
                  {(project?.fileCount || 0) < 2
                    ? '至少需要2个文件才能执行跨文件分析'
                    : '点击"重新分析"按钮开始跨文件一致性检查'}
                </p>
                {(project?.fileCount || 0) >= 2 && (
                  <Button
                    onClick={handleRefreshAnalysis}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        分析中...
                      </>
                    ) : (
                      <>
                        <FileSearch className="mr-2 h-4 w-4" />
                        开始分析
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Analysis Results Tabs */
          <Tabs defaultValue="cross-file" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cross-file">
                跨文件分析
                <Badge className="ml-2" variant="destructive">
                  {crossFileFindings.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="internal">
                单文件内部
                <Badge className="ml-2" variant="secondary">
                  {internalFindings.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Cross-File Findings Tab */}
            <TabsContent value="cross-file">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5" />
                    跨文件一致性问题
                  </CardTitle>
                  <CardDescription>
                    检测多个文件之间的时间线、角色、情节、设定矛盾
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {crossFileFindings.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                      <p className="text-lg font-medium text-green-700">太棒了！</p>
                      <p className="text-gray-600 mt-2">未发现跨文件一致性问题</p>
                    </div>
                  ) : (
                    <CrossFileFindingsDisplay findings={crossFileFindings} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Internal Findings Tab */}
            <TabsContent value="internal">
              <Card>
                <CardHeader>
                  <CardTitle>单文件内部问题</CardTitle>
                  <CardDescription>
                    每个文件独立分析发现的逻辑错误（ACT1诊断）
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {internalFindings.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                      <p className="text-lg font-medium text-green-700">太棒了！</p>
                      <p className="text-gray-600 mt-2">未发现单文件内部问题</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Group by file */}
                      {Object.entries(
                        internalFindings.reduce((acc, finding) => {
                          const key = finding.fileId
                          if (!acc[key]) {
                            acc[key] = {
                              filename: finding.filename,
                              episodeNumber: finding.episodeNumber,
                              findings: []
                            }
                          }
                          acc[key].findings.push(finding)
                          return acc
                        }, {} as Record<string, { filename: string; episodeNumber: number | null; findings: InternalFinding[] }>)
                      ).map(([fileId, fileData]) => (
                        <Card key={fileId} className="border-l-4 border-l-orange-400">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">{fileData.filename}</CardTitle>
                                {fileData.episodeNumber && (
                                  <Badge variant="outline" className="mt-2">
                                    第{fileData.episodeNumber}集
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="secondary">
                                {fileData.findings.length} 个问题
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {fileData.findings.map((finding, idx) => (
                              <div
                                key={idx}
                                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 mt-0.5">
                                    {finding.severity === 'critical' ? (
                                      <XCircle className="h-5 w-5 text-red-500" />
                                    ) : finding.severity === 'warning' ? (
                                      <AlertCircle className="h-5 w-5 text-orange-500" />
                                    ) : (
                                      <AlertCircle className="h-5 w-5 text-blue-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge
                                        variant={
                                          finding.severity === 'critical' ? 'destructive' :
                                          finding.severity === 'warning' ? 'secondary' : 'outline'
                                        }
                                      >
                                        {finding.type}
                                      </Badge>
                                      <span className="text-xs text-gray-500">
                                        置信度: {(finding.confidence * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{finding.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Info Footer */}
        {summary && summary.lastAnalyzedAt && (
          <Card className="mt-8 border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <p className="text-sm text-gray-700">
                <strong>最后分析时间:</strong>{' '}
                {new Date(summary.lastAnalyzedAt).toLocaleString('zh-CN')}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                注意：多文件项目不支持ACT2-5迭代和Synthesis功能，仅提供一致性检查
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
