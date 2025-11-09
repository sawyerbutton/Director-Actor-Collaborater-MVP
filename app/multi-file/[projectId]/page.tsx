'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Play, FileSearch, Loader2, AlertCircle, FileText, Clock } from 'lucide-react'
import Link from 'next/link'
import { FileListManager } from '@/components/project/FileListManager'

interface ProjectInfo {
  id: string
  title: string
  description: string | null
  projectType: string
  status: string
  workflowStatus: string
  fileCount: number
  createdAt: string
  updatedAt: string
}

export default function MultiFileProjectDetailPage({ params }: { params: { projectId: string } }) {
  const router = useRouter()
  const projectId = params.projectId

  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    fetchProjectInfo()
  }, [projectId])

  const fetchProjectInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/projects/${projectId}`)

      if (!response.ok) {
        throw new Error('获取项目信息失败')
      }

      const data = await response.json()
      setProject(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取项目信息失败')
    } finally {
      setLoading(false)
    }
  }

  const handleStartCrossFileAnalysis = async () => {
    try {
      setAnalyzing(true)
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
        throw new Error(errorData.error?.message || '启动跨文件分析失败')
      }

      // Navigate to analysis results page
      router.push(`/multi-file/${projectId}/analysis`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动跨文件分析失败')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleFileUploadComplete = (fileIds: string[]) => {
    // Refresh project info to update file count
    fetchProjectInfo()
  }

  const handleFileDelete = (fileId: string) => {
    // Refresh project info to update file count
    fetchProjectInfo()
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

  if (!project) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>项目不存在</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/multi-file">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回项目列表
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{project.title}</h1>
              {project.description && (
                <p className="text-gray-600 mt-2">{project.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {project.fileCount} 个文件
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="text-base px-4 py-1">
              {project.workflowStatus === 'INITIALIZED' && '已创建'}
              {project.workflowStatus === 'ACT1_RUNNING' && '分析中'}
              {project.workflowStatus === 'ACT1_COMPLETE' && '分析完成'}
              {project.workflowStatus === 'COMPLETED' && '已完成'}
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="files" className="space-y-6">
          <TabsList>
            <TabsTrigger value="files">文件管理</TabsTrigger>
            <TabsTrigger value="analysis">分析操作</TabsTrigger>
          </TabsList>

          {/* Files Tab */}
          <TabsContent value="files">
            <FileListManager
              projectId={projectId}
              showUploader={true}
              onFileUploadComplete={handleFileUploadComplete}
              onFileDelete={handleFileDelete}
            />
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis">
            <div className="space-y-6">
              {/* Cross-File Analysis Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5" />
                    跨文件一致性分析
                  </CardTitle>
                  <CardDescription>
                    检测多个文件之间的时间线、角色、情节、设定等一致性问题
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-blue-900">分析范围包括：</p>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li><strong>时间线矛盾</strong> - 检测跨集的时间线不一致</li>
                      <li><strong>角色设定</strong> - 检测角色姓名、特征的跨集差异</li>
                      <li><strong>情节连贯性</strong> - 检测情节线索的前后矛盾</li>
                      <li><strong>设定一致性</strong> - 检测地点、规则描述的冲突</li>
                    </ul>
                  </div>

                  {project.fileCount < 2 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        至少需要2个文件才能执行跨文件分析。请先上传更多文件。
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="flex gap-4">
                      <Button
                        onClick={handleStartCrossFileAnalysis}
                        disabled={analyzing}
                        size="lg"
                        className="flex-1"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            分析中...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            开始跨文件分析
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/multi-file/${projectId}/analysis`)}
                      >
                        查看分析结果
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Internal Analysis Info */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">单文件内部分析</CardTitle>
                  <CardDescription>
                    对每个文件单独执行ACT1逻辑错误诊断
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      单文件内部分析将在上传文件后自动触发。查看结果请访问"分析结果"页面。
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
