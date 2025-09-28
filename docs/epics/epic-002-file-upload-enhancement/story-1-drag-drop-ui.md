# Story 1: 实现拖拽上传UI和交互

**Story Points**: 5
**优先级**: 🟡 High
**预计时间**: 2天

## 用户故事

作为一名**剧本创作者**，
我想要**通过拖拽文件到指定区域来上传剧本**，
以便**更快速、更直观地导入我的工作文件**。

## 故事背景

### 现有系统集成
- **集成组件**: 现有文件上传组件（推测位于 `components/upload/`）
- **技术栈**: React, Next.js 14, Tailwind CSS, shadcn/ui
- **遵循模式**: 现有的文件上传验证和处理流程
- **触点**:
  - 文件验证中间件
  - 上传进度状态管理
  - 错误处理系统

## 验收标准

### 功能需求
1. ✅ 创建拖拽区域组件
   - 明显的拖拽区域边界
   - 支持全屏拖拽检测
   - 拖拽时的视觉反馈（边框高亮、背景变化、图标动画）

2. ✅ 实现拖拽事件处理
   - `dragenter` - 文件进入区域
   - `dragover` - 文件在区域上方
   - `dragleave` - 文件离开区域
   - `drop` - 文件释放

3. ✅ 显示上传进度和状态
   - 进度条显示（0-100%）
   - 状态提示（准备上传、上传中、成功、失败）
   - 文件信息预览（名称、大小、类型）

### 集成需求
4. ✅ 保留现有的点击上传按钮功能
5. ✅ 使用相同的文件验证逻辑
   - 文件大小限制（10MB）
   - 文件格式检查
6. ✅ 与现有的错误处理机制集成

### 质量需求
7. ✅ 支持多文件拖拽（批量上传）
8. ✅ 防止页面默认拖拽行为
9. ✅ 响应式设计
   - 桌面端：完整拖拽功能
   - 移动端：显示点击上传按钮

## 技术实现

### 1. 组件结构

```tsx
// components/upload/DragDropUpload.tsx
interface DragDropUploadProps {
  accept?: string[];
  maxSize?: number;
  multiple?: boolean;
  onUpload: (files: File[]) => Promise<void>;
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({
  accept = ['.txt', '.md', '.fdx'],
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
  onUpload
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 拖拽事件处理
  // 文件验证
  // 上传处理
};
```

### 2. 拖拽区域样式

```css
/* Tailwind Classes */
.drop-zone {
  @apply border-2 border-dashed border-gray-300
         rounded-lg p-8 text-center
         transition-all duration-200;
}

.drop-zone.dragging {
  @apply border-blue-500 bg-blue-50
         scale-105 shadow-lg;
}
```

### 3. 事件处理逻辑

```typescript
const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  setIsDragging(false);

  const files = Array.from(e.dataTransfer.files);
  const validFiles = validateFiles(files);

  if (validFiles.length > 0) {
    handleUpload(validFiles);
  }
};

const validateFiles = (files: File[]): File[] => {
  return files.filter(file => {
    // 检查文件类型
    // 检查文件大小
    // 返回有效文件
  });
};
```

### 4. 进度显示

```tsx
// components/upload/UploadProgress.tsx
const UploadProgress: React.FC<{
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
}> = ({ fileName, progress, status }) => {
  // 进度条UI
  // 状态图标
  // 取消按钮
};
```

## 完成定义

- [ ] 拖拽功能在Chrome、Firefox、Safari正常工作
- [ ] 视觉反馈流畅且符合设计规范
- [ ] 错误处理友好
  - 文件类型错误提示
  - 文件大小超限提示
  - 网络错误重试选项
- [ ] 无障碍支持
  - 键盘操作支持
  - 屏幕阅读器友好
  - ARIA标签正确
- [ ] 组件单元测试覆盖率>80%

## 测试场景

### 单元测试
```typescript
// tests/components/DragDropUpload.test.tsx
describe('DragDropUpload', () => {
  it('should show drag overlay when dragging');
  it('should validate file types');
  it('should reject oversized files');
  it('should handle multiple files');
  it('should prevent default browser behavior');
});
```

### 集成测试
```typescript
// tests/integration/upload-flow.test.tsx
describe('Upload Flow', () => {
  it('should upload via drag and drop');
  it('should fallback to click upload');
  it('should show progress during upload');
  it('should handle upload errors gracefully');
});
```

## UI/UX规范

### 视觉设计
- **默认状态**: 灰色虚线边框，上传图标，提示文字
- **悬停状态**: 边框颜色加深，背景轻微变化
- **拖拽状态**: 蓝色实线边框，背景高亮，放大动画
- **上传状态**: 显示进度条和百分比
- **完成状态**: 绿色勾选图标，成功消息

### 文案规范
- 默认提示: "拖拽文件到此处，或点击选择文件"
- 拖拽提示: "释放文件以上传"
- 上传中: "正在上传 {fileName}... {progress}%"
- 成功: "文件上传成功！"
- 错误: "上传失败：{errorMessage}"

## 输出交付物

1. **组件代码**
   - `components/upload/DragDropUpload.tsx`
   - `components/upload/UploadProgress.tsx`
   - `components/upload/FilePreview.tsx`

2. **样式文件**
   - `styles/upload.module.css`
   - Tailwind配置更新

3. **测试文件**
   - 单元测试套件
   - 集成测试套件

4. **文档**
   - 组件使用文档
   - Props API文档

## 依赖关系

- 无前置依赖
- Story 3依赖此Story的UI组件

## 风险

- **风险**: 不同浏览器的拖拽API行为可能不一致
- **缓解**: 充分的跨浏览器测试，准备polyfill方案

## 备注

- 考虑添加文件类型图标显示
- 预留批量上传的UI扩展空间
- 考虑添加拖拽排序功能（未来迭代）