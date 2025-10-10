'use client'

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertTriangle, AlertCircle, FileText, Download, ArrowLeft, Loader2, Wand2, Eye, ArrowRight, Save } from 'lucide-react'
import { v1ApiService, type DiagnosticReportData, type JobStatusData } from '@/lib/services/v1-api-service'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AnalysisError {
  id: string
  type: string
  typeName: string
  severity: 'critical' | 'warning' | 'info'  // Match database values
  line: number
  content: string
  description: string
  suggestion: string
  confidence: number
  accepted?: boolean
}

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [analysis, setAnalysis] = useState<any>(null)
  const [errors, setErrors] = useState<AnalysisError[]>([])
  const [loading, setLoading] = useState(true)
  const [modifiedScript, setModifiedScript] = useState('')
  const [isRepairing, setIsRepairing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [repairedScript, setRepairedScript] = useState('')
  const [showExportWarning, setShowExportWarning] = useState(false)
  const [pendingExportFormat, setPendingExportFormat] = useState<'txt' | 'docx' | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatusData | null>(null)
  const [pollingError, setPollingError] = useState<string | null>(null)
  const [shouldPoll, setShouldPoll] = useState(true)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchAnalysisStatus = async () => {
      if (!isMounted || !shouldPoll) return

      try {
        // Get project workflow status
        const workflowStatus = await v1ApiService.getWorkflowStatus(params.id)

        if (!isMounted || !shouldPoll) return

        // If there's an active job, poll it
        if (workflowStatus.latestJob) {
          // Trigger processing first (for Serverless environments like Vercel)
          // This ensures jobs are processed even if setInterval doesn't work
          await v1ApiService.triggerProcessing()

          const status = await v1ApiService.getJobStatus(workflowStatus.latestJob.id)

          if (!isMounted || !shouldPoll) return

          setJobStatus(status)

          // If job is completed, fetch the report
          if (status.status === 'COMPLETED') {
            const report = await v1ApiService.getDiagnosticReport(params.id)

            if (!isMounted) return

            if (report.report) {
              // Transform report findings to errors format
              const transformedErrors: AnalysisError[] = report.report.findings.map((finding, idx) => ({
                id: `error-${idx}`,
                type: finding.type,
                typeName: finding.type,
                severity: finding.severity as 'critical' | 'warning' | 'info',  // Use database values
                line: finding.location?.line || 0,
                content: finding.location?.content || '',
                description: finding.description,
                suggestion: finding.suggestion || '',
                confidence: finding.confidence
              }))

              setAnalysis(report.report)
              setErrors(transformedErrors)
            }
            setLoading(false)
            // Stop polling when completed
            setShouldPoll(false)
          } else if (status.status === 'FAILED') {
            setPollingError(status.error || '分析失败')
            setLoading(false)
            // Stop polling when failed
            setShouldPoll(false)
          }
          // If status is QUEUED or PROCESSING, continue polling
        } else {
          setLoading(false)
          setShouldPoll(false)
        }
      } catch (error) {
        if (!isMounted) return

        console.error('获取分析状态失败:', error)
        setPollingError(error instanceof Error ? error.message : '获取分析状态失败')
        // Don't stop polling on error, allow retry
      }
    }

    // Initial fetch
    fetchAnalysisStatus()

    // Poll every 5 seconds (reduced API call frequency)
    pollIntervalRef.current = setInterval(fetchAnalysisStatus, 5000)

    return () => {
      isMounted = false
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [params.id, shouldPoll])  // Depend on shouldPoll to stop interval

  // Stop interval when shouldPoll becomes false
  useEffect(() => {
    if (!shouldPoll && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
      console.log('✅ 轮询已停止')
    }
  }, [shouldPoll])

  const handleAccept = (errorId: string) => {
    setErrors(prev => prev.map(error =>
      error.id === errorId ? { ...error, accepted: true } : error
    ))
  }

  const handleReject = (errorId: string) => {
    setErrors(prev => prev.map(error =>
      error.id === errorId ? { ...error, accepted: false } : error
    ))
  }

  // 智能修复函数
  const handleSmartRepair = async () => {
    const acceptedErrors = errors.filter(e => e.accepted === true)
    const rejectedErrors = errors.filter(e => e.accepted === false)

    if (acceptedErrors.length === 0) {
      alert('请先选择要接受的修改建议')
      return
    }

    setIsRepairing(true)

    try {
      const response = await fetch('/api/script-repair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalScript: modifiedScript,
          acceptedErrors,
          rejectedErrors
        })
      })

      if (!response.ok) {
        throw new Error('修复失败')
      }

      const result = await response.json()
      setRepairedScript(result.data.repairedScript)
      setShowPreview(true)
    } catch (error) {
      console.error('智能修复错误:', error)
      alert('智能修复失败，请稍后重试')
    } finally {
      setIsRepairing(false)
    }
  }

  // 保存修复结果到数据库
  const saveRepairedScript = async () => {
    if (!repairedScript) {
      alert('没有可保存的修复结果')
      return
    }

    const acceptedErrors = errors.filter(e => e.accepted === true)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/v1/projects/${params.id}/apply-act1-repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repairedScript,
          acceptedErrors,
          metadata: {
            source: 'ACT1_SMART_REPAIR',
            errorCount: acceptedErrors.length,
            timestamp: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        // Try to parse error as JSON, fallback to text
        let errorMessage = '保存失败';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error?.message || error.error || error.message || '保存失败';
          } else {
            const text = await response.text();
            errorMessage = text || `服务器错误 (${response.status})`;
          }
        } catch (e) {
          errorMessage = `服务器错误 (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Show success message
      alert(`✅ ${result.data.message}\n\n已应用 ${result.data.details.errorsApplied} 项修改\n版本号: V${result.data.version}`)

      // Navigate to iteration workspace
      router.push(`/iteration/${params.id}`)
    } catch (error) {
      console.error('保存失败:', error);
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  }

  const handleExport = (format: 'txt' | 'docx') => {
    // 检查是否有接受的修改
    const hasAcceptedChanges = errors.filter(e => e.accepted === true).length > 0

    // 如果有接受的修改但没有进行AI智能修复
    if (hasAcceptedChanges && !repairedScript) {
      setPendingExportFormat(format)
      setShowExportWarning(true)
      return
    }

    // 执行实际的导出
    performExport(format)
  }

  const performExport = (format: 'txt' | 'docx') => {
    // 如果有智能修复的结果，使用智能修复的版本
    const finalScript = repairedScript || modifiedScript

    if (format === 'txt') {
      const blob = new Blob([finalScript], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `剧本_${repairedScript ? '智能修复版' : '原始版'}_${new Date().toISOString().split('T')[0]}.txt`
      a.click()

      // 显示成功提示
      if (!repairedScript && errors.filter(e => e.accepted === true).length > 0) {
        setTimeout(() => {
          alert('已导出原始剧本。提示：您选择的修改建议未应用，建议使用AI智能修复功能。')
        }, 100)
      }
    } else {
      alert('DOCX导出功能开发中，敬请期待！')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'warning': return 'secondary'
      case 'info': return 'outline'
      default: return 'default'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'info': return <AlertCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return '高'
      case 'warning': return '中'
      case 'info': return '低'
      default: return severity
    }
  }

  if (loading || (jobStatus && jobStatus.status !== 'COMPLETED' && jobStatus.status !== 'FAILED')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              分析进行中
            </CardTitle>
            <CardDescription>
              正在使用 AI 分析您的剧本...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobStatus && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>状态: {jobStatus.status}</span>
                    <span>{jobStatus.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${jobStatus.progress || 0}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  预计需要 10-30 秒，请稍候...
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (pollingError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              分析失败
            </CardTitle>
            <CardDescription>{pollingError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>
              返回工作台
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>未找到分析结果</CardTitle>
            <CardDescription>请返回重新分析</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>
              返回工作台
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
            <h1 className="text-3xl font-bold">分析结果</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant={repairedScript ? "default" : "outline"}
              onClick={() => handleExport('txt')}
              title={!repairedScript && errors.filter(e => e.accepted === true).length > 0 ? "建议先进行AI智能修复" : "导出剧本"}
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              导出 .txt
              {repairedScript && <Badge className="ml-1 bg-green-100 text-green-800 text-xs">已修复</Badge>}
              {!repairedScript && errors.filter(e => e.accepted === true).length > 0 && (
                <Badge variant="outline" className="ml-1 text-yellow-700 border-yellow-300 text-xs">
                  未修复
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('docx')}
              disabled={true}
              title="DOCX导出功能开发中"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              导出 .docx
              <Badge variant="outline" className="ml-1 text-xs">
                开发中
              </Badge>
            </Button>
          </div>
        </div>

        {/* Act 1 Complete - Next Steps */}
        {analysis && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-blue-800">
                ✓ Act 1 基础诊断已完成！您可以进入 Acts 2-5 进行深度迭代修改
              </span>
              <Button
                onClick={() => router.push(`/iteration/${params.id}`)}
                className="ml-4"
                size="sm"
              >
                进入迭代工作区
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Act 1 - 基础诊断结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{analysis.summary?.totalErrors || 0}</p>
                <p className="text-sm text-gray-600">总错误数</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{analysis.summary?.highSeverity || 0}</p>
                <p className="text-sm text-gray-600">高严重度</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">{analysis.summary?.mediumSeverity || 0}</p>
                <p className="text-sm text-gray-600">中严重度</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{analysis.summary?.lowSeverity || 0}</p>
                <p className="text-sm text-gray-600">低严重度</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Errors List */}
        <div className="space-y-4">
          {errors.map((error) => (
            <Card key={error.id} className={error.accepted === false ? 'opacity-50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(error.severity) as any}>
                        {getSeverityIcon(error.severity)}
                        <span className="ml-1">{getSeverityLabel(error.severity)}</span>
                      </Badge>
                      <Badge variant="outline">{error.typeName}</Badge>
                      <span className="text-sm text-gray-500">行 {error.line}</span>
                      <span className="text-sm text-gray-500">置信度: {(error.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p className="font-medium">{error.description}</p>
                  </div>
                  <div className="flex gap-2">
                    {error.accepted === true && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        已接受
                      </Badge>
                    )}
                    {error.accepted === false && (
                      <Badge variant="default" className="bg-red-100 text-red-800">
                        <XCircle className="mr-1 h-3 w-3" />
                        已拒绝
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">原文：</p>
                  <div className="bg-red-50 p-3 rounded text-sm font-mono">
                    {error.content}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">建议修改为：</p>
                  <div className="bg-green-50 p-3 rounded text-sm font-mono">
                    {error.suggestion}
                  </div>
                </div>
                {error.accepted === undefined && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAccept(error.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      接受修改
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(error.id)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      拒绝修改
                    </Button>
                  </div>
                )}
                {error.accepted !== undefined && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setErrors(prev => prev.map(e =>
                      e.id === error.id ? { ...e, accepted: undefined } : e
                    ))}
                  >
                    撤销决定
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Smart Repair Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>智能修复与导出</CardTitle>
            <CardDescription>
              已接受 {errors.filter(e => e.accepted).length} 项修改，
              拒绝 {errors.filter(e => e.accepted === false).length} 项修改
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 智能修复按钮 */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2">🤖 AI智能修复</h4>
              <p className="text-sm text-gray-600 mb-3">
                使用AI根据您接受的修改建议，智能重写剧本，保持内容连贯性和风格一致性
              </p>
              <Button
                onClick={handleSmartRepair}
                disabled={isRepairing || errors.filter(e => e.accepted).length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
              >
                {isRepairing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI正在智能修复中...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    开始AI智能修复 ({errors.filter(e => e.accepted).length} 项修改)
                  </>
                )}
              </Button>
            </div>

            {/* 导出按钮 */}
            <div className="space-y-3">
              {/* 状态提示 */}
              {errors.filter(e => e.accepted === true).length > 0 && !repairedScript && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    您已选择了 {errors.filter(e => e.accepted === true).length} 项修改建议，
                    请先点击上方的"AI智能修复"按钮应用这些修改。
                  </AlertDescription>
                </Alert>
              )}

              {repairedScript && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    AI智能修复已完成，可以导出修复后的剧本。
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={() => handleExport('txt')}
                  variant={repairedScript ? "default" : "outline"}
                  title={!repairedScript && errors.filter(e => e.accepted === true).length > 0 ? "建议先进行AI智能修复" : ""}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  导出为 .txt
                  {repairedScript && <Badge className="ml-2 bg-green-100 text-green-800">已修复</Badge>}
                  {!repairedScript && errors.filter(e => e.accepted === true).length > 0 && (
                    <Badge variant="outline" className="ml-2 text-yellow-700 border-yellow-300">
                      未修复
                    </Badge>
                  )}
                </Button>
                <Button
                  onClick={() => handleExport('docx')}
                  variant="outline"
                  disabled={true}
                  title="DOCX导出功能开发中"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  导出为 .docx
                  <Badge variant="outline" className="ml-2">
                    开发中
                  </Badge>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 预览对话框 */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI智能修复预览</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  AI已根据您的选择智能修复剧本，请预览修复结果
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[60vh]">
                <div className="bg-gray-50 p-4 rounded prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {repairedScript}
                  </ReactMarkdown>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {/* Primary Action: Save and Enter Iteration */}
                  <Button
                    onClick={saveRepairedScript}
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        保存并进入迭代工作区
                      </>
                    )}
                  </Button>

                  {/* Secondary Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowPreview(false)
                        handleExport('txt')
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      仅导出
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowPreview(false)}
                    >
                      关闭预览
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 导出警告对话框 */}
        {showExportWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <CardTitle>提示：需要先进行AI智能修复</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowExportWarning(false)
                      setPendingExportFormat(null)
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    您已选择了 <span className="font-bold text-yellow-700">{errors.filter(e => e.accepted === true).length}</span> 项修改建议，
                    但尚未进行AI智能修复。
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    直接导出将<span className="font-medium">只包含原始剧本</span>，不会应用任何修改。
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">建议操作：</p>
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                    onClick={() => {
                      setShowExportWarning(false)
                      setPendingExportFormat(null)
                      handleSmartRepair()
                    }}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    立即进行AI智能修复
                  </Button>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-2">如果您确实想要导出原始剧本：</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setShowExportWarning(false)
                        if (pendingExportFormat) {
                          performExport(pendingExportFormat)
                        }
                        setPendingExportFormat(null)
                      }}
                    >
                      继续导出原始剧本
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setShowExportWarning(false)
                        setPendingExportFormat(null)
                      }}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}