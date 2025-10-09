# Project Not Found 错误调试指南

## 错误信息
```
{"success":false,"error":{"code":"NOT_FOUND","message":"Project not found"},"meta":{"timestamp":"2025-10-09T04:37:18.109Z","version":"v1"}}
```

## 可能的原因

### 1. 项目ID不存在或无效
- 检查URL中的项目ID是否正确
- 确认项目是否在数据库中

### 2. 调试步骤

#### Step 1: 检查浏览器URL
确认你访问的URL格式：
```
正确: https://your-app.vercel.app/analysis/[实际的项目ID]
错误: https://your-app.vercel.app/analysis/undefined
错误: https://your-app.vercel.app/analysis/null
```

#### Step 2: 检查浏览器控制台
查找以下日志：
```javascript
[API] Project not found: [显示的ID]
```

这会告诉我们具体是哪个ID找不到。

#### Step 3: 验证项目是否存在
在浏览器控制台运行：
```javascript
// 获取当前URL的项目ID
const projectId = window.location.pathname.split('/').pop();
console.log('当前项目ID:', projectId);

// 尝试直接API调用
fetch(`/api/v1/projects/${projectId}`)
  .then(r => r.json())
  .then(data => console.log('项目数据:', data))
  .catch(err => console.error('错误:', err));
```

### 3. 修复方案

#### 方案A: 如果是新创建的项目
问题可能是数据库写入延迟。解决方法：
1. 等待 1-2 秒后刷新页面
2. 或返回 Dashboard 重新进入项目

#### 方案B: 如果项目确实不存在
1. 返回 Dashboard
2. 重新上传剧本创建项目
3. 确保看到"分析已启动"消息

#### 方案C: 如果ID格式异常
检查是否有以下情况：
- URL包含 `undefined` 或 `null`
- URL包含特殊字符
- 从旧页面跳转导致ID丢失

### 4. 临时诊断日志

我已在以下文件添加调试日志：
- `/app/api/v1/projects/[id]/route.ts` (line 28)

这会在服务端日志中显示哪个项目ID找不到。

### 5. 紧急绕过方案

如果需要立即测试，可以：
1. 打开 Dashboard: `/dashboard`
2. 上传新剧本
3. 系统会自动跳转到 Analysis 页面
4. 观察是否还有相同错误

### 6. 报告问题时需要提供

如果问题持续，请提供：
- [ ] 浏览器控制台的完整错误栈
- [ ] 访问的完整URL（隐去域名）
- [ ] 服务端日志中的 `[API] Project not found` 消息
- [ ] 是否是新创建的项目还是已存在的项目
- [ ] 操作步骤（如何进入该页面）

