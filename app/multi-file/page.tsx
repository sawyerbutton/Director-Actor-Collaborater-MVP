'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, FileText, Clock, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface MultiFileProject {
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

export default function MultiFileProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<MultiFileProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/projects?projectType=MULTI_FILE&page=1&limit=50')

      if (!response.ok) {
        throw new Error('获取项目列表失败')
      }

      const data = await response.json()
      setProjects(data.data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取项目列表失败')
    } finally {
      setLoading(false)
    }
  }

  const getWorkflowStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' }> = {
      INITIALIZED: { label: '已创建', variant: 'default' },
      ACT1_RUNNING: { label: '分析中', variant: 'warning' },
      ACT1_COMPLETE: { label: '分析完成', variant: 'success' },
      ITERATING: { label: '迭代中', variant: 'warning' },
      COMPLETED: { label: '已完成', variant: 'success' },
    }
    const config = statusMap[status] || { label: status, variant: 'default' }
    return (
      <Badge variant={config.variant as any}>
        {config.label}
      </Badge>
    )
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回主页
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold">多文件剧本项目</h1>
            <p className="text-gray-600 mt-2">
              管理和分析多集剧本的跨文件一致性
            </p>
          </div>
          <Button onClick={() => router.push('/multi-file/new')} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            创建新项目
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">还没有多文件项目</h3>
                <p className="text-gray-600 mb-6">
                  创建您的第一个多文件项目，开始跨文件一致性分析
                </p>
                <Button onClick={() => router.push('/multi-file/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  创建新项目
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/multi-file/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl line-clamp-1">
                      {project.title}
                    </CardTitle>
                    {getWorkflowStatusBadge(project.workflowStatus)}
                  </div>
                  {project.description && (
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{project.fileCount} 个文件</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Feature Info */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              多文件分析功能
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p><strong>✓ 跨文件一致性检查</strong> - 自动检测多集剧本之间的时间线、角色、情节、设定矛盾</p>
            <p><strong>✓ AI辅助决策</strong> - 为每个跨文件问题生成2-3种解决方案建议</p>
            <p><strong>✓ 批量文件管理</strong> - 支持上传最多50个文件，自动识别集数编号</p>
            <p className="text-xs text-gray-500 mt-4">
              注意：多文件项目专注于跨文件一致性检查，不支持ACT2-5迭代和Synthesis功能
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
