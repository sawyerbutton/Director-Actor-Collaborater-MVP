# Epic 004: Architecture Migration - 测试指南

## 测试概述
本文档提供了Epic 004架构迁移的完整测试流程，包括V1 API、数据库持久化、异步处理等功能的验证。

## 前置条件

### 1. 环境准备
```bash
# 确保开发服务器运行
npm run dev

# 确保PostgreSQL数据库可访问
npx prisma db push
```

### 2. 验证服务状态
- 访问 http://localhost:3000
- 确认页面样式正常显示
- 检查控制台无关键错误

## 测试流程

### 第一部分：基础功能测试

#### 1. 项目创建和管理
**目标**: 验证项目的数据库持久化

**步骤**:
1. 访问 http://localhost:3000/v1-demo
2. 点击"创建新项目"按钮
3. 输入项目名称和描述
4. 上传测试剧本文件（.txt/.md/.markdown）
5. 点击"创建"

**预期结果**:
- 项目成功创建
- 页面显示项目ID
- 项目状态为"INITIALIZED"

**验证数据库持久化**:
```bash
# 在新终端执行
npx prisma studio
# 查看Project表，确认新项目存在
```

#### 2. V1 API分析功能
**目标**: 验证异步分析流程

**步骤**:
1. 在v1-demo页面找到创建的项目
2. 点击"开始分析"按钮
3. 观察状态变化：
   - "PENDING" → "PROCESSING" → "COMPLETED"
4. 等待分析完成（约10-30秒）

**预期结果**:
- 进度条实时更新
- 状态自动轮询刷新
- 分析完成后显示结果

**API验证**:
```bash
# 获取项目列表
curl http://localhost:3000/api/v1/projects

# 获取特定项目状态（替换PROJECT_ID）
curl http://localhost:3000/api/v1/projects/PROJECT_ID/status
```

### 第二部分：五幕工作流测试

#### 3. 工作流状态转换
**目标**: 验证五幕工作流状态机

**工作流状态**:
- INITIALIZED: 初始状态
- ACT1_RUNNING: Act 1分析中
- ACT1_COMPLETE: Act 1完成
- ITERATING: 迭代修复中
- SYNTHESIZING: 综合处理中
- COMPLETED: 全部完成

**测试步骤**:
1. 创建新项目
2. 启动分析
3. 监控工作流状态变化：
   ```bash
   # 查看项目详情（替换PROJECT_ID）
   curl http://localhost:3000/api/v1/projects/PROJECT_ID | jq '.workflowStatus'
   ```

**预期结果**:
- 状态按顺序转换
- 每个状态都有对应的数据更新

#### 4. 作业队列测试
**目标**: 验证异步作业处理

**步骤**:
1. 同时创建多个分析任务
2. 观察作业队列处理

**监控作业**:
```bash
# 查看作业状态（替换JOB_ID）
curl http://localhost:3000/api/v1/analyze/jobs/JOB_ID
```

**预期结果**:
- 作业按顺序处理
- 失败的作业有错误信息
- 作业状态正确更新

### 第三部分：错误处理测试

#### 5. 文件格式限制
**目标**: 验证文件上传限制

**测试用例**:
1. 尝试上传.docx文件 → 应该被拒绝
2. 尝试上传.pdf文件 → 应该被拒绝
3. 上传.txt文件 → 应该成功
4. 上传.md文件 → 应该成功

**预期错误提示**:
```
仅支持 .txt, .md, .markdown 格式
```

#### 6. 大文件处理
**目标**: 验证大文件上传和处理

**步骤**:
1. 准备一个大于1MB的.txt文件
2. 上传并分析
3. 监控内存使用

**预期结果**:
- 文件成功上传
- 分析正常进行
- 无内存溢出

### 第四部分：并发测试

#### 7. 并发项目创建
**目标**: 验证并发处理能力

**测试脚本**:
```bash
# 创建test-concurrent.sh
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/v1/projects \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Test Project $i\",\"content\":\"测试内容\"}" &
done
wait
```

**预期结果**:
- 所有项目成功创建
- 数据库无死锁
- ID不重复

### 第五部分：数据一致性测试

#### 8. 数据库事务测试
**目标**: 验证数据一致性

**步骤**:
1. 创建项目并立即中断（Ctrl+C）
2. 检查数据库状态
3. 重新创建相同项目

**验证**:
```sql
-- 在Prisma Studio或数据库客户端执行
SELECT * FROM "Project" ORDER BY "createdAt" DESC LIMIT 5;
SELECT * FROM "ScriptVersion" ORDER BY "createdAt" DESC LIMIT 5;
SELECT * FROM "AnalysisJob" ORDER BY "createdAt" DESC LIMIT 5;
```

**预期结果**:
- 无孤立记录
- 外键约束正常
- 级联删除正常工作

### 第六部分：性能测试

#### 9. 响应时间测试
**目标**: 验证API性能

**测试命令**:
```bash
# 测试项目列表API
time curl http://localhost:3000/api/v1/projects

# 测试分析API（替换PROJECT_ID）
time curl -X POST http://localhost:3000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"PROJECT_ID\"}"
```

**性能基准**:
- 项目列表: < 200ms
- 创建项目: < 500ms
- 启动分析: < 300ms（异步）

#### 10. 负载测试
**目标**: 验证系统稳定性

**使用Apache Bench**:
```bash
# 安装 ab 工具
sudo apt-get install apache2-utils

# 负载测试（100请求，10并发）
ab -n 100 -c 10 http://localhost:3000/api/v1/projects/
```

**预期指标**:
- 无请求失败
- 平均响应时间 < 1秒
- 内存使用稳定

## 测试报告模板

### 测试执行记录
| 测试项 | 状态 | 备注 |
|--------|------|------|
| 项目创建 | ✅ | |
| V1 API分析 | ✅ | |
| 工作流状态 | ✅ | |
| 作业队列 | ✅ | |
| 文件限制 | ✅ | |
| 并发处理 | ✅ | |
| 数据一致性 | ✅ | |
| 性能测试 | ✅ | |

### 发现的问题
1. **问题描述**:
2. **重现步骤**:
3. **解决方案**:

### 性能指标
- 平均响应时间:
- 并发处理能力:
- 内存占用:
- CPU使用率:

## 故障排查

### 常见问题

#### 1. CSS样式丢失
**症状**: 页面显示无样式
**解决**:
```bash
rm -rf .next node_modules/.cache
npm run dev
```

#### 2. 数据库连接失败
**症状**: "Can't reach database server"
**解决**:
1. 检查环境变量
2. 验证数据库连接
3. 重新运行 `npx prisma db push`

#### 3. 分析任务卡住
**症状**: 状态一直是PROCESSING
**解决**:
1. 检查DeepSeek API密钥
2. 查看服务器日志
3. 手动更新作业状态

#### 4. 速率限制错误
**症状**: "Too many requests, please try again later"
**解决**:
```bash
# 开发环境已自动提升至100请求/分钟
# 如仍遇到问题，可完全禁用速率限制：
DISABLE_RATE_LIMIT=true npm run dev
```

## 回归测试清单

每次更新后执行：
- [ ] 基础页面访问正常
- [ ] CSS样式显示正常
- [ ] 项目创建功能正常
- [ ] 文件上传功能正常
- [ ] 分析功能正常
- [ ] 数据库连接正常
- [ ] API响应正常
- [ ] 错误处理正常

## 更新日志

### 2024-09-29
- 初始版本创建
- 完成Epic 004架构迁移
- 修复了TypeScript构建错误
- 解决了CSS编译问题