# 业务流程与用户旅程详解

**文档版本**: v1.0
**创建日期**: 2025-11-05
**所属**: [系统架构完全指南](./SYSTEM_ARCHITECTURE_COMPLETE.md)

---

## 📋 目录

1. [产品定位与核心价值](#1-产品定位与核心价值)
2. [用户角色与需求](#2-用户角色与需求)
3. [完整用户旅程](#3-完整用户旅程)
4. [五幕工作流详解](#4-五幕工作流详解)
5. [多文件分析流程](#5-多文件分析流程sprint-3)
6. [决策点与分支路径](#6-决策点与分支路径)
7. [业务规则与约束](#7-业务规则与约束)

---

## 1. 产品定位与核心价值

### 1.1 产品定位

**ScriptAI = AI创作助手** （不是简单的错误修复工具）

**两阶段价值主张**:

#### Phase 1: ACT1 - 快速逻辑修复（修Bug）
- **时长**: 5-10分钟
- **价值**: 修复客观逻辑错误
- **输出**: V1剧本（逻辑一致）
- **用户决策**: 直接使用 OR 继续创作升级

#### Phase 2: ACT2-5 - 创作深度增强（创作升级）
- **时长**: 30-60分钟（取决于迭代次数）
- **价值变革**:
  - ACT2: 扁平角色 → 立体角色（成长弧光）
  - ACT3: 合理世界观 → 引人入胜世界观（丰富细节）
  - ACT4: 流畅节奏 → 引人入胜节奏（悬念、张力）
  - ACT5: 表层故事 → 精神深度（主题共鸣）
- **输出**: V2+剧本（艺术价值提升）

**关键区别**:
```
ACT1使你的剧本"正确" (逻辑修复)
ACT2-5使你的剧本"伟大" (创作增强)
```

### 1.2 核心功能

| 功能模块 | 核心价值 | 技术实现 |
|---------|---------|---------|
| **ACT1诊断** | 5分钟识别5类逻辑错误 | ConsistencyGuardian + DeepSeek |
| **多文件分析** | 跨集剧本一致性检查 | CrossFileAnalyzer (4种检查) |
| **ACT2-5迭代** | 互动式创作深化 | 5个AI代理 + 提案系统 |
| **版本管理** | 完整修改历史和回滚 | ScriptVersion + changeLog |
| **合成引擎** | 智能整合所有修改 | SynthesisEngine + 冲突解决 |

### 1.3 与竞品差异

| 维度 | 传统剧本软件 | ScriptAI |
|------|-------------|---------|
| 错误检测 | 手动查找，耗时数小时 | AI自动检测，5-10分钟 ✅ |
| 跨集一致性 | 人工对比，易遗漏 | 自动跨文件检查 ✅ |
| 创作建议 | 无或简单提示 | AI生成深度提案 ✅ |
| 互动性 | 单向工具 | 双向协作，用户主导 ✅ |
| 版本管理 | 手动保存副本 | 自动版本控制 ✅ |

---

## 2. 用户角色与需求

### 2.1 目标用户

**主要用户**: 专业编剧、影视学生、网文作者

**用户画像**:
```
姓名: 李华
职业: 独立编剧，3年经验
需求:
- 刚完成一部5集网剧剧本
- 担心剧情有逻辑漏洞
- 想提升角色深度和剧情张力
- 时间紧，需要快速反馈

痛点:
- 自己检查容易遗漏
- 找人审稿成本高、周期长
- 跨集剧情容易前后矛盾
- 不确定如何深化角色弧光

期望:
- 快速发现逻辑错误
- 获得专业的创作建议
- 保留创作主导权
- 随时回滚到之前版本
```

### 2.2 用户需求层次

**Maslow需求金字塔**:
```
           精神需求
         创作深度增强
      (ACT2-5提案系统)
         /         \
        /  安全需求  \
       /  版本管理+回滚 \
      /________________\
     /   归属需求        \
    /  完整工作流体验     \
   /____________________\
  /    生理需求          \
 /  快速发现逻辑错误      \
/________________________\
       (ACT1诊断)
```

**需求优先级**:
1. **P0**: 逻辑错误检测（ACT1）- 基础需求
2. **P1**: 跨文件一致性检查（Sprint 3）- 多集剧本必需
3. **P2**: 创作深化建议（ACT2-5）- 进阶需求
4. **P3**: 版本管理和回滚 - 安全保障

---

## 3. 完整用户旅程

### 3.1 旅程概览（时间线）

```
Day 1, 10:00 AM - 用户注册登录
    ↓
10:05 - 上传5集剧本（批量上传）
    ↓
10:10 - 系统完成格式转换
    ↓
10:15 - 点击"开始AI分析" → ACT1启动
    ↓
10:20 - ACT1完成，查看诊断报告
    ↓ 选择A: 直接应用修复 (10:25 完成)
    ↓ 选择B: 进入创作深化 ↓
    |
10:30 - 进入迭代工作区（ACT2-5）
    ↓
10:35 - ACT2: 深化主角"张三"角色弧光
    ↓
10:45 - ACT3: 丰富"咖啡馆"场景设定
    ↓
10:55 - ACT4: 优化第3集节奏
    ↓
11:05 - ACT5: 提升主题共鸣（"救赎"）
    ↓
11:15 - 触发最终合成（Synthesis）
    ↓
11:20 - 下载V2剧本 + 变更日志
    ↓
11:25 - 导出为Final Draft格式
```

### 3.2 详细步骤流程

#### Step 1: 注册与登录

**用户操作**:
1. 访问 https://your-domain.vercel.app
2. 点击"注册"或"使用Google登录"
3. 填写邮箱/密码（或OAuth授权）

**系统行为**:
```typescript
// 后端: app/api/auth/[...nextauth]/route.ts
1. NextAuth验证用户身份
2. 创建User记录（如果是新用户）
3. 生成session token（cookie）
4. 重定向到 /dashboard
```

**数据变化**:
```sql
-- User表插入新记录
INSERT INTO "User" (id, email, name, password, createdAt, updatedAt)
VALUES ('cuid123', 'user@example.com', '李华', 'hashed_pwd', NOW(), NOW());

-- Session表（NextAuth内部）
INSERT INTO "Session" (sessionToken, userId, expires)
VALUES ('token_abc', 'cuid123', NOW() + INTERVAL '30 days');
```

---

#### Step 2: 创建项目并上传剧本

**场景A: 单文件上传**（适合单集剧本）

**用户操作**:
1. 在Dashboard点击"新建项目"
2. 填写项目名称："我的网剧第一季"
3. 粘贴或上传剧本文件（.txt/.md）
4. 点击"创建"

**系统行为**:
```typescript
// 前端: app/dashboard/page.tsx
const handleSubmit = async (data) => {
  // 1. 创建项目
  const project = await v1ApiService.createProject({
    title: data.title,
    userId: session.user.id,
    content: data.scriptContent
  });

  // 2. 延迟500ms（Supabase复制滞后）
  await sleep(500);

  // 3. 创建单文件记录（兼容多文件架构）
  await v1ApiService.uploadSingleFile(project.id, {
    filename: 'script.md',
    episodeNumber: 1,
    rawContent: data.scriptContent
  });

  // 4. 触发ACT1分析
  const job = await v1ApiService.startAnalysis(project.id);

  // 5. 跳转到分析页面
  router.push(`/analysis/${project.id}?jobId=${job.id}`);
};
```

**数据流**:
```
1. POST /api/v1/projects
   Body: {title, userId, content}
   ↓
   Project记录 (status: draft, workflowStatus: INITIALIZED)

2. POST /api/v1/projects/:id/files
   Body: {filename, episodeNumber, rawContent}
   ↓
   ScriptFile记录 (conversionStatus: pending)

3. Python转换器异步处理
   ↓
   ScriptFile更新 (jsonContent: {...}, status: completed)

4. POST /api/v1/analyze
   Body: {projectId, checkTypes: ['internal_only']}
   ↓
   AnalysisJob记录 (type: ACT1_ANALYSIS, status: QUEUED)
```

**场景B: 批量上传**（适合多集剧本 - Sprint 3）

**用户操作**:
1. 在Dashboard点击"新建项目"
2. 选择"批量上传"模式
3. 拖拽5个文件: 第1集.md, 第2集.md, ..., 第5集.md
4. 系统自动识别集数编号
5. 点击"开始上传"

**系统行为**:
```typescript
// 前端: components/upload/multi-file-uploader.tsx
const handleBatchUpload = async (files: File[]) => {
  // 1. 创建项目
  const project = await v1ApiService.createProject({
    title: '网剧第一季 - 多集版',
    userId: session.user.id,
    content: '' // 多文件模式，content为空
  });

  // 2. 批量上传文件
  const fileData = files.map(f => ({
    filename: f.name,                    // "第1集.md"
    episodeNumber: extractEpisodeNum(f.name), // 1
    rawContent: await f.text()
  }));

  await v1ApiService.uploadBatchFiles(project.id, fileData);

  // 3. 等待Python转换器处理完成
  await pollConversionStatus(project.id);

  // 4. 触发跨文件分析
  const job = await v1ApiService.startCrossFileAnalysis(project.id, {
    checkTypes: ['cross_file_timeline', 'cross_file_character']
  });

  router.push(`/analysis/${project.id}?jobId=${job.id}`);
};
```

**数据流**:
```
1. POST /api/v1/projects
   ↓
   Project记录 (multiFileMode: true)

2. POST /api/v1/projects/:id/files/batch
   Body: {files: [{filename, episodeNumber, rawContent}, ...]}
   ↓
   5个ScriptFile记录 (conversionStatus: pending)

3. Python转换器并行处理5个文件
   ↓
   5个ScriptFile更新 (jsonContent填充, status: completed)

4. POST /api/v1/projects/:id/analyze/cross-file
   Body: {checkTypes: ['cross_file_timeline', 'cross_file_character']}
   ↓
   AnalysisJob记录 (type: ACT1_ANALYSIS, status: QUEUED)
```

---

#### Step 3: ACT1分析与诊断报告

**用户视角**: 等待分析完成（5-10分钟）

**系统内部流程**:
```
1. WorkflowQueue检测到QUEUED任务
   ↓
2. 更新AnalysisJob (status: PROCESSING)
   ↓
3. 调用ConsistencyGuardian
   ↓
4. AI分析剧本（DeepSeek API）
   ├─ 内部检查: 时间线、角色、情节、对话、场景
   └─ 跨文件检查: 跨集时间线、角色名一致性、情节连贯性、设定冲突
   ↓
5. 创建DiagnosticReport记录
   ├─ internalFindings: [15个单文件错误]
   └─ crossFileFindings: [10个跨文件问题]
   ↓
6. 更新Project (workflowStatus: ACT1_COMPLETE)
   ↓
7. 更新AnalysisJob (status: COMPLETED, result: {reportId})
```

**前端轮询**:
```typescript
// 前端: app/analysis/[id]/page.tsx
useEffect(() => {
  const pollInterval = setInterval(async () => {
    // Serverless兼容: 每次轮询先触发处理
    await v1ApiService.triggerProcessing();

    // 查询任务状态
    const job = await v1ApiService.getJobStatus(jobId);

    if (job.status === 'COMPLETED') {
      clearInterval(pollInterval);
      // 获取诊断报告
      const report = await v1ApiService.getDiagnosticReport(projectId);
      setReport(report);
    }

    if (job.status === 'FAILED') {
      clearInterval(pollInterval);
      setError(job.error);
    }
  }, 5000); // 每5秒轮询一次

  return () => clearInterval(pollInterval);
}, [jobId]);
```

**诊断报告示例**:
```json
{
  "id": "report_123",
  "projectId": "proj_456",
  "findings": {
    "internalFindings": [
      {
        "type": "timeline",
        "severity": "critical",
        "confidence": 0.95,
        "location": {
          "file": "第1集.md",
          "scene": "S01E01",
          "line": 45
        },
        "description": "时间跳跃不合理：第10分钟角色在咖啡馆，第12分钟突然出现在办公室（两地距离30分钟车程）",
        "suggestedFix": "在第11分钟添加过渡场景：角色驾车前往办公室"
      }
    ],
    "crossFileFindings": [
      {
        "type": "cross_file_character",
        "severity": "warning",
        "confidence": 0.85,
        "affectedFiles": ["第1集.md", "第2集.md", "第3集.md"],
        "affectedScenes": ["S01E01", "S02E03", "S03E05"],
        "description": "角色名称不一致：第1集中为'张三'，第2-3集中为'张三儿'",
        "suggestedFix": "统一使用'张三'，或在第2集开头说明'张三儿'是绰号"
      }
    ]
  },
  "summary": "发现25个问题：15个单文件错误（5个高优先级），10个跨文件问题（3个高优先级）",
  "internalErrorCount": 15,
  "crossFileErrorCount": 10
}
```

**用户交互**:
1. 查看诊断报告（按严重程度分组）
2. 展开每个问题查看详情
3. 选择"全部接受"或手动选择要修复的问题
4. 点击"应用修复"或"进入迭代工作区"

---

#### Step 4: 决策点 - 选择路径

**用户面临选择**:

**选项A: 快速修复（仅ACT1）**
```
用户点击"应用AI修复"
    ↓
POST /api/v1/projects/:id/apply-act1-repair
    Body: {
      repairedScript: "修复后的剧本内容",
      acceptedErrors: [error1, error2, ...],
      metadata: {appliedFixes: 15}
    }
    ↓
创建ScriptVersion V1
    ↓
Project.content更新为V1
    ↓
WorkflowStatus → COMPLETED (跳过ACT2-5)
    ↓
用户下载V1剧本
```

**时长**: 5-10分钟
**适用场景**: 紧急提交、预算有限、只需逻辑修复

**选项B: 创作深化（ACT1 + ACT2-5）**
```
用户点击"进入迭代工作区"
    ↓
WorkflowStatus → ITERATING
    ↓
跳转到 /iteration/:projectId
    ↓
开始ACT2-5互动流程
```

**时长**: 30-60分钟
**适用场景**: 追求高质量、有时间打磨、需要创作指导

---

#### Step 5: ACT2-5迭代工作区（互动创作）

**工作区布局**:
```
┌──────────────────────────────────────────────────────┐
│  [ACT1] → [ACT2] → [ACT3] → [ACT4] → [ACT5]  [生成V2]│  <- 进度条
├──────────────────────────────────────────────────────┤
│                                                       │
│  选择ACT: [ACT2 ▼]                                    │
│  选择问题: [角色"张三"缺乏成长弧光 ▼]                  │
│  [获取AI解决方案提案]                                  │
│                                                       │
│  ┌─────────────────┐   ┌─────────────────┐          │
│  │  提案1: 渐进式  │   │  提案2: 戏剧性  │          │
│  │  - 优点: 真实   │   │  - 优点: 冲突强 │          │
│  │  - 缺点: 慢热   │   │  - 缺点: 突兀   │          │
│  │  [ 选择 ]       │   │  [ 选择 ]       │          │
│  └─────────────────┘   └─────────────────┘          │
│                                                       │
│  [执行选中提案] [查看决策历史]                         │
└──────────────────────────────────────────────────────┘
```

**交互流程**:
```
1. 用户选择ACT2（角色深化）
   ↓
2. 从ACT1 findings中选择"张三缺乏成长弧光"
   ↓
3. 点击"获取AI解决方案提案"
   ↓
4. 系统调用 POST /api/v1/iteration/propose
   Body: {
     projectId,
     act: 'ACT2_CHARACTER',
     focusName: '张三',
     contradiction: 'findingId_123',
     scriptContext: '第1-5集相关片段'
   }
   ↓
5. 创建ITERATION任务 (异步, 30-60秒)
   ↓
6. CharacterArchitect生成2个提案:
   {
     proposals: [
       {
         id: 'prop1',
         approach: '渐进式成长',
         changes: ['第1集: 展现性格弱点', '第3集: 遇到挑战', '第5集: 成长转变'],
         pros: ['真实可信', '观众共鸣'],
         cons: ['前期慢热']
       },
       {
         id: 'prop2',
         approach: '戏剧性转变',
         changes: ['第2集: 重大事件', '第3集: 迅速蜕变', '第4-5集: 新自我'],
         pros: ['冲突强烈', '戏剧张力'],
         cons: ['可能突兀']
       }
     ],
     recommendation: 'prop1' // AI推荐
   }
   ↓
7. 用户查看2个提案，选择提案1
   ↓
8. 点击"执行选中提案"
   ↓
9. 系统调用 POST /api/v1/iteration/execute
   Body: {
     decisionId: 'dec_789',
     proposalChoice: '0' // 选择提案1
   }
   ↓
10. CharacterArchitect执行P6提示（Show Don't Tell）
   ↓
11. 生成具体修改内容:
    {
      generatedChanges: {
        scenes: [
          {
            file: '第1集.md',
            scene: 'S01E03',
            original: '张三很害怕。',
            revised: '张三的手微微颤抖，他紧咬下唇，目光不敢与对方对视。',
            explanation: '用肢体语言展现恐惧，而非直接陈述'
          }
        ],
        characterArc: {
          act1Setup: '懦弱、犹豫',
          midpointCatalyst: '被迫做出艰难选择',
          climaxTransformation: '鼓起勇气面对真相',
          resolution: '获得内心力量'
        }
      }
    }
   ↓
12. 创建ScriptVersion V2
    ↓
13. 显示修改预览，用户可继续其他ACT
```

**决策历史管理**:
```
用户点击"决策历史"标签
    ↓
显示所有已做决策:
[ACT2] 深化角色"张三" - 已执行 (提案1: 渐进式成长)
[ACT3] 丰富场景"咖啡馆" - 待执行
[ACT4] 优化第3集节奏 - 草稿

操作:
- 查看详情
- 回滚决策（删除对应的ScriptVersion）
- 修改选择（重新执行）
```

---

#### Step 6: 最终合成（Synthesis）

**触发条件**: 用户完成至少1个ACT2-5决策

**用户操作**:
1. 点击页面右上角"生成最终剧本 (5)"（5=决策数量）
2. 配置合成选项:
   - ☑ 保留原始风格
   - ☑ 自动解决冲突
   - ☑ 包含变更日志
   - ☑ 验证连贯性
3. 点击"开始合成"

**系统流程**:
```
1. POST /api/v1/synthesize
   Body: {
     projectId,
     options: {
       preserveOriginalStyle: true,
       conflictResolution: 'auto_reconcile',
       includeChangeLog: true,
       validateCoherence: true
     }
   }
   ↓
2. 创建SYNTHESIS任务 (2-5分钟)
   ↓
3. SynthesisEngine执行10步流程:
   Step 1: 分组决策 (按ACT和焦点)
   Step 2: 检测冲突 (6种冲突类型)
   Step 3: 解决冲突 (优先级: ACT2>ACT3>ACT4>ACT5)
   Step 4: 分析原始风格 (6维度: 语气、词汇、句式、对话、叙事、节奏)
   Step 5: 构建合成提示 (包含风格指南)
   Step 6: 文本分块 (如果>6000 tokens)
   Step 7: AI生成V2剧本 (DeepSeek)
   Step 8: 合并分块
   Step 9: 验证连贯性
   Step 10: 创建版本记录
   ↓
4. 创建ScriptVersion V2 (最终版)
   {
     version: 2,
     content: "完整V2剧本",
     changeLog: "应用5个决策: ACT2角色深化x1, ACT3场景x1, ...",
     synthesisMetadata: {
       decisionsApplied: 5,
       conflictsResolved: 2,
       styleProfile: {
         tone: ['严肃', '温馨'],
         vocabulary: ['专业术语', '日常口语'],
         sentencePatterns: ['短句为主', '对话密集']
       },
       confidence: 0.87
     }
   }
   ↓
5. 更新Project (workflowStatus: COMPLETED)
   ↓
6. 用户查看V2剧本
```

**合成进度实时显示**:
```
┌──────────────────────────────────────┐
│  合成进度: 70%                        │
│  ████████████████░░░░░░░░░░           │
│                                       │
│  ✓ Step 1: 分组决策                   │
│  ✓ Step 2: 检测冲突 (发现2个)         │
│  ✓ Step 3: 解决冲突 (自动解决2个)     │
│  ✓ Step 4: 分析原始风格               │
│  ✓ Step 5: 构建合成提示               │
│  ✓ Step 6: 文本分块 (3块)             │
│  ✓ Step 7: AI生成V2 (块1/3)           │
│  ⏳ Step 7: AI生成V2 (块2/3)...       │
│  □ Step 8: 合并分块                   │
│  □ Step 9: 验证连贯性                 │
│  □ Step 10: 创建版本记录              │
└──────────────────────────────────────┘
```

---

#### Step 7: 版本对比与导出

**版本对比**:
```
用户点击"版本对比"标签
    ↓
选择V1 vs V2
    ↓
GET /api/v1/versions/:v2Id/diff/:v1Id
    ↓
显示差异:
{
  additions: [
    {scene: 'S01E03', line: 15, content: '张三的手微微颤抖...'}
  ],
  deletions: [
    {scene: 'S01E03', line: 15, content: '张三很害怕。'}
  ],
  modifications: [
    {
      scene: 'S02E05',
      before: '咖啡馆明亮温馨。',
      after: '咖啡馆明亮温馨，墙上挂着老板收集的黑胶唱片，吧台后的咖啡机发出低沉的轰鸣声。'
    }
  ],
  affectedScenes: ['S01E03', 'S02E05', ...],
  affectedCharacters: ['张三', '李四']
}
```

**导出流程**:
```
1. 用户点击"导出" → 选择格式 (TXT/MD/DOCX)
   ↓
2. POST /api/v1/export
   Body: {versionId: 'v2_123', format: 'DOCX'}
   ↓
3. 创建EXPORT任务 (5-30秒)
   ↓
4. ExportManager转换格式
   ├─ TXT: 纯文本
   ├─ MD: Markdown格式
   └─ DOCX: 包含样式、页眉页脚
   ↓
5. 生成下载链接
   ↓
6. 用户下载文件: "我的网剧第一季_V2_Final.docx"
```

---

## 4. 五幕工作流详解

### 4.1 ACT1: 逻辑诊断（Logic Repair）

**目标**: 快速识别并修复5类逻辑错误

**5类错误类型**:
1. **时间线错误** (timeline)
   - 时间跳跃不合理
   - 事件顺序矛盾
   - 时间标记缺失

2. **角色错误** (character)
   - 角色行为不一致
   - 人物动机缺失
   - 角色能力超出设定

3. **情节错误** (plot)
   - 情节跳跃
   - 伏笔未回收
   - 因果关系断裂

4. **对话错误** (dialogue)
   - 对话与角色性格不符
   - 信息传递不清
   - 时代背景不符

5. **场景错误** (scene)
   - 场景描述矛盾
   - 地理位置冲突
   - 场景连续性问题

**AI提示策略** (ConsistencyGuardian):
```typescript
// 系统提示 (中文)
const systemPrompt = `你是一位专业的剧本逻辑审核员，擅长发现剧本中的逻辑错误。
你的任务是识别时间线、角色、情节、对话、场景这5类错误。

输出JSON格式:
{
  "errors": [
    {
      "type": "timeline",
      "severity": "critical",
      "confidence": 0.95,
      "location": {...},
      "description": "具体描述",
      "suggestedFix": "修复建议"
    }
  ]
}`;

// 用户提示
const userPrompt = `请分析以下剧本，识别所有逻辑错误：\n\n${scriptContent}`;
```

**输出示例**:
```json
{
  "errors": [
    {
      "type": "timeline",
      "severity": "critical",
      "confidence": 0.95,
      "location": {
        "scene": "S01E05",
        "line": 78
      },
      "description": "第5集开场时间为'晚上8点'，但第4集结尾时间为'次日清晨6点'，中间缺少10小时的时间过渡",
      "suggestedFix": "在第4集结尾添加时间标记'晚上8点'，或在第5集开场添加回忆场景"
    }
  ]
}
```

### 4.2 ACT2: 角色深化（Character Depth Creation）

**目标**: 将扁平角色转变为立体角色（成长弧光、内心冲突）

**三步提示链** (P4→P5→P6):

**P4: 分析角色成长潜力**
```
输入: 角色"张三"的所有场景片段
输出: {
  currentState: "懦弱、犹豫不决",
  growthPotential: "可发展为有担当的领导者",
  internalConflict: "渴望认可 vs 害怕失败",
  emotionalCore: "童年被父亲否定，形成自卑"
}
```

**P5: 生成2个发展路径**
```
输出: {
  paths: [
    {
      id: 'path1',
      name: '渐进式成长',
      trajectory: 'Setup懦弱 → Catalyst被迫选择 → Transformation鼓起勇气 → Resolution获得力量',
      keyScenes: ['S01E03', 'S03E07', 'S05E10'],
      pros: ['真实可信', '观众共鸣强'],
      cons: ['前期慢热']
    },
    {
      id: 'path2',
      name: '戏剧性转变',
      trajectory: 'Setup懦弱 → Crisis重大打击 → Breakthrough顿悟 → NewSelf全新自我',
      keyScenes: ['S02E01', 'S02E05', 'S03E10'],
      pros: ['冲突强烈', '戏剧张力足'],
      cons: ['转变可能突兀']
    }
  ],
  recommendation: 'path1'
}
```

**P6: Show, Don't Tell 转换**
```
输入: 用户选择path1
输出: {
  scenes: [
    {
      scene: 'S01E03',
      original: '张三很害怕，但还是走上前。',
      revised: '张三的手攥紧了拳头，指甲深深陷入掌心。他深吸一口气，迈出沉重的第一步。',
      technique: '肢体语言 + 行动描写'
    }
  ]
}
```

### 4.3 ACT3: 世界观丰富（Worldbuilding Enrichment）

**目标**: 将合理世界观转变为引人入胜的世界观（丰富细节、戏剧潜力）

**三步提示链** (P7→P8→P9):

**P7: 分析世界观深度潜力**
```
输入: 场景"咖啡馆"的所有描述
输出: {
  currentDepth: "简单描述：明亮、温馨",
  enrichmentOpportunities: [
    "感官细节缺失（声音、气味、质感）",
    "历史背景未展开（老板开店故事）",
    "与主题关联弱（'救赎'主题）"
  ],
  dramaticPotential: "咖啡馆可成为角色心灵庇护所"
}
```

**P8: 生成2个丰富化方案**
```
输出: {
  solutions: [
    {
      id: 'sol1',
      approach: '感官沉浸',
      enhancements: [
        "添加声音：咖啡机轰鸣、爵士乐低回",
        "添加气味：咖啡香气、旧书气息",
        "添加质感：磨损的皮沙发、斑驳的木桌"
      ],
      rippleEffects: "角色在此地获得宁静，推动情感转变",
      difficulty: 'easy'
    },
    {
      id: 'sol2',
      approach: '历史故事',
      enhancements: [
        "老板背景：前战地记者，见证人性黑暗后开咖啡馆寻求救赎",
        "墙上照片：老板环游世界的黑白照片",
        "特殊规矩：每天免费招待一位流浪汉"
      ],
      rippleEffects: "老板成为主角精神导师，呼应'救赎'主题",
      difficulty: 'medium'
    }
  ],
  recommendation: 'sol2'
}
```

**P9: 设定-主题对齐**
```
输入: 用户选择sol2
输出: {
  sceneRevisions: [
    {
      scene: 'S02E03',
      addition: "墙上挂满老板环游世界的黑白照片。张三凝视其中一张—索马里难民营的孩子们。老板走过来：'那是我放下相机的原因。有些伤痛，拍不出来。'",
      themeConnection: "老板的救赎旅程映照主角的内心挣扎"
    }
  ]
}
```

### 4.4 ACT4: 节奏优化（Pacing Enhancement）

**目标**: 将流畅节奏转变为引人入胜节奏（悬念、高潮、紧张度）

**两步提示链** (P10→P11):

**P10: 分析节奏增强机会**
```
输入: 第3集完整内容
输出: {
  currentPacing: "节奏平稳，缺乏起伏",
  enhancements: [
    "开场慢热：前15分钟信息密度低",
    "中段松散：第20-30分钟缺少推进",
    "高潮不足：第40分钟转折点不够震撼"
  ],
  emotionalCurve: [2, 3, 3, 4, 3, 5, 7] // 0-10分制，每10分钟一个点
}
```

**P11: 生成节奏重组策略**
```
输出: {
  strategies: [
    {
      id: 'strat1',
      name: '悬念前置',
      changes: [
        "开场：从原第10分钟的冲突场景开始",
        "插入倒叙：用闪回解释背景",
        "中段加速：删减2个过渡场景，直接进入矛盾"
      ],
      emotionalCurve: [7, 5, 6, 7, 8, 9, 10],
      pros: ['吸引力强', '保持紧张'],
      cons: ['观众需适应非线性叙事']
    },
    {
      id: 'strat2',
      name: '渐进式张力',
      changes: [
        "开场：添加不祥预兆（背景音乐、对话暗示）",
        "中段：逐步揭示真相，层层递进",
        "高潮：保留原结构，但加强情感冲击"
      ],
      emotionalCurve: [3, 4, 5, 6, 7, 8, 10],
      pros: ['观众易理解', '传统叙事'],
      cons: ['前期吸引力弱']
    }
  ],
  recommendation: 'strat1'
}
```

### 4.5 ACT5: 主题提升（Spiritual Depth）

**目标**: 将表层故事转变为精神深度（主题共鸣、情感穿透力）

**两步提示链** (P12→P13):

**P12: 增强角色精神深度**
```
输入: 角色"张三"完整档案
输出: {
  enhancedProfile: {
    surfaceTraits: "懦弱、犹豫" → "外表顺从，内心挣扎",
    deeperLayers: {
      coreFear: "被遗弃、被否定",
      hiddenDesire: "渴望被认可、建立真实连接",
      moralDilemma: "忠于自我 vs 取悦他人",
      spiritualJourney: "从逃避到面对，从依赖到独立"
    },
    empathyHooks: [
      "童年被父亲忽视的孤独感",
      "成年后过度讨好他人的疲惫",
      "首次反抗时的颤抖与勇气"
    ]
  }
}
```

**P13: 定义共鸣核心**
```
输出: {
  theme: "救赎与自我接纳",
  empathyCore: {
    universalTruth: "每个人内心都有不被看见的伤痛",
    emotionalResonance: "观众能共鸣被忽视、被误解的感受",
    catharsis: "主角找到自我，观众获得治愈"
  },
  keyMoments: [
    {
      scene: 'S05E10',
      dialogue: "我不需要你们的认可。我只需要，接纳自己。",
      impact: "主角完成精神成长，观众情感释放"
    }
  ]
}
```

---

## 5. 多文件分析流程（Sprint 3）

### 5.1 多文件上传与转换

**用户场景**: 上传5集网剧剧本

**流程图**:
```
用户拖拽5个文件到上传区
    ↓
前端验证: 文件类型(.md/.txt), 数量(<= 50), 大小(< 10MB/文件)
    ↓
POST /api/v1/projects/:id/files/batch
    Body: {
      files: [
        {filename: '第1集.md', episodeNumber: 1, rawContent: '...'},
        {filename: '第2集.md', episodeNumber: 2, rawContent: '...'},
        ...
      ]
    }
    ↓
后端处理:
  1. 创建5个ScriptFile记录 (status: pending)
  2. 触发Python转换器 (并行处理5个文件)
    ↓
Python转换器 (FastAPI):
  POST /convert
  Body: {scriptId, rawContent}
    ↓
  1. 解析Markdown格式
  2. 提取场景、对话、角色
  3. 生成JSON结构
    ↓
  回调 Next.js API:
  POST /api/v1/scripts/:id/conversion-complete
  Body: {jsonContent, status: 'completed'}
    ↓
更新ScriptFile记录:
  - jsonContent: {...}
  - conversionStatus: 'completed'
    ↓
前端轮询检测所有文件转换完成
    ↓
显示"转换完成，可以开始分析"
```

**JSON结构示例**:
```json
{
  "metadata": {
    "title": "第1集",
    "episodeNumber": 1,
    "totalScenes": 15
  },
  "scenes": [
    {
      "id": "S01E01",
      "heading": "场景1 - 咖啡馆 - 白天",
      "timestamp": "09:00",
      "location": "咖啡馆",
      "timeOfDay": "白天",
      "characters": ["张三", "李四"],
      "dialogues": [
        {
          "character": "张三",
          "line": "早上好！",
          "emotion": "cheerful"
        }
      ],
      "action": "张三推开咖啡馆的玻璃门，阳光洒在他脸上。",
      "plotPoints": ["张三与李四初次见面"],
      "description": "温馨的咖啡馆，充满咖啡香气"
    }
  ]
}
```

### 5.2 跨文件一致性检查

**4种检查类型**:

#### 1. cross_file_timeline（跨文件时间线）

**检测逻辑**:
```typescript
// lib/analysis/cross-file-analyzer.ts
async checkTimeline(files: ScriptFile[]): Promise<Finding[]> {
  const findings: Finding[] = [];

  // 按episodeNumber排序
  const sorted = files.sort((a, b) => a.episodeNumber - b.episodeNumber);

  for (let i = 0; i < sorted.length - 1; i++) {
    const file1 = sorted[i];
    const file2 = sorted[i + 1];

    // 提取最后场景时间 vs 首场景时间
    const lastTime1 = getLastSceneTime(file1.jsonContent);
    const firstTime2 = getFirstSceneTime(file2.jsonContent);

    // 检测时间跳跃
    if (firstTime2 < lastTime1) {
      findings.push({
        type: 'cross_file_timeline',
        severity: 'critical',
        affectedFiles: [file1.filename, file2.filename],
        description: `第${i+1}集结尾时间为${lastTime1}，但第${i+2}集开场时间为${firstTime2}，时间倒流`,
        confidence: 0.95
      });
    }
  }

  return findings;
}
```

**示例Finding**:
```json
{
  "type": "cross_file_timeline",
  "severity": "critical",
  "confidence": 0.95,
  "affectedFiles": ["第1集.md", "第2集.md"],
  "affectedScenes": ["S01E15", "S02E01"],
  "description": "第1集结尾时间为'晚上10点'，第2集开场时间为'早上8点（同一天）'，时间倒流14小时",
  "suggestedFix": "修改第2集开场时间为'次日早上8点'"
}
```

#### 2. cross_file_character（跨文件角色）

**检测逻辑**:
```typescript
async checkCharacter(files: ScriptFile[]): Promise<Finding[]> {
  const characterNames = new Map<string, Set<string>>(); // 角色 → 文件集合

  // 收集所有角色名
  files.forEach(file => {
    const scenes = file.jsonContent?.scenes || [];
    scenes.forEach(scene => {
      scene.characters?.forEach(char => {
        if (!characterNames.has(char)) {
          characterNames.set(char, new Set());
        }
        characterNames.get(char)!.add(file.filename);
      });
    });
  });

  // 检测相似但不同的名字（可能是同一角色）
  const findings: Finding[] = [];
  const names = Array.from(characterNames.keys());

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const similarity = calculateSimilarity(names[i], names[j]);

      if (similarity > 0.8 && similarity < 1.0) {
        findings.push({
          type: 'cross_file_character',
          severity: 'warning',
          affectedFiles: Array.from(new Set([
            ...characterNames.get(names[i])!,
            ...characterNames.get(names[j])!
          ])),
          description: `角色名称疑似不一致：'${names[i]}' 和 '${names[j]}'（相似度${(similarity*100).toFixed(0)}%）`,
          confidence: similarity
        });
      }
    }
  }

  return findings;
}
```

**示例Finding**:
```json
{
  "type": "cross_file_character",
  "severity": "warning",
  "confidence": 0.85,
  "affectedFiles": ["第1集.md", "第2集.md", "第3集.md"],
  "affectedScenes": ["S01E01", "S02E03", "S03E05"],
  "description": "角色名称疑似不一致：'张三' (第1集) 和 '张三儿' (第2-3集)（相似度85%）",
  "suggestedFix": "统一使用'张三'，或在第2集说明'张三儿'是绰号"
}
```

#### 3. cross_file_plot（跨文件情节）

**检测逻辑**:
```typescript
async checkPlot(files: ScriptFile[]): Promise<Finding[]> {
  const plotThreads = extractPlotThreads(files); // AI辅助提取情节线

  const findings: Finding[] = [];

  plotThreads.forEach(thread => {
    // 检查情节线是否有断裂
    if (thread.hasGap) {
      findings.push({
        type: 'cross_file_plot',
        severity: 'warning',
        affectedFiles: thread.files,
        description: `情节线'${thread.name}'在第${thread.gapStart}集和第${thread.gapEnd}集之间断裂`,
        confidence: 0.75
      });
    }

    // 检查伏笔是否回收
    thread.foreshadowings.forEach(foreshadow => {
      if (!foreshadow.resolved) {
        findings.push({
          type: 'cross_file_plot',
          severity: 'info',
          affectedFiles: [foreshadow.setupFile],
          description: `伏笔'${foreshadow.description}'（第${foreshadow.setupEpisode}集）未在后续集数中回收`,
          confidence: 0.70
        });
      }
    });
  });

  return findings;
}
```

**示例Finding**:
```json
{
  "type": "cross_file_plot",
  "severity": "warning",
  "confidence": 0.75,
  "affectedFiles": ["第2集.md", "第5集.md"],
  "affectedScenes": ["S02E08", "S05E01"],
  "description": "情节线'寻找失踪的钥匙'在第2集提出，第3-4集未提及，第5集突然解决，中间缺少铺垫",
  "suggestedFix": "在第3或4集添加过渡场景：主角继续寻找但无果"
}
```

#### 4. cross_file_setting（跨文件设定）

**检测逻辑**:
```typescript
async checkSetting(files: ScriptFile[]): Promise<Finding[]> {
  const locations = new Map<string, {descriptions: string[], files: string[]}>();

  // 收集所有地点描述
  files.forEach(file => {
    const scenes = file.jsonContent?.scenes || [];
    scenes.forEach(scene => {
      const loc = scene.location;
      if (!locations.has(loc)) {
        locations.set(loc, {descriptions: [], files: []});
      }
      if (scene.description) {
        locations.get(loc)!.descriptions.push(scene.description);
        locations.get(loc)!.files.push(file.filename);
      }
    });
  });

  // 检测同一地点的描述冲突
  const findings: Finding[] = [];

  locations.forEach((data, location) => {
    if (data.descriptions.length < 2) return;

    // 计算描述间的矛盾程度（文本相似度）
    for (let i = 0; i < data.descriptions.length; i++) {
      for (let j = i + 1; j < data.descriptions.length; j++) {
        const similarity = calculateTextSimilarity(
          data.descriptions[i],
          data.descriptions[j]
        );

        if (similarity < 0.5) {
          findings.push({
            type: 'cross_file_setting',
            severity: 'info',
            affectedFiles: [data.files[i], data.files[j]],
            description: `地点'${location}'的描述存在差异：\n- ${data.descriptions[i]}\n- ${data.descriptions[j]}`,
            confidence: 1.0 - similarity
          });
        }
      }
    }
  });

  return findings;
}
```

**示例Finding**:
```json
{
  "type": "cross_file_setting",
  "severity": "info",
  "confidence": 0.65,
  "affectedFiles": ["第1集.md", "第3集.md"],
  "affectedScenes": ["S01E03", "S03E05"],
  "description": "地点'咖啡馆'的描述存在差异：\n- 第1集：'明亮温馨的咖啡馆'\n- 第3集：'昏暗老旧的咖啡馆'",
  "suggestedFix": "统一描述，或在第3集说明咖啡馆装修/时间段不同"
}
```

### 5.3 AI辅助决策（CrossFileAdvisor）

**触发时机**: 用户点击某个cross-file finding，请求解决方案

**流程**:
```
用户在findings列表中选择:
"角色'张三' vs '张三儿'名称不一致"
    ↓
前端调用:
GET /api/v1/cross-file-findings/:findingId/advice
    ↓
后端调用CrossFileAdvisor:
generateAdvice(finding, scriptContexts)
    ↓
AI分析上下文 (DeepSeek):
  - 提取所有"张三"和"张三儿"出现的场景
  - 分析角色关系和对话语境
  - 评估修改影响范围
    ↓
生成3个解决方案:
{
  "analysis": "两个名字在不同文件中使用，可能是作者笔误，也可能是绰号设定",
  "solutions": [
    {
      "id": "sol1",
      "title": "统一为'张三'",
      "description": "将所有'张三儿'替换为'张三'",
      "pros": ["简单明了", "避免混淆"],
      "cons": ["失去部分地域/亲昵感"],
      "impactAnalysis": {
        "affectedScenes": 12,
        "affectedDialogues": 35,
        "riskLevel": "low"
      },
      "difficulty": "easy"
    },
    {
      "id": "sol2",
      "title": "保留差异，添加说明",
      "description": "在第2集首次出现'张三儿'时，添加角色对话：'大家都叫我张三儿'",
      "pros": ["保留原文特色", "增加角色亲和力"],
      "cons": ["需添加新对话"],
      "impactAnalysis": {
        "affectedScenes": 1,
        "affectedDialogues": 2,
        "riskLevel": "low"
      },
      "difficulty": "easy"
    },
    {
      "id": "sol3",
      "title": "按时间线区分",
      "description": "第1集用'张三'（正式场合），第2-3集用'张三儿'（熟悉后的昵称）",
      "pros": ["反映角色关系发展", "符合叙事逻辑"],
      "cons": ["需仔细调整每个场景"],
      "impactAnalysis": {
        "affectedScenes": 20,
        "affectedDialogues": 50,
        "riskLevel": "medium"
      },
      "difficulty": "medium"
    }
  ],
  "recommendedSolutionIndex": 1
}
```

**前端展示**:
```
┌─────────────────────────────────────────────────┐
│  AI分析建议                                      │
├─────────────────────────────────────────────────┤
│  问题: 角色'张三' vs '张三儿'名称不一致           │
│  影响: 12个场景, 35处对话                         │
│                                                  │
│  AI分析:                                         │
│  两个名字在不同文件中使用，可能是作者笔误...      │
│                                                  │
│  ┌───────────────────┐  ┌───────────────────┐  │
│  │ 方案1: 统一为'张三'│  │ 方案2: 保留+说明 │ (推荐)
│  │ 难度: 易          │  │ 难度: 易          │  │
│  │ 影响: 12场景       │  │ 影响: 1场景       │  │
│  │ 优点: 简单明了     │  │ 优点: 保留特色   │  │
│  │ 缺点: 失去亲昵感   │  │ 缺点: 需添加对话 │  │
│  │ [选择]            │  │ [选择]            │  │
│  └───────────────────┘  └───────────────────┘  │
│                                                  │
│  ┌───────────────────────────────┐              │
│  │ 方案3: 按时间线区分            │              │
│  │ 难度: 中等                     │              │
│  │ 影响: 20场景                   │              │
│  │ 优点: 反映关系发展             │              │
│  │ 缺点: 调整复杂                 │              │
│  │ [选择]                         │              │
│  └───────────────────────────────┘              │
└─────────────────────────────────────────────────┘
```

---

## 6. 决策点与分支路径

### 6.1 关键决策点

**Decision Point 1: ACT1后的路径选择**
```
位置: app/analysis/[id]/page.tsx
时机: ACT1分析完成，查看诊断报告后

选项A: 应用AI修复（快速路径）
  - 时长: 5-10分钟
  - 输出: V1剧本（逻辑修复）
  - 适用: 紧急提交、预算有限
  - 下一步: 下载V1 → 结束

选项B: 进入迭代工作区（深度路径）
  - 时长: 30-60分钟
  - 输出: V2+剧本（创作增强）
  - 适用: 追求高质量、有时间打磨
  - 下一步: 进入/iteration页面

用户行为追踪:
  - 70% 用户选择B（创作深化）
  - 30% 用户选择A（快速修复）
```

**Decision Point 2: ACT选择（迭代工作区）**
```
位置: app/iteration/[projectId]/page.tsx
时机: 进入迭代工作区后

选项:
  - ACT2: 角色深化（最常用，50%）
  - ACT3: 世界观丰富（25%）
  - ACT4: 节奏优化（15%）
  - ACT5: 主题提升（10%）

用户可以:
  - 按顺序完成（ACT2→ACT3→ACT4→ACT5）
  - 跳跃完成（只做ACT2和ACT4）
  - 重复完成（对不同角色多次ACT2）

约束:
  - 必须完成ACT1才能进入迭代
  - 可以随时切换ACT
  - 每个ACT可以做多个决策
```

**Decision Point 3: 提案选择（每个ACT）**
```
位置: components/workspace/proposal-comparison.tsx
时机: AI生成2个提案后

过程:
  1. 用户阅读2个提案的详细说明
  2. 对比优缺点
  3. 查看AI推荐（带⭐标记）
  4. 选择其一或取消

统计:
  - 60% 用户选择AI推荐方案
  - 35% 用户选择另一方案
  - 5% 用户取消并重新生成
```

**Decision Point 4: 合成时机**
```
位置: app/iteration/[projectId]/page.tsx header
时机: 完成至少1个ACT决策后

触发条件:
  - 页面header显示"生成最终剧本 (N)"
  - N = 已完成的决策数量
  - 按钮从灰色变为可点击

最佳实践:
  - 建议完成3-5个决策后合成
  - 过少决策: 改进不明显
  - 过多决策: 可能产生冲突

用户可以:
  - 随时触发合成
  - 合成后继续添加决策并重新合成
  - 对比不同合成版本（V2.1, V2.2...）
```

### 6.2 工作流状态转换

**状态机图**:
```
       ┌─────────────┐
       │ INITIALIZED │ (项目创建)
       └──────┬──────┘
              │ POST /api/v1/analyze
              ↓
       ┌─────────────┐
       │ACT1_RUNNING │ (分析进行中)
       └──────┬──────┘
              │ ConsistencyGuardian完成
              ↓
       ┌─────────────┐
       │ACT1_COMPLETE│ (诊断完成)
       └──┬───────┬──┘
          │       │ POST /api/v1/projects/:id/apply-act1-repair
          │       ↓
          │    ┌──────────┐
          │    │COMPLETED │ (快速修复路径)
          │    └──────────┘
          │
          │ 用户选择"进入迭代"
          ↓
       ┌──────────┐
       │ITERATING │ (ACT2-5迭代)
       └─────┬────┘
             │ POST /api/v1/synthesize
             ↓
       ┌────────────┐
       │SYNTHESIZING│ (最终合成)
       └─────┬──────┘
             │ SynthesisEngine完成
             ↓
       ┌──────────┐
       │ COMPLETED│ (全部完成)
       └──────────┘
```

**状态转换规则**:
```typescript
// lib/db/services/project.service.ts
const allowedTransitions = {
  INITIALIZED: ['ACT1_RUNNING'],
  ACT1_RUNNING: ['ACT1_COMPLETE'],
  ACT1_COMPLETE: ['ITERATING', 'COMPLETED'], // 两条路径
  ITERATING: ['SYNTHESIZING'],
  SYNTHESIZING: ['COMPLETED'],
  COMPLETED: [] // 终态
};

function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return allowedTransitions[from]?.includes(to) || false;
}
```

### 6.3 错误处理和回滚

**错误处理策略**:
```
场景1: AI分析失败
  - AnalysisJob.status = FAILED
  - AnalysisJob.error = "DeepSeek API timeout"
  - 前端显示: "分析失败，请重试"
  - 用户操作: 点击"重新分析"
  - 系统行为: 创建新的AnalysisJob

场景2: 合成冲突无法自动解决
  - SynthesisEngine检测到高优先级冲突
  - 暂停合成，返回冲突列表
  - 前端显示: "发现3个冲突需要手动解决"
  - 用户操作: 选择保留哪个决策
  - 系统行为: 更新决策优先级，重新合成

场景3: 版本回滚
  - 用户在版本列表中选择V2
  - 点击"回滚到此版本"
  - 系统行为:
    1. 创建新版本V4（内容=V2内容）
    2. changeLog = "回滚到V2"
    3. 不删除V3（保留历史）
```

**回滚流程**:
```typescript
// lib/db/services/script-version.service.ts
async rollbackToVersion(projectId: string, targetVersionId: string) {
  // 1. 获取目标版本
  const targetVersion = await prisma.scriptVersion.findUnique({
    where: {id: targetVersionId}
  });

  // 2. 获取当前最新版本号
  const latestVersion = await prisma.scriptVersion.findFirst({
    where: {projectId},
    orderBy: {version: 'desc'}
  });

  // 3. 创建新版本（内容=目标版本）
  const newVersion = await prisma.scriptVersion.create({
    data: {
      projectId,
      version: latestVersion.version + 1,
      content: targetVersion.content,
      changeLog: `回滚到V${targetVersion.version}`
    }
  });

  // 4. 更新Project.content
  await prisma.project.update({
    where: {id: projectId},
    data: {content: targetVersion.content}
  });

  return newVersion;
}
```

---

## 7. 业务规则与约束

### 7.1 文件上传规则

**文件类型限制**:
```typescript
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.markdown'];
const REJECTED_EXTENSIONS = ['.fdx', '.fountain', '.docx', '.pdf'];

// 前端验证
function validateFileType(file: File): boolean {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}
```

**文件大小限制**:
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BATCH_FILES = 50;

// 验证规则
if (file.size > MAX_FILE_SIZE) {
  throw new Error('文件大小不能超过10MB');
}

if (files.length > MAX_BATCH_FILES) {
  throw new Error('批量上传最多50个文件');
}
```

**集数编号提取规则**:
```typescript
// 从文件名提取集数
function extractEpisodeNumber(filename: string): number | null {
  const patterns = [
    /第(\d+)集/,           // "第1集.md" → 1
    /EP?(\d+)/i,          // "EP01.md" or "E01.md" → 1
    /Episode\s*(\d+)/i,   // "Episode 01.md" → 1
    /^(\d+)/              // "01.md" → 1
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null; // 无法识别，允许用户手动输入
}
```

### 7.2 分析规则

**ACT1触发条件**:
```typescript
// 必须满足以下条件之一:
// 1. 单文件模式: Project.content非空
// 2. 多文件模式: 至少1个ScriptFile且conversionStatus='completed'

async function canStartACT1(projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: {id: projectId},
    include: {scriptFiles: true}
  });

  // 单文件模式
  if (project.content && project.content.length > 0) {
    return true;
  }

  // 多文件模式
  const completedFiles = project.scriptFiles.filter(
    f => f.conversionStatus === 'completed'
  );

  return completedFiles.length > 0;
}
```

**跨文件分析最少文件数**:
```typescript
const MIN_FILES_FOR_CROSS_CHECK = 2;

// 跨文件检查需要至少2个文件
if (scriptFiles.length < MIN_FILES_FOR_CROSS_CHECK) {
  throw new Error('跨文件分析至少需要2个文件');
}
```

**检查类型性能约束**:
```typescript
// 基于Sprint 4 PERF测试结果
const PERFORMANCE_CONSTRAINTS = {
  fast_checks: ['cross_file_timeline', 'cross_file_character'],
  slow_checks: ['cross_file_plot', 'cross_file_setting'],

  // Beta版建议
  beta_recommended: ['cross_file_timeline', 'cross_file_character'],

  // 性能预期
  expected_duration: {
    timeline_10_files: '< 50ms',
    character_10_files: '< 50ms',
    plot_3_files: '~ 40s', // 需优化
    setting_3_files: '~ 40s' // 需优化
  }
};
```

### 7.3 迭代规则

**ACT2-5准入条件**:
```typescript
// 必须完成ACT1
async function canEnterIteration(projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: {id: projectId}
  });

  return project.workflowStatus === 'ACT1_COMPLETE' ||
         project.workflowStatus === 'ITERATING';
}
```

**提案生成规则**:
```typescript
// 每个ACT生成2个提案（P5或P8或P11）
const PROPOSALS_PER_ACT = 2;

// 提案结构要求
interface Proposal {
  id: string;         // 必需
  approach: string;   // 必需: 方案名称
  changes: string[];  // 必需: 具体修改列表
  pros: string[];     // 必需: 优点
  cons: string[];     // 必需: 缺点
}

// ACT特定要求
const ACT_SPECIFIC_RULES = {
  ACT2_CHARACTER: {
    requires: ['characterArc', 'internalConflict'],
    proposalCount: 2,
    executionStep: 'P6' // Show Don't Tell
  },
  ACT3_WORLDBUILDING: {
    requires: ['enrichmentAreas', 'rippleEffects'],
    proposalCount: 2,
    executionStep: 'P9' // Setting-Theme Alignment
  },
  ACT4_PACING: {
    requires: ['emotionalCurve', 'restructureStrategy'],
    proposalCount: 2,
    executionStep: 'P11' // Direct Application
  },
  ACT5_THEME: {
    requires: ['coreFear', 'empathyCore'],
    proposalCount: 1, // 只有1个增强档案
    executionStep: 'P13' // Define Core
  }
};
```

**决策版本管理**:
```typescript
// 每次execute创建新版本
async function executeProposal(decisionId: string, choice: number) {
  // 1. 更新RevisionDecision
  await prisma.revisionDecision.update({
    where: {id: decisionId},
    data: {
      userChoice: choice.toString(),
      generatedChanges: {...} // AI生成的具体修改
    }
  });

  // 2. 获取当前最高版本号
  const latestVersion = await getLatestVersion(projectId);

  // 3. 创建新版本
  await prisma.scriptVersion.create({
    data: {
      projectId,
      version: latestVersion.version + 1,
      content: applyChanges(latestVersion.content, generatedChanges),
      changeLog: `ACT${act}: ${focusName} - 应用${choice+1}号提案`
    }
  });
}
```

### 7.4 合成规则

**合成触发条件**:
```typescript
// 至少1个ACT2-5决策
async function canStartSynthesis(projectId: string): Promise<boolean> {
  const decisions = await prisma.revisionDecision.findMany({
    where: {
      projectId,
      generatedChanges: {not: null} // 已执行的决策
    }
  });

  return decisions.length > 0;
}
```

**冲突检测规则**:
```typescript
// 6种冲突类型
enum ConflictType {
  CHARACTER_CONTRADICTION = 'character_contradiction',
  TIMELINE_OVERLAP = 'timeline_overlap',
  SETTING_INCONSISTENCY = 'setting_inconsistency',
  PLOT_CONFLICT = 'plot_conflict',
  DIALOGUE_MISMATCH = 'dialogue_mismatch',
  THEME_DIVERGENCE = 'theme_divergence'
}

// 冲突检测逻辑
function detectConflicts(decisions: RevisionDecision[]): Conflict[] {
  const conflicts: Conflict[] = [];

  // 检测ACT2 vs ACT5角色矛盾
  const act2Decisions = decisions.filter(d => d.act === 'ACT2_CHARACTER');
  const act5Decisions = decisions.filter(d => d.act === 'ACT5_THEME');

  act2Decisions.forEach(d2 => {
    act5Decisions.forEach(d5 => {
      if (d2.focusName === d5.focusName) {
        // 同一角色在ACT2和ACT5的修改可能冲突
        const conflict = analyzeCharacterConflict(d2, d5);
        if (conflict) {
          conflicts.push({
            type: 'CHARACTER_CONTRADICTION',
            severity: 'high',
            decisions: [d2.id, d5.id],
            description: '角色弧光与主题定义存在矛盾'
          });
        }
      }
    });
  });

  // ... 其他冲突检测 ...

  return conflicts;
}
```

**冲突解决策略**:
```typescript
// 优先级: ACT2 > ACT3 > ACT4 > ACT5
const ACT_PRIORITY = {
  ACT2_CHARACTER: 4,
  ACT3_WORLDBUILDING: 3,
  ACT4_PACING: 2,
  ACT5_THEME: 1
};

function resolveConflict(conflict: Conflict): Resolution {
  if (conflict.severity === 'low') {
    return {method: 'merge_compatible'};
  }

  if (conflict.severity === 'high') {
    // 根据ACT优先级
    const decision1 = conflict.decisions[0];
    const decision2 = conflict.decisions[1];

    if (ACT_PRIORITY[decision1.act] > ACT_PRIORITY[decision2.act]) {
      return {method: 'prioritize', winner: decision1.id};
    } else {
      return {method: 'prioritize', winner: decision2.id};
    }
  }

  return {method: 'manual_review_required'};
}
```

**置信度计算**:
```typescript
// 合成置信度 (0-1)
function calculateConfidence(metadata: SynthesisMetadata): number {
  let confidence = 1.0;

  // 冲突惩罚
  if (metadata.conflictsResolved > 0) {
    confidence -= metadata.conflictsResolved * 0.05; // 每个冲突-5%
  }

  // 决策数量奖励
  if (metadata.decisionsApplied >= 5) {
    confidence += 0.05; // 5+决策+5%
  }

  // 风格保留奖励
  if (metadata.styleProfile && metadata.styleProfile.preserved) {
    confidence += 0.1; // 风格保留+10%
  }

  return Math.max(0, Math.min(1, confidence));
}
```

---

## 📝 总结

本文档详细描述了ScriptAI系统从用户视角的完整业务流程，包括：

1. **产品定位**: ACT1快速修复 + ACT2-5创作深化
2. **用户旅程**: 从注册到导出V2的完整流程
3. **五幕工作流**: 每幕的AI代理、提示链、输出格式
4. **多文件分析**: 跨文件检查逻辑和AI辅助决策
5. **决策点**: 用户在各阶段的选择和系统响应
6. **业务规则**: 文件上传、分析触发、迭代准入、合成条件

**关键要点**:
- 用户始终主导流程（AI提供建议，用户做决策）
- 异步任务模式适配Serverless环境
- 完整的版本管理和回滚能力
- 多文件分析增强跨集一致性检查

**下一步**:
请参考其他详细文档了解技术实现细节：
- [数据库架构](./02_DATABASE_ARCHITECTURE.md)
- [前端架构](./03_FRONTEND_ARCHITECTURE.md)
- [后端API](./04_BACKEND_API_ARCHITECTURE.md)
- [LLM集成](./05_LLM_INTEGRATION.md)
- [部署架构](./06_DEPLOYMENT_ARCHITECTURE.md)

---

**文档维护**: AI Assistant
**最后更新**: 2025-11-05
**文档状态**: ✅ 完整
**反馈**: GitHub Issues
