import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Zap, CheckCircle, Download } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          {/* Main Title and Description */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              ScriptAI 智能剧本分析系统
            </h1>
            <p className="text-2xl text-gray-600 max-w-3xl mx-auto">
              使用AI多智能体协作，在10秒内帮您发现并修复剧本中的逻辑错误
            </p>
          </div>

          {/* Call to Action */}
          <div className="py-8">
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                <FileText className="mr-2 h-5 w-5" />
                立即开始分析剧本
              </Button>
            </Link>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>1. 上传剧本</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  支持文本粘贴或上传.txt/.docx文件，快速导入您的剧本内容
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>2. AI智能分析</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  三个AI Agent协作分析，快速检测5种常见逻辑错误类型
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>3. 交互式修改</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  查看修改建议，一键接受或拒绝，导出完善后的剧本
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Key Benefits */}
          <div className="mt-16 p-8 bg-blue-50 rounded-2xl">
            <h2 className="text-2xl font-semibold mb-6">核心优势</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">快速分析</p>
                  <p className="text-sm text-gray-600">10秒内完成全文分析</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">智能检测</p>
                  <p className="text-sm text-gray-600">5种逻辑错误类型</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">精准建议</p>
                  <p className="text-sm text-gray-600">上下文相关修改方案</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">灵活导出</p>
                  <p className="text-sm text-gray-600">支持多种格式导出</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Types Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-semibold mb-8">可检测的错误类型</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                "时间线不一致",
                "角色行为矛盾",
                "场景连续性问题",
                "对话逻辑错误",
                "道具环境不一致"
              ].map((type, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                  <p className="font-medium text-gray-800">{type}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Bottom */}
          <div className="mt-16 py-8 border-t">
            <p className="text-gray-600 mb-6">准备好优化您的剧本了吗？</p>
            <div className="flex gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  开始使用
                </Button>
              </Link>
              <Link href="/projects">
                <Button size="lg" variant="outline">
                  查看示例项目
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}