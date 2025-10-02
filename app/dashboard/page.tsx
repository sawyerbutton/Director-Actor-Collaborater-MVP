'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileText, Play, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { v1ApiService } from '@/lib/services/v1-api-service'

export default function DashboardPage() {
  const router = useRouter()
  const [scriptContent, setScriptContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFileName(file.name)
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        console.log('文件读取成功，内容长度:', content.length)
        setScriptContent(content)
      }
      reader.onerror = (e) => {
        console.error('文件读取失败:', e)
        alert('文件读取失败，请重试')
      }
      reader.readAsText(file)
    }
  }

  const handleAnalyze = async () => {
    if (!scriptContent.trim()) {
      setError('请先输入或上传剧本内容')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      // Step 1: Create project with script content
      const project = await v1ApiService.createProject(
        fileName || '新剧本项目',
        scriptContent,
        '从仪表板创建的项目'
      )

      // Step 2: Start Act 1 analysis
      const analysisJob = await v1ApiService.startAnalysis(project.id, scriptContent)

      // Step 3: Navigate to analysis page (polling will happen there)
      router.push(`/analysis/${project.id}`)
    } catch (error) {
      console.error('分析错误:', error)
      setError(error instanceof Error ? error.message : '分析失败，请稍后重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const sampleScript = `场景 1：咖啡店 - 日 - 内

张明（30岁，程序员）坐在角落，对着笔记本电脑工作。

李华走进来，看到张明后犹豫了一下。

李华：还记得我吗？我们昨天才第一次见面。

张明：（困惑）昨天？可是我记得我们认识很多年了。

李华：你在说什么？我们昨天在图书馆第一次碰面的。`

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">剧本分析工作台</h1>
          <p className="text-gray-600">上传您的剧本，让AI帮您发现并修复逻辑错误</p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Upload Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>上传剧本</CardTitle>
                <CardDescription>
                  选择文本输入或文件上传方式导入您的剧本
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="text" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">
                      <FileText className="mr-2 h-4 w-4" />
                      文本输入
                    </TabsTrigger>
                    <TabsTrigger value="file">
                      <Upload className="mr-2 h-4 w-4" />
                      文件上传
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-4">
                    <div>
                      <Textarea
                        placeholder="在此粘贴您的剧本内容..."
                        value={scriptContent}
                        onChange={(e) => setScriptContent(e.target.value)}
                        className="min-h-[400px] font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setScriptContent(sampleScript)}
                      >
                        使用示例剧本
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setScriptContent('')}
                      >
                        清空内容
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="file" className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="mb-2 text-sm text-gray-600">
                        <label htmlFor="file-upload" className="font-semibold text-blue-600 hover:text-blue-500 cursor-pointer">
                          点击选择文件
                        </label>
                        {' '}或拖拽到此处
                      </p>
                      <p className="text-xs text-gray-500">支持 .txt, .md, .markdown 格式</p>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".txt,.md,.markdown"
                        onChange={handleFileUpload}
                      />
                    </div>
                    {fileName && (
                      <Alert className="bg-green-50 border-green-200">
                        <AlertDescription>
                          <span className="font-medium">已成功加载文件: {fileName}</span>
                          <br />
                          <span className="text-sm text-gray-600">
                            内容长度: {scriptContent.length} 字符
                          </span>
                        </AlertDescription>
                      </Alert>
                    )}
                    {scriptContent && (
                      <div>
                        <p className="text-sm font-medium mb-2">文件内容预览：</p>
                        <div className="bg-gray-50 p-3 rounded text-sm max-h-[200px] overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-mono text-xs">
                            {scriptContent.substring(0, 500)}
                            {scriptContent.length > 500 && '...'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Analyze Button */}
                <div className="mt-6 space-y-2">
                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* 调试信息 */}
                  <div className="text-xs text-gray-500 text-center">
                    当前剧本内容长度: {scriptContent.length} 字符
                    {!scriptContent.trim() && ' (按钮将被禁用)'}
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleAnalyze}
                    disabled={!scriptContent.trim() || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>创建项目并分析中...</>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        开始AI分析
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Info Section */}
          <div className="space-y-6">
            {/* Recent Projects */}
            <Card>
              <CardHeader>
                <CardTitle>最近项目</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/projects" className="block p-2 hover:bg-gray-50 rounded">
                    <p className="font-medium">示例项目 1</p>
                    <p className="text-sm text-gray-500">2分钟前</p>
                  </Link>
                  <Link href="/projects" className="block p-2 hover:bg-gray-50 rounded">
                    <p className="font-medium">示例项目 2</p>
                    <p className="text-sm text-gray-500">1小时前</p>
                  </Link>
                  <Link href="/projects" className="block p-2 hover:bg-gray-50 rounded">
                    <p className="font-medium">示例项目 3</p>
                    <p className="text-sm text-gray-500">昨天</p>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Tips */}
            <Card>
              <CardHeader>
                <CardTitle>分析提示</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">最佳实践</p>
                    <p className="text-sm text-gray-600">
                      建议剧本长度在500-5000字之间，以获得最佳分析效果
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">格式要求</p>
                    <p className="text-sm text-gray-600">
                      请确保场景、角色、对话有清晰的格式区分
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">分析时间</p>
                    <p className="text-sm text-gray-600">
                      通常在10秒内完成，复杂剧本可能需要更长时间
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}