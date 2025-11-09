'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { MultiFileUploader } from '@/components/upload/MultiFileUploader'

export default function NewMultiFileProjectPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'create' | 'upload' | 'complete'>('create')

  const handleCreateProject = async () => {
    if (!title.trim()) {
      setError('请输入项目标题')
      return
    }

    try {
      setCreating(true)
      setError(null)

      const response = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          content: '', // Empty for MULTI_FILE projects
          projectType: 'MULTI_FILE'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || '创建项目失败')
      }

      const data = await response.json()
      setProjectId(data.data.id)
      setStep('upload')
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建项目失败')
    } finally {
      setCreating(false)
    }
  }

  const handleUploadComplete = (fileIds: string[]) => {
    setUploadedFileIds(fileIds)
    if (fileIds.length > 0) {
      setStep('complete')
    }
  }

  const handleGoToProject = () => {
    if (projectId) {
      router.push(`/multi-file/${projectId}`)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/multi-file">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回项目列表
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">创建多文件剧本项目</h1>
          <p className="text-gray-600 mt-2">
            上传多集剧本文件，进行跨文件一致性分析
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${step === 'create' ? 'text-blue-600' : step === 'upload' || step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            {step !== 'create' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-current" />
              </div>
            )}
            <span className="font-medium">1. 创建项目</span>
          </div>
          <div className="h-0.5 w-12 bg-gray-300" />
          <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600' : step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            {step === 'complete' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-current" />
              </div>
            )}
            <span className="font-medium">2. 上传文件</span>
          </div>
          <div className="h-0.5 w-12 bg-gray-300" />
          <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-current" />
            </div>
            <span className="font-medium">3. 开始分析</span>
          </div>
        </div>

        {/* Step 1: Create Project */}
        {step === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>项目信息</CardTitle>
              <CardDescription>
                填写项目基本信息，然后上传剧本文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  项目标题 <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="例如：《追光者》多集剧本"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  项目描述（可选）
                </label>
                <Textarea
                  placeholder="简要描述这个项目..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={4}
                />
              </div>
              <Button
                onClick={handleCreateProject}
                disabled={!title.trim() || creating}
                size="lg"
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  '下一步：上传文件'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload Files */}
        {step === 'upload' && projectId && (
          <Card>
            <CardHeader>
              <CardTitle>上传剧本文件</CardTitle>
              <CardDescription>
                支持 .txt、.md、.markdown 格式，最多上传50个文件
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MultiFileUploader
                projectId={projectId}
                onUploadComplete={handleUploadComplete}
                maxFiles={50}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && projectId && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-green-900">项目创建成功！</CardTitle>
                  <CardDescription className="text-green-700">
                    已成功上传 {uploadedFileIds.length} 个文件
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>下一步操作：</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>在项目详情页管理已上传的文件</li>
                  <li>触发单文件内部分析（ACT1诊断）</li>
                  <li>执行跨文件一致性检查</li>
                  <li>查看AI生成的解决方案建议</li>
                </ul>
              </div>
              <Button
                onClick={handleGoToProject}
                size="lg"
                className="w-full"
              >
                进入项目管理页
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
