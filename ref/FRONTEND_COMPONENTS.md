# Frontend Components Reference

Complete reference for ScriptAI frontend components and pages.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Hooks + API polling
- **API Client**: `v1ApiService` (`lib/services/v1-api-service.ts`)

## Page Structure

### 1. Dashboard (`app/dashboard/page.tsx`)

**Purpose**: Script upload entry point

**Key Features**:
- File upload (.txt/.md/.markdown only)
- Script validation (500-10000 lines)
- Auto-start ACT1 analysis
- Redirect to analysis page

**Flow**:
1. User uploads script file
2. Frontend validates file format and line count
3. Creates project via `v1ApiService.createProject()`
4. Starts ACT1 analysis via `v1ApiService.startAnalysis()`
5. Redirects to `/analysis/:projectId` with polling

**Replication Lag Handling**:
```typescript
// 500ms delay for Supabase connection pooling
await new Promise(resolve => setTimeout(resolve, 500));
const jobId = await v1ApiService.startAnalysis(projectId, 'demo-user');
```

**Components Used**:
- `components/upload/file-upload.tsx` - File upload widget
- `components/ui/button.tsx` - Upload button
- `components/ui/alert.tsx` - Error messages

### 2. Analysis Page (`app/analysis/[id]/page.tsx`)

**Purpose**: Display ACT1 diagnostic report

**Key Features**:
- Real-time job status polling (every 5 seconds)
- Progress indicator
- Diagnostic report visualization
- Statistics summary
- Error categorization by type and severity

**Flow**:
1. Page loads with `projectId` from URL
2. Polls job status via `v1ApiService.pollJobStatus()`
3. When COMPLETED, fetches diagnostic report
4. Displays findings with filtering options
5. "进入迭代工作区" button → `/iteration/:projectId`

**Product Positioning (Plan B)**:
- Emphasizes "逻辑快速修复" (ACT1) vs "深度创作" (ACT2-5)
- Clear A/B choice: Use repaired script OR continue to creative enhancement
- Not misleading about direct ACT2-5 access

**Components Used**:
- `components/analysis/diagnostic-report.tsx` - Report visualization
- `components/analysis/error-card.tsx` - Individual error display
- `components/ui/progress.tsx` - Loading progress
- `components/ui/badge.tsx` - Severity badges

**Critical Implementation**:
```typescript
// Show loading spinner BEFORE checking diagnosticReport (prevents race condition)
if (isLoading) {
  return <LoadingSpinner />;
}

// THEN check if Act 1 is complete
if (!diagnosticReport) {
  return <Act1RequiredError />;
}
```

### 3. Iteration Page (`app/iteration/[projectId]/page.tsx`)

**Purpose**: Acts 2-5 interactive workflow

**Key Features**:
- Act selection (2/3/4/5) via ActProgressBar
- Findings selector with act-specific filtering
- Free Creation Mode (manual focus input)
- Async proposal generation (30-60s polling)
- Proposal comparison UI
- Decision execution
- Changes visualization
- Decision history

**Flow**:
1. Select act using ActProgressBar
2. Choose finding from ACT1 report OR enter manual focus (Free Creation Mode)
3. Click "获取AI解决方案提案" → Creates ITERATION job
4. Poll job status every 5 seconds
5. When COMPLETED, display proposals in ProposalComparison
6. User selects proposal
7. Execute via synchronous API call (< 5 seconds)
8. Display generated changes in ChangesDisplay
9. Repeat or switch acts

**Free Creation Mode** (NEW 2025-10-11):
- Allows manual focus input when no ACT1 findings available
- Enables independent ACT2-5 use without ACT1 dependency
- Text input for focusName and contradiction
- Available for all acts after ACT1 completion

**Act-Specific Filtering** (2025-10-10):
- **ACT2**: Character contradictions only
- **ACT3**: Scene and plot issues only
- **ACT4**: Timeline issues only
- **ACT5**: Character and dialogue issues only

**Components Used**:
- `components/workspace/act-progress-bar.tsx` - Act navigation
- `components/workspace/findings-selector.tsx` - ACT1 findings selection
- `components/workspace/proposal-comparison.tsx` - Proposal review
- `components/workspace/changes-display.tsx` - Changes visualization

**State Management**:
```typescript
const [selectedAct, setSelectedAct] = useState<ActType>('ACT2_CHARACTER');
const [selectedFinding, setSelectedFinding] = useState<string | null>(null);
const [isPolling, setIsPolling] = useState(false);
const [proposals, setProposals] = useState<any>(null);
const [generatedChanges, setGeneratedChanges] = useState<any>(null);
```

**Workflow Guidance** (NEW 2025-10-11):
First-time visitors see guidance text:
```
💡 提示：请先从上方进度条选择一个创作阶段（ACT2-5），然后选择要处理的问题或手动输入创作焦点。
```

### 4. Synthesis Page (`app/synthesis/[projectId]/page.tsx`)

**Purpose**: V2 script generation

**Key Features**:
- Synthesis configuration dialog
- Real-time 10-step progress tracking
- V2 result tabs (script/changelog/diff)
- Export options (TXT/MD)

**Flow**:
1. Click "开始合成" → Opens configuration dialog
2. Configure synthesis options:
   - Preserve original style (default: true)
   - Conflict resolution strategy (default: auto_reconcile)
   - Include change log (default: true)
   - Validate coherence (default: true)
3. Trigger synthesis via `v1ApiService.triggerSynthesis()`
4. Poll status every 5 seconds
5. Display 10-step progress:
   - Grouping → Conflict Detection → Resolution → Style Analysis
   - Prompt Building → Chunking → AI Generation → Merging
   - Validation → Version Creation
6. When COMPLETED, show V2 result in 3 tabs:
   - **最终剧本 (V2)**: Full synthesized script
   - **修改日志**: Detailed change log
   - **版本对比**: V1 vs V2 side-by-side comparison
7. Export as TXT or MD

**Components Used**:
- `components/synthesis/synthesis-trigger-dialog.tsx` - Configuration modal
- `components/synthesis/synthesis-progress.tsx` - 10-step progress tracker
- `components/ui/tabs.tsx` - V2 result tabs
- `components/ui/dialog.tsx` - Configuration dialog

## Workspace Components (Epic 005)

All components in `components/workspace/` are standalone and reusable.

### ActProgressBar

**Location**: `components/workspace/act-progress-bar.tsx`

**Purpose**: Five-act progress indicator with navigation

**Props**:
```typescript
interface ActProgressBarProps {
  currentAct: ActType;
  completedActs: ActType[];
  onActClick: (act: ActType) => void;
  compact?: boolean;
}
```

**Features**:
- Visual progress indicator
- Click handlers for act switching
- Completed acts highlighted
- Compact mode for smaller displays

**Act Labels** (Plan B Positioning):
- ACT2: 角色深度创作 (Character Depth Creation)
- ACT3: 世界观丰富化 (Worldbuilding Enrichment)
- ACT4: 节奏优化 (Pacing Enhancement)
- ACT5: 精神深度 (Spiritual Depth)

### FindingsSelector

**Location**: `components/workspace/findings-selector.tsx`

**Purpose**: ACT1 findings selection with act-specific filtering

**Props**:
```typescript
interface FindingsSelectorProps {
  findings: LogicError[];
  currentAct: ActType;
  onSelect: (finding: LogicError | null) => void;
  selectedId: string | null;
}
```

**Features**:
- Lists ACT1 findings by category
- Act-specific filtering:
  - ACT2: character only
  - ACT3: scene, plot only
  - ACT4: timeline only
  - ACT5: character, dialogue only
- 5-layer visual feedback for selected state:
  1. Blue border ring (`ring-2 ring-blue-500`)
  2. Blue background (`bg-blue-50/50`)
  3. Checkmark icon (`CheckCircle2`)
  4. "已选择" badge
  5. Blue title text (`text-blue-900`)
- Empty state message if no findings match current act
- Selection context summary in Alert component

**Enhanced UX (2025-10-09)**:
```typescript
// Multiple visual indicators for selected state
<div className={cn(
  "p-4 border rounded-lg cursor-pointer transition-all",
  isSelected && "ring-2 ring-blue-500 bg-blue-50/50"
)}>
  {isSelected && <CheckCircle2 className="text-blue-600" />}
  {isSelected && <Badge>已选择</Badge>}
</div>
```

### ProposalComparison

**Location**: `components/workspace/proposal-comparison.tsx`

**Purpose**: Side-by-side proposal comparison

**Props**:
```typescript
interface ProposalComparisonProps {
  proposals: Proposal[];
  recommendedId: number;
  onSelect: (id: number) => void;
}
```

**Features**:
- Shows exactly 2 proposals (ACT2-5)
- Highlights recommended option
- Pros/cons visualization
- Selection callback

**Proposal Structure**:
```typescript
interface Proposal {
  id: number;
  type: 'gradual' | 'dramatic';
  approach: string;
  pros: string[];
  cons: string[];
}
```

### ChangesDisplay

**Location**: `components/workspace/changes-display.tsx`

**Purpose**: Dramatic actions/changes visualization

**Props**:
```typescript
interface ChangesDisplayProps {
  changes: GeneratedChanges;
  act: ActType;
}
```

**Features**:
- Act-specific change display:
  - **ACT2**: Dramatic actions with scene numbers
  - **ACT3**: Setting enhancements with theme alignment
  - **ACT4**: Pacing strategies
  - **ACT5**: Character core definition
- Overall arc/theme summary
- Integration notes

**ACT2 Changes Structure**:
```typescript
interface DramaticActions {
  actions: Array<{
    sceneNumber: number;
    actionDescription: string;
    dialogueSuggestion: string;
    emotionalTone: string;
  }>;
  overallArc: string;
  integrationNotes: string;
}
```

## UI Components (shadcn/ui)

Located in `components/ui/`:

### Core Components
- `button.tsx` - Button with variants
- `card.tsx` - Card container
- `badge.tsx` - Status badges
- `alert.tsx` - Alert messages
- `dialog.tsx` - Modal dialogs
- `tabs.tsx` - Tab navigation
- `progress.tsx` - Progress bars
- `spinner.tsx` - Loading spinners

### Form Components
- `input.tsx` - Text input
- `textarea.tsx` - Multiline input
- `select.tsx` - Dropdown select
- `checkbox.tsx` - Checkbox
- `radio-group.tsx` - Radio buttons

### Usage Example
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

<Card>
  <CardHeader>
    <Badge variant="success">Complete</Badge>
  </CardHeader>
  <CardContent>
    <Button onClick={handleClick}>Action</Button>
  </CardContent>
</Card>
```

## API Client Service

### v1ApiService

**Location**: `lib/services/v1-api-service.ts`

**Purpose**: Centralized V1 API client with state management

**Key Methods**:

```typescript
// Projects
createProject(title: string, content: string, userId: string): Promise<Project>
getProject(projectId: string): Promise<Project>
listProjects(userId: string): Promise<Project[]>
getProjectStatus(projectId: string): Promise<WorkflowStatus>

// ACT1 Analysis
startAnalysis(projectId: string, userId: string): Promise<string> // Returns jobId
pollJobStatus(jobId: string): Promise<JobStatus>
getJobStatus(jobId: string): Promise<JobStatus>
getDiagnosticReport(projectId: string): Promise<DiagnosticReport>
triggerProcessing(): Promise<void> // Serverless manual trigger

// ACT1 Repair
applyAct1Repair(projectId: string, data: RepairData): Promise<RepairResult>

// ACT2-5 Iteration
proposeEnhancement(params: ProposeParams): Promise<string> // Returns jobId (async)
pollIterationJobStatus(jobId: string): Promise<JobStatus> // Poll for proposals
executeProposal(decisionId: string, proposalChoice: number): Promise<Changes>
getDecisions(projectId: string, act?: ActType): Promise<Decision[]>

// Synthesis
triggerSynthesis(projectId: string, options: SynthesisOptions): Promise<string> // Returns jobId
pollSynthesisStatus(jobId: string): Promise<SynthesisStatus>
getVersion(versionId: string): Promise<ScriptVersion>
compareVersions(sourceId: string, targetId: string): Promise<DiffResult>

// Export
exportScript(versionId: string, format: ExportFormat): Promise<Blob>
```

**Polling Pattern**:
```typescript
async pollJobStatus(jobId: string): Promise<JobStatus> {
  const MAX_ATTEMPTS = 120; // 10 minutes (5s interval)
  const POLL_INTERVAL = 5000; // 5 seconds

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    // Trigger processing BEFORE checking status (Serverless compatibility)
    await this.triggerProcessing();

    const status = await this.getJobStatus(jobId);

    if (status.status === 'COMPLETED' || status.status === 'FAILED') {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error('Job polling timeout');
}
```

**Error Handling**:
```typescript
try {
  const response = await fetch('/api/v1/endpoint', { ... });

  if (!response.ok) {
    // Check content-type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.error?.message || '操作失败');
    } else {
      // Handle HTML error pages
      throw new Error(`服务器错误 (${response.status})`);
    }
  }

  return await response.json();
} catch (error) {
  console.error('[API] Error:', error);
  throw error;
}
```

## State Management Patterns

### Polling State
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<any>(null);

useEffect(() => {
  const pollData = async () => {
    try {
      setIsLoading(true);
      const result = await v1ApiService.pollJobStatus(jobId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  pollData();
}, [jobId]);
```

### Form State
```typescript
const [formData, setFormData] = useState({
  title: '',
  content: ''
});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await v1ApiService.createProject(formData.title, formData.content, 'demo-user');
    router.push('/dashboard');
  } catch (error) {
    setError(error.message);
  }
};
```

## Routing

Uses Next.js App Router with file-based routing:

```
app/
├── dashboard/page.tsx          → /dashboard
├── analysis/[id]/page.tsx      → /analysis/:id
├── iteration/[projectId]/page.tsx → /iteration/:projectId
├── synthesis/[projectId]/page.tsx → /synthesis/:projectId
└── api/v1/                     → /api/v1/* (API routes)
```

### Navigation
```typescript
import { useRouter } from 'next/navigation';

const router = useRouter();

// Navigate to analysis page
router.push(`/analysis/${projectId}`);

// Navigate with query params
router.push(`/iteration/${projectId}?act=ACT2_CHARACTER`);
```

## Styling Conventions

### Tailwind Classes
```typescript
// Card container
<div className="p-6 bg-white rounded-lg shadow-md">

// Button
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">

// Grid layout
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// Flex layout
<div className="flex items-center justify-between gap-2">
```

### Responsive Design
```typescript
// Mobile-first approach
<div className="text-sm md:text-base lg:text-lg">

// Hide on mobile
<div className="hidden md:block">

// Show on mobile only
<div className="block md:hidden">
```

## Performance Optimization

### Code Splitting
- Dynamic imports for large components
- Lazy loading for routes
- Suspense boundaries for async data

### Memoization
```typescript
import { useMemo, useCallback } from 'react';

const filteredData = useMemo(() => {
  return data.filter(item => item.status === 'active');
}, [data]);

const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### Image Optimization
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority
/>
```

## Testing Components

### Unit Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});

test('calls onClick handler', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  fireEvent.click(screen.getByText('Click me'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### E2E Tests
```typescript
import { test, expect } from '@playwright/test';

test('complete workflow', async ({ page }) => {
  await page.goto('/dashboard');

  // Upload script
  await page.setInputFiles('input[type="file"]', 'test-script.txt');
  await page.click('button:has-text("开始分析")');

  // Wait for analysis
  await page.waitForURL(/\/analysis\/\w+/);
  await page.waitForSelector('text=诊断报告');

  // Proceed to iteration
  await page.click('button:has-text("进入迭代工作区")');
  await page.waitForURL(/\/iteration\/\w+/);
});
```

## Common Patterns

### Loading States
```typescript
{isLoading ? (
  <div className="flex items-center justify-center p-8">
    <Spinner />
    <span className="ml-2">加载中...</span>
  </div>
) : (
  <DataDisplay data={data} />
)}
```

### Error States
```typescript
{error && (
  <Alert variant="destructive">
    <AlertTitle>错误</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

### Empty States
```typescript
{data.length === 0 ? (
  <div className="text-center p-8 text-gray-500">
    <p>暂无数据</p>
  </div>
) : (
  <DataList items={data} />
)}
```

## Accessibility

### ARIA Labels
```typescript
<button aria-label="关闭对话框" onClick={handleClose}>
  <X className="h-4 w-4" />
</button>
```

### Keyboard Navigation
```typescript
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  onClick={handleClick}
>
  Clickable Div
</div>
```

### Screen Reader Support
```typescript
<span className="sr-only">仅供屏幕阅读器</span>
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

## Related Documentation

- **API Reference**: See `ref/API_REFERENCE.md`
- **AI Agents**: See `ref/AI_AGENTS.md`
- **Workflow Guide**: See `docs/ai-analysis-repair-workflow.md`
- **Testing**: See `docs/COMPREHENSIVE_TESTING_STRATEGY.md`
