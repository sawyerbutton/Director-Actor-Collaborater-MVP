# 03 - 前端架构文档

**版本**: 1.0.0
**更新日期**: 2025-10-11
**状态**: 生产就绪 ✅

---

## 📋 目录

1. [技术栈](#1-技术栈)
2. [目录结构](#2-目录结构)
3. [核心页面](#3-核心页面)
4. [组件架构](#4-组件架构)
5. [状态管理](#5-状态管理)
6. [API通信](#6-api通信)
7. [样式系统](#7-样式系统)
8. [性能优化](#8-性能优化)

---

## 1. 技术栈

### 1.1 核心框架

| 技术 | 版本 | 用途 |
|-----|------|-----|
| **Next.js** | 14.2.32 | App Router、SSR、文件路由 |
| **React** | 18.3.1 | UI组件、Hooks |
| **TypeScript** | 5.6.3 | 类型安全 |
| **Tailwind CSS** | 3.4.1 | 实用优先的CSS框架 |

### 1.2 UI组件库

- **shadcn/ui**: 基于Radix UI的组件集合
- **Lucide React**: 图标库
- **React Markdown**: Markdown渲染
- **class-variance-authority (CVA)**: 条件样式管理

### 1.3 表单与验证

- **React Hook Form**: 表单状态管理
- **Zod**: Schema验证（与后端共享）

---

## 2. 目录结构

```
project/
├── app/                          # Next.js App Router页面
│   ├── layout.tsx               # 根布局（Navbar + Providers）
│   ├── page.tsx                 # 首页（重定向到/dashboard）
│   ├── dashboard/               # 仪表板页面（上传剧本）
│   │   └── page.tsx
│   ├── analysis/[id]/           # ACT1分析页（诊断报告）
│   │   └── page.tsx
│   ├── iteration/[projectId]/   # ACT2-5迭代页（创作工作区）
│   │   └── page.tsx
│   ├── synthesis/[projectId]/   # 合成页（生成V2剧本）
│   │   └── page.tsx
│   └── api/v1/                  # API路由（后端）
│
├── components/                   # React组件
│   ├── ui/                      # shadcn/ui基础组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── alert.tsx
│   │   └── ...                  # 16个UI组件
│   ├── workspace/               # 工作区专用组件（Epic 005）
│   │   ├── act-progress-bar.tsx        # 五幕进度条
│   │   ├── findings-selector.tsx       # ACT1问题选择器
│   │   ├── proposal-comparison.tsx     # AI方案对比
│   │   ├── changes-display.tsx         # 修改展示
│   │   └── decision-card.tsx           # 决策历史卡片
│   ├── synthesis/               # 合成专用组件（Epic 007）
│   │   ├── synthesis-trigger-dialog.tsx # 合成配置对话框
│   │   └── synthesis-progress.tsx       # 10步进度追踪
│   ├── analysis/                # 分析专用组件（Sprint 3）
│   │   └── cross-file-findings-display.tsx # 跨文件问题展示
│   └── layout/                  # 布局组件
│       └── navbar.tsx           # 顶部导航栏
│
├── lib/                         # 工具库
│   ├── services/
│   │   └── v1-api-service.ts   # V1 API客户端（核心）
│   └── utils.ts                # cn()工具函数
│
└── public/                      # 静态资源
```

---

## 3. 核心页面

### 3.1 仪表板页面 (`app/dashboard/page.tsx`)

**职责**: 剧本上传入口

**核心流程**:
```typescript
// 1. 用户输入/上传剧本
handleFileUpload(file) → FileReader → setScriptContent()

// 2. 创建项目 + 启动ACT1分析
handleAnalyze() {
  await v1ApiService.createProject(title, content)
  await sleep(500)  // Supabase复制延迟
  await v1ApiService.startAnalysis(projectId, content)
  router.push(`/analysis/${projectId}`)
}
```

**关键特性**:
- 文本输入 + 文件上传双模式（Tabs切换）
- 文件格式限制: `.txt`, `.md`, `.markdown`
- 示例剧本一键加载
- 自动状态管理（isAnalyzing）

---

### 3.2 分析页面 (`app/analysis/[id]/page.tsx`)

**职责**: ACT1诊断报告展示 + AI智能修复

**核心流程**:
```typescript
// 轮询ACT1分析状态（每5秒）
useEffect(() => {
  const poll = async () => {
    await v1ApiService.triggerProcessing()  // Serverless兼容
    const status = await v1ApiService.getJobStatus(jobId)

    if (status === 'COMPLETED') {
      const report = await v1ApiService.getDiagnosticReport(projectId)
      setErrors(transformFindings(report.findings))
      setCrossFileFindings(await getCrossFileFindings(projectId))
      setShouldPoll(false)  // 停止轮询
    }
  }

  const interval = setInterval(poll, 5000)
  return () => clearInterval(interval)
}, [projectId, shouldPoll])
```

**UI分层**:
```
1. 顶部: 返回按钮 + 导出按钮（.txt/.docx）
2. 引导: "Act 1完成！选择A或B" Alert
3. 统计卡片: 总错误数/高中低严重度
4. Tabs: 内部问题 | 跨文件问题
5. 错误列表: 每个错误有"接受/拒绝"按钮
6. AI智能修复区:
   - "开始AI智能修复"按钮
   - 预览对话框（带"保存并进入工作区"按钮）
```

**关键交互**:
- 用户接受/拒绝错误建议 → `accepted: true/false`
- AI智能修复 → POST `/api/script-repair` → 生成修复后剧本
- 保存修复 → POST `/api/v1/projects/[id]/apply-act1-repair` → 创建V1版本 → 跳转迭代页

---

### 3.3 迭代页面 (`app/iteration/[projectId]/page.tsx`)

**职责**: ACT2-5交互式创作工作流

**状态机**:
```typescript
type WorkflowStep = 'select_focus' | 'view_proposals' | 'view_changes' | 'completed'

// 工作流循环
select_focus → (handlePropose) → view_proposals
            → (handleExecute) → view_changes
            → (handleComplete) → select_focus
```

**核心流程**:
```typescript
// 1. 选择焦点问题（或自由创作模式）
const filteredFindings = filterFindingsByAct(allFindings, currentAct)
// ACT2 → character类型
// ACT3 → scene/plot类型
// ACT4 → timeline类型
// ACT5 → character/dialogue类型

// 2. 获取AI方案（异步Job，30-60秒）
handlePropose() {
  const jobId = await POST('/api/v1/iteration/propose', {
    projectId, act, focusName, contradiction
  })

  // 轮询直到完成
  pollInterval = setInterval(async () => {
    await triggerProcessing()  // Serverless
    const job = await GET(`/api/v1/iteration/jobs/${jobId}`)
    if (job.status === 'COMPLETED') {
      setProposeResponse(job.result)  // 2个提案
      setWorkflowStep('view_proposals')
    }
  }, 5000)
}

// 3. 执行选中方案（同步，<5秒）
handleExecute(proposalId, index) {
  const result = await POST('/api/v1/iteration/execute', {
    decisionId, proposalChoice: index
  })
  setExecuteResponse(result.generatedChanges)
  setWorkflowStep('view_changes')
}
```

**UI组件树**:
```
<ActProgressBar> 5个Act进度指示器
  ├── currentAct: 当前Act
  ├── completedActs: 已完成的Acts
  └── unlockedActs: 已解锁的Acts（全解锁模式）

<Tabs>
  ├── [迭代工作流]
  │   ├── <FindingsSelector> 问题列表（按Act过滤）
  │   ├── <ProposalComparison> 2个AI方案对比
  │   └── <ChangesDisplay> 生成的修改内容
  └── [决策历史]
      └── <DecisionCard> 历史决策卡片列表
```

**P0修复 (2025-10-11)**: 自由创作模式
```typescript
// 当ACT1无相关问题时
if (filteredFindings.length === 0) {
  return (
    <Alert>使用自由创作模式（手动输入焦点）</Alert>
    <input name="focusName" placeholder="例如：主角李明" />
    <textarea name="focusDescription" placeholder="描述创作意图..." />
  )
}
```

---

### 3.4 合成页面 (`app/synthesis/[projectId]/page.tsx`)

**职责**: 生成最终V2剧本

**核心流程**:
```typescript
// 1. 触发合成（配置选项）
handleTriggerSynthesis(options: SynthesisOptions) {
  const jobId = await POST('/api/v1/synthesize', { projectId, options })
  setSynthesisJobId(jobId)
}

// 2. 实时轮询10步进度
useEffect(() => {
  pollInterval = setInterval(async () => {
    const status = await GET(`/api/v1/synthesize/${jobId}/status`)
    setProgress(status.progress)        // 0-100
    setCurrentStep(status.currentStep)  // "分组决策", "冲突检测"...

    if (status === 'COMPLETED') {
      loadV2Version(status.versionId)
    }
  }, 5000)
}, [synthesisJobId])
```

**UI分层**:
```
1. 配置对话框 (SynthesisTriggerDialog):
   - preserveOriginalStyle: 是/否
   - conflictResolution: 策略选择
   - includeChangeLog: 是/否

2. 进度追踪 (SynthesisProgress):
   - 10步进度条（每步有状态：pending/processing/completed）
   - 当前步骤描述
   - 预计剩余时间

3. 结果展示 (Tabs):
   - 最终剧本(V2): 完整内容 + metadata
   - 修改日志: 详细变更记录
   - 版本对比: V1 vs V2 diff
```

---

## 4. 组件架构

### 4.1 组件分类

#### UI基础组件 (`components/ui/`)
**来源**: shadcn/ui
**特点**: 高度可定制、无依赖、复制即用

| 组件 | 用途 | 依赖 |
|-----|------|-----|
| `Button` | 按钮（6种variants） | CVA |
| `Card` | 卡片容器 | - |
| `Alert` | 提示信息 | - |
| `Badge` | 标签 | CVA |
| `Tabs` | 标签页 | Radix UI |
| `Dialog` | 模态框 | Radix UI |

**使用模式**:
```typescript
import { Button } from '@/components/ui/button'

<Button variant="default" size="lg" disabled={isLoading}>
  {isLoading ? <Loader2 className="animate-spin" /> : '提交'}
</Button>
```

#### 工作区组件 (`components/workspace/`)
**用途**: Acts 2-5迭代工作流
**设计原则**: 独立、可复用、零耦合

**ActProgressBar** - 五幕进度条
```typescript
interface Props {
  currentAct: ActType                    // 当前Act
  completedActs: ActType[]               // 已完成Acts
  unlockedActs?: ActType[]               // 已解锁Acts
  onActClick?: (act: ActType) => void    // 点击回调
  compact?: boolean                      // 紧凑模式
}

// 状态显示
type ActStatus = 'completed' | 'current' | 'upcoming'
```

**FindingsSelector** - ACT1问题选择器
```typescript
interface Finding {
  type: 'character' | 'timeline' | 'scene' | 'plot' | 'dialogue'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  location?: { characterName?: string, line?: number }
  suggestion?: string
}

// 增强视觉反馈 (2025-10-09)
- 5层选中状态指示：边框/背景/图标/徽章/文字颜色
```

**ProposalComparison** - AI方案对比
```typescript
interface Proposal {
  id: string
  title: string
  description: string
  approach?: string        // "渐进式" | "戏剧性"
  pros: string[]
  cons: string[]
  dramaticImpact?: string
}

// 布局：2列网格（md:grid-cols-2）
// AI推荐方案有蓝色ring-2装饰
```

**ChangesDisplay** - 修改展示
```typescript
// ACT2专用：显示"Show Don't Tell"转换
interface DramaticAction {
  scene: string
  before: string
  after: string
  impact: string
}

// 其他Acts：显示JSON结构（待实现专用组件）
```

#### 合成组件 (`components/synthesis/`)

**SynthesisTriggerDialog** - 合成配置
```typescript
interface SynthesisOptions {
  preserveOriginalStyle: boolean        // 保留原始风格
  conflictResolution: 'latest_takes_precedence' | 'merge_compatible' | ...
  changeIntegrationMode: 'append' | 'inline'
  includeChangeLog: boolean
  validateCoherence: boolean
}
```

**SynthesisProgress** - 10步进度
```typescript
type SynthesisStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

const STEPS = [
  '分组决策', '冲突检测', '冲突解决', '风格分析', '提示构建',
  '分块处理', 'AI合成', '合并分块', '验证一致性', '版本创建'
]
```

---

### 4.2 组件通信模式

#### 父子通信（Props Down, Events Up）
```typescript
// 父组件
<FindingsSelector
  findings={findings}
  onSelect={(finding) => setSelectedFinding(finding)}
  selectedFinding={selectedFinding}
/>

// 子组件
export function FindingsSelector({ findings, onSelect, selectedFinding }: Props) {
  return (
    <div onClick={() => onSelect(finding)}>
      {/* ... */}
    </div>
  )
}
```

#### 跨组件通信（URL State + React State）
```typescript
// 页面级状态
const [currentAct, setCurrentAct] = useState<ActType>('ACT2_CHARACTER')
const [workflowStep, setWorkflowStep] = useState<WorkflowStep>({ step: 'select_focus' })

// 组件间共享
<ActProgressBar currentAct={currentAct} onActClick={setCurrentAct} />
<FindingsSelector findings={filterByAct(findings, currentAct)} />
```

---

## 5. 状态管理

### 5.1 状态分层

**无全局状态管理器**（Redux/Zustand）
**原因**:
- 页面之间独立
- 数据从服务器获取（单一数据源）
- Next.js App Router天然支持SSR

#### 层级划分

| 层级 | 状态类型 | 存储位置 | 生命周期 |
|-----|---------|---------|---------|
| **服务器状态** | 项目数据、分析结果 | PostgreSQL | 持久化 |
| **URL状态** | projectId, Act类型 | 路由参数 | 页面跳转保留 |
| **页面状态** | 加载状态、错误、表单 | React useState | 页面卸载销毁 |
| **组件状态** | UI交互（展开/折叠） | React useState | 组件卸载销毁 |

### 5.2 关键状态示例

#### 仪表板页面状态
```typescript
const [scriptContent, setScriptContent] = useState('')      // 剧本内容
const [fileName, setFileName] = useState('')                // 文件名
const [isAnalyzing, setIsAnalyzing] = useState(false)       // 分析中
const [error, setError] = useState<string | null>(null)     // 错误信息
```

#### 分析页面状态
```typescript
// 数据状态
const [diagnosticReport, setDiagnosticReport] = useState<any>(null)
const [errors, setErrors] = useState<AnalysisError[]>([])
const [crossFileFindings, setCrossFileFindings] = useState<CrossFileFinding[]>([])

// UI状态
const [loading, setLoading] = useState(true)
const [showPreview, setShowPreview] = useState(false)
const [repairedScript, setRepairedScript] = useState('')
const [activeTab, setActiveTab] = useState<'internal' | 'cross-file'>('internal')

// 轮询状态
const [jobStatus, setJobStatus] = useState<JobStatusData | null>(null)
const [shouldPoll, setShouldPoll] = useState(true)
```

#### 迭代页面状态
```typescript
// Act工作流状态
const [currentAct, setCurrentAct] = useState<ActType>('ACT2_CHARACTER')
const [workflowStep, setWorkflowStep] = useState<WorkflowStep>({ step: 'select_focus' })

// 数据状态
const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
const [proposeResponse, setProposeResponse] = useState<ProposeResponse | null>(null)
const [executeResponse, setExecuteResponse] = useState<ExecuteResponse | null>(null)
const [decisions, setDecisions] = useState<any[]>([])

// 自由创作模式（P0-2修复）
const [isFreeCreationMode, setIsFreeCreationMode] = useState(false)
const [manualFocusName, setManualFocusName] = useState('')
const [manualFocusDescription, setManualFocusDescription] = useState('')
```

---

## 6. API通信

### 6.1 V1ApiService架构

**文件**: `lib/services/v1-api-service.ts`
**模式**: 单例服务类

```typescript
class V1ApiService {
  private currentProjectId: string | null = null
  private currentJobId: string | null = null
  private pollingAbortController: AbortController | null = null

  // 核心方法
  async createProject(title, content, description): Promise<ProjectData>
  async getProject(projectId): Promise<ProjectData>
  async startAnalysis(projectId, scriptContent): Promise<AnalysisJobData>
  async getJobStatus(jobId): Promise<JobStatusData>
  async pollJobStatus(jobId, onProgress): Promise<JobStatusData>
  async getDiagnosticReport(projectId): Promise<DiagnosticReportData>
  async getCrossFileFindings(projectId, grouped): Promise<CrossFileFindingsData>

  // Serverless兼容
  async triggerProcessing(): Promise<void>  // POST /api/v1/analyze/process

  // 状态管理
  getCurrentProjectId(): string | null
  clearState(): void
  cancelPolling(): void
}

export const v1ApiService = new V1ApiService()
```

### 6.2 关键API调用模式

#### 创建项目 + 启动分析
```typescript
// Dashboard页面
const project = await v1ApiService.createProject(title, content)
await sleep(500)  // Supabase复制延迟
const job = await v1ApiService.startAnalysis(project.id, content)
router.push(`/analysis/${project.id}`)
```

#### 轮询任务状态（Serverless兼容）
```typescript
// Analysis页面
useEffect(() => {
  const poll = async () => {
    // 1. 手动触发处理（Serverless环境）
    await v1ApiService.triggerProcessing()

    // 2. 检查状态
    const status = await v1ApiService.getJobStatus(jobId)
    setJobStatus(status)

    // 3. 完成后停止轮询
    if (status.status === 'COMPLETED') {
      setShouldPoll(false)
      const report = await v1ApiService.getDiagnosticReport(projectId)
      setErrors(report.findings)
    }
  }

  const interval = setInterval(poll, 5000)
  return () => clearInterval(interval)
}, [jobId, shouldPoll])
```

#### 异步Job模式（ACT2-5迭代）
```typescript
// 1. 创建Job
const response = await fetch('/api/v1/iteration/propose', {
  method: 'POST',
  body: JSON.stringify({ projectId, act, focusName, contradiction })
})
const { jobId } = await response.json()

// 2. 轮询直到完成
const pollInterval = setInterval(async () => {
  await v1ApiService.triggerProcessing()  // Serverless

  const jobStatus = await fetch(`/api/v1/iteration/jobs/${jobId}`)
  const { status, result } = await jobStatus.json()

  if (status === 'COMPLETED') {
    clearInterval(pollInterval)
    setProposeResponse(result)  // 2个提案
  }
}, 5000)
```

### 6.3 错误处理

```typescript
try {
  const response = await fetch('/api/v1/endpoint', { method: 'POST', body })

  if (!response.ok) {
    // 内容类型检查（防止HTML错误页）
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const error = await response.json()
      throw new Error(error.error?.message || '操作失败')
    } else {
      const text = await response.text()
      throw new Error(`服务器错误 (${response.status})`)
    }
  }

  const data = await response.json()
  // 处理成功响应
} catch (error) {
  console.error('API调用失败:', error)
  setError(error instanceof Error ? error.message : '未知错误')
}
```

---

## 7. 样式系统

### 7.1 Tailwind CSS配置

**配置文件**: `tailwind.config.js`

```javascript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        primary: 'hsl(var(--primary))',
        // CSS变量引用
      }
    }
  }
}
```

**全局样式**: `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    /* ... */
  }
}
```

### 7.2 样式组合工具

**cn()函数**: `lib/utils.ts`
```typescript
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 使用示例
<div className={cn(
  'base-styles',
  isActive && 'active-styles',
  'override-styles'
)} />
```

### 7.3 条件样式（CVA）

**class-variance-authority**用于变体管理：

```typescript
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md', // 基础样式
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        outline: 'border border-gray-300 bg-transparent'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)
```

---

## 8. 性能优化

### 8.1 Next.js优化

#### 服务器组件vs客户端组件
```typescript
// ✅ 默认为服务器组件（RSC）
export default function Page() {
  // 可以直接调用数据库（服务器端）
  const data = await prisma.project.findMany()
  return <div>{data}</div>
}

// ❌ 需要交互时使用客户端组件
'use client'
export default function Page() {
  const [state, setState] = useState()
  return <button onClick={() => setState()}>Click</button>
}
```

#### 动态导入（Code Splitting）
```typescript
// 延迟加载重量级组件
const HeavyComponent = dynamic(() => import('@/components/heavy'), {
  loading: () => <Loader />
})
```

#### 路由预取
```typescript
// Next.js Link自动预取（生产环境）
import Link from 'next/link'

<Link href="/analysis/[id]" prefetch={true}>
  查看分析
</Link>
```

### 8.2 React优化

#### Memo化昂贵计算
```typescript
const filteredFindings = useMemo(() => {
  return filterFindingsByAct(allFindings, currentAct)
}, [allFindings, currentAct])
```

#### 组件Memo
```typescript
export const FindingsSelector = React.memo(function FindingsSelector(props) {
  // 仅当props变化时重新渲染
})
```

#### 回调稳定化
```typescript
const handleSelect = useCallback((finding: Finding) => {
  setSelectedFinding(finding)
}, [])  // 依赖为空，回调永不变化
```

### 8.3 轮询优化

#### 指数退避
```typescript
let delay = 5000  // 初始5秒
while (attempts < MAX_ATTEMPTS) {
  await poll()
  await sleep(delay)
  delay = Math.min(delay * 1.5, 10000)  // 最大10秒
}
```

#### 降低频率（2025-10-02优化）
```typescript
// 从2秒改为5秒
const POLL_INTERVAL = 5000  // 减少API调用频率
```

#### 及时清理
```typescript
useEffect(() => {
  const interval = setInterval(poll, 5000)

  // ✅ 组件卸载时清理
  return () => clearInterval(interval)
}, [dependencies])
```

### 8.4 图片与资源优化

#### Next.js Image组件
```typescript
import Image from 'next/image'

<Image
  src="/logo.png"
  width={200}
  height={100}
  alt="Logo"
  priority  // LCP优化
/>
```

#### 字体优化
```typescript
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export default function RootLayout({ children }) {
  return <html className={inter.className}>{children}</html>
}
```

---

## 9. 类型安全

### 9.1 TypeScript严格模式

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 9.2 共享类型定义

#### API响应类型（v1-api-service.ts）
```typescript
export interface ProjectData {
  id: string
  title: string
  workflowStatus: string
  createdAt: string
}

export interface DiagnosticReportData {
  projectId: string
  report: {
    findings: Array<{
      type: string
      severity: string
      description: string
      confidence: number
    }>
    summary: string
  } | null
}
```

#### 组件Props类型
```typescript
export interface ActProgressBarProps {
  currentAct: ActType
  completedActs: ActType[]
  onActClick?: (act: ActType) => void
  compact?: boolean
}
```

---

## 10. 关键特性实现

### 10.1 Serverless兼容（2025-10-09）

**问题**: Vercel Serverless环境中`setInterval()`不工作

**解决方案**: 主动轮询 + 手动触发
```typescript
// 每次轮询前先触发处理
await v1ApiService.triggerProcessing()  // POST /api/v1/analyze/process
const status = await v1ApiService.getJobStatus(jobId)
```

### 10.2 自由创作模式（2025-10-11 P0修复）

**问题**: ACT2无角色问题时，用户被卡住

**解决方案**: 检测无问题时，提供手动输入
```typescript
if (filteredFindings.length === 0) {
  return (
    <Alert>当前Act没有ACT1诊断问题</Alert>
    <Button onClick={() => setIsFreeCreationMode(true)}>
      使用自由创作模式
    </Button>
  )
}

if (isFreeCreationMode) {
  return (
    <input name="focusName" placeholder="焦点名称" />
    <textarea name="focusDescription" placeholder="创作意图" />
  )
}
```

### 10.3 全Act解锁（2025-10-11 P0修复）

**旧逻辑**: 渐进式解锁（ACT2完成 → 解锁ACT3）

**新逻辑**: 全解锁
```typescript
const getUnlockedActs = (): ActType[] => {
  // ✅ P0修复：移除渐进式解锁
  if (diagnosticReport) {
    return ['ACT2_CHARACTER', 'ACT3_WORLDBUILDING', 'ACT4_PACING', 'ACT5_THEME']
  }
  return ['ACT2_CHARACTER']  // 降级兼容
}
```

---

## 11. 开发工具链

### 11.1 开发命令

```bash
npm run dev              # 启动开发服务器（localhost:3000，自动递增）
npm run build            # 构建生产版本
npm run start            # 启动生产服务器
npm run lint             # ESLint检查
npm run typecheck        # TypeScript类型检查
```

### 11.2 调试技巧

#### React DevTools
```typescript
// 安装Chrome扩展: React Developer Tools
// 可查看组件树、Props、State
```

#### Console日志规范
```typescript
console.log('[Component] Description:', data)      // 调试信息
console.warn('[Component] Warning:', warning)      // 警告
console.error('[Component] Error:', error)         // 错误
```

#### Network面板
- 查看API调用时间
- 检查响应状态码
- 验证请求/响应内容

---

## 12. 最佳实践

### 12.1 组件设计

✅ **推荐**:
- 单一职责原则（每个组件只做一件事）
- Props接口清晰（明确必填/可选）
- 避免Props Drilling（超过3层用Context）
- 使用TypeScript类型（不用`any`）

❌ **避免**:
- 巨型组件（>300行代码）
- 深层嵌套（>5层）
- 内联样式（用Tailwind）
- 直接操作DOM（用Refs）

### 12.2 状态管理

✅ **推荐**:
- 服务器数据用API获取（不存本地）
- URL状态用路由参数
- UI状态用useState
- 复杂表单用React Hook Form

❌ **避免**:
- localStorage存储业务数据（已在Epic 004移除）
- 过度使用全局状态
- 状态提升过高

### 12.3 性能

✅ **推荐**:
- 服务器组件默认（交互时才用'use client'）
- 懒加载重量级组件
- 虚拟化长列表（react-window）
- 图片用Next.js Image组件

❌ **避免**:
- 所有组件都用'use client'
- 轮询间隔<2秒
- 未清理的定时器/监听器

---

## 附录A：文件清单

### A.1 页面文件

| 文件路径 | 行数 | 职责 |
|---------|------|-----|
| `app/dashboard/page.tsx` | 299 | 剧本上传 |
| `app/analysis/[id]/page.tsx` | 871 | ACT1诊断报告 |
| `app/iteration/[projectId]/page.tsx` | 951 | ACT2-5工作区 |
| `app/synthesis/[projectId]/page.tsx` | ~400 | 合成V2剧本 |

### A.2 核心组件

| 文件路径 | 行数 | 职责 |
|---------|------|-----|
| `components/workspace/act-progress-bar.tsx` | 219 | 五幕进度条 |
| `components/workspace/findings-selector.tsx` | ~200 | 问题选择器 |
| `components/workspace/proposal-comparison.tsx` | 157 | 方案对比 |
| `components/workspace/changes-display.tsx` | ~150 | 修改展示 |
| `lib/services/v1-api-service.ts` | 543 | API客户端 |

### A.3 UI组件库

shadcn/ui组件（16个）：
- Button, Card, Alert, Badge, Tabs
- Dialog, Input, Textarea, Select, Checkbox
- Radio, Switch, Label, ScrollArea, Dropdown, Progress

---

## 附录B：关键修复记录

| 日期 | 问题 | 修复 | 文件 |
|-----|------|-----|------|
| 2025-10-09 | 迭代页加载竞态 | 添加loading守卫 | `iteration/[projectId]/page.tsx:272-283` |
| 2025-10-09 | 选中状态不明显 | 5层视觉反馈 | `findings-selector.tsx:124-158` |
| 2025-10-10 | ACT2-5超时 | 改异步Job模式 | `iteration/propose/route.ts` |
| 2025-10-10 | Act过滤错误 | 添加类型映射 | `iteration/[projectId]/page.tsx:348-357` |
| 2025-10-11 | 用户卡住 | 自由创作模式 | `iteration/[projectId]/page.tsx:579-610` |
| 2025-10-11 | 渐进解锁 | 改全解锁 | `iteration/[projectId]/page.tsx:391-401` |

---

**文档结束** | 下一篇: [04 - 后端API架构](./04_BACKEND_API_ARCHITECTURE.md)
