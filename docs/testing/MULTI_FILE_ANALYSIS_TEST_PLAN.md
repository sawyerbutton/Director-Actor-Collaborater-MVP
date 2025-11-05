# 多文件分析系统测试计划

**文档版本**: v1.0
**创建日期**: 2025-11-05
**Sprint**: Sprint 4 - T4.1
**状态**: 🔄 进行中

---

## 📋 测试范围

### 已实现功能（可测试）

#### 1. 后端服务层 ✅
- **ScriptFile CRUD**: lib/db/services/script-file.service.ts
- **MultiFileAnalysisService**:
  - analyzeProject()
  - analyzeCrossFileIssues()
  - getCrossFileFindings()
  - getGroupedCrossFileFindings()
- **BatchAnalyzer**: 并行批量分析
- **FindingsMerger**: 智能去重和优先级排序
- **CrossFileAnalyzer**:
  - DefaultCrossFileAnalyzer with 4 check types
  - Timeline/Character/Plot/Setting consistency checks
- **CrossFileAdvisor**: AI辅助决策生成

#### 2. API端点 ✅
- `POST /api/v1/projects/[id]/analyze/cross-file` - 跨文件分析
- `GET /api/v1/projects/[id]/cross-file-findings?grouped=true` - 获取findings

#### 3. UI组件 ✅
- **CrossFileFindingsDisplay**: 分组展示跨文件findings
- **Analysis Page**: Tabs切换（内部/跨文件问题）

### 未实现功能（测试受限）

#### 1. 多文件上传UI ❌
- **现状**: Dashboard仅支持单文件上传
- **影响**: 无法通过UI测试完整的多文件工作流
- **解决方案**:
  - 短期：使用API直接测试（集成测试）
  - 长期：实现多文件上传UI（技术债务）

#### 2. 文件管理UI ❌
- 文件列表显示
- 文件删除/重新上传
- 文件顺序调整

---

## 🧪 测试策略

### Phase 1: 单元测试 ✅ (已完成)
- ✅ T3.14: CrossFileAnalyzer单元测试 (30/37 tests passing, 7 skipped)
- ✅ Sprint 1-3单元测试（ScriptFileService, BatchAnalyzer, FindingsMerger）

### Phase 2: API集成测试 (当前Phase)
**目标**: 验证多文件分析API的完整流程

**测试用例**:

1. **TC-INT-001: 创建项目并上传多个文件**
   - 使用API直接上传3个文件
   - 验证文件存储正确
   - 验证JSON转换成功

2. **TC-INT-002: 执行内部分析（单文件检查）**
   - 调用MultiFileAnalysisService.analyzeProject()
   - 验证每个文件生成internal findings
   - 验证findings合并去重

3. **TC-INT-003: 执行跨文件分析**
   - 调用API: POST /api/v1/projects/[id]/analyze/cross-file
   - 验证检测时间线冲突
   - 验证检测角色名称不一致
   - 验证检测情节矛盾
   - 验证检测设定冲突

4. **TC-INT-004: 获取分组findings**
   - 调用API: GET /api/v1/projects/[id]/cross-file-findings?grouped=true
   - 验证按类型分组
   - 验证计数正确

5. **TC-INT-005: AI辅助决策生成**
   - 调用CrossFileAdvisor.generateAdvice()
   - 验证生成2-3个修复方案
   - 验证推荐索引有效

### Phase 3: E2E测试 (延期)
**状态**: ⏳ 等待多文件上传UI实现

**测试用例** (规划):
- E2E-MF-001: 通过UI上传多个文件
- E2E-MF-002: 查看内部findings
- E2E-MF-003: 查看跨文件findings
- E2E-MF-004: 切换分组/列表视图
- E2E-MF-005: 展开findings详情

### Phase 4: 性能测试
**目标**: 验证大文件场景性能

**测试用例**:
- PERF-001: 5个文件（每个1000-2000行）
- PERF-002: 10个文件（每个500-1000行）
- PERF-003: 单个大文件（5000行）

**性能指标**:
- 内部分析：< 120秒（5个文件）
- 跨文件分析：< 30秒
- 内存使用：< 500MB

---

## 📝 测试数据

### 测试用例数据集

#### Dataset 1: 时间线冲突
```markdown
第1集.md - 最后场景: 2024年3月10日
第2集.md - 首场景: 2024年2月28日（冲突！）
```

#### Dataset 2: 角色名称不一致
```markdown
第1集: 张三
第2集: 张三儿（相似度80%，疑似拼写错误）
第3集: 张三
```

#### Dataset 3: 情节矛盾
```markdown
第1集: 张三获得了宝物
第3集: 张三失去了宝物（但第2集没有丢失的情节）
```

#### Dataset 4: 设定矛盾
```markdown
第1集: 咖啡馆 - 宽敞明亮
第3集: 咖啡厅 - 狭窄昏暗（同一地点描述矛盾）
```

---

## 🔧 测试工具

### 单元测试
- **框架**: Jest
- **覆盖率**: ~93% (Sprint 3)
- **文件**: tests/unit/cross-file-analyzer.test.ts

### 集成测试
- **框架**: Jest + Supertest (HTTP测试)
- **环境**: PostgreSQL (本地Docker)
- **Mock**: DeepSeek API (单元测试)

### E2E测试
- **框架**: Playwright
- **浏览器**: Chromium (headless)
- **环境**: 本地开发服务器 (localhost:3000)

---

## ⚠️ 已知限制

### 1. UI测试限制
**问题**: 多文件上传UI未实现
**影响**: 无法进行完整的E2E测试
**风险**: 中等（后端功能完整，仅UI缺失）
**缓解**:
- API集成测试覆盖核心逻辑
- 单文件上传E2E测试验证UI框架
- 将多文件UI实现记录为技术债务

### 2. 测试数据生成
**问题**: 需要手动创建测试剧本
**影响**: 测试准备时间长
**缓解**: 创建测试数据生成器（helpers）

### 3. AI响应不确定性
**问题**: CrossFileAdvisor依赖AI，响应可能变化
**影响**: 测试可能不稳定
**缓解**:
- Mock AI响应（单元测试）
- 验证结构而非具体内容（集成测试）

---

## 📊 测试执行计划

### Week 1 (Day 1 - Day 2)
- [x] T4.1: API集成测试 (当前)
- [ ] T4.2: 性能测试（大文件场景）
- [ ] T4.3: 错误边界测试

### Week 2 (Day 3 - Day 4)
- [ ] T4.4: 文档完善（API文档）
- [ ] T4.5: Docker部署验证
- [ ] T4.6: 生产环境配置

### Future (Post-Beta)
- [ ] 实现多文件上传UI
- [ ] E2E测试完整覆盖
- [ ] 性能优化基于测试结果

---

## 📈 成功标准

### Phase 2 (API集成测试) - 当前目标
- ✅ 5个核心API测试用例全部通过
- ✅ 测试覆盖所有4种跨文件检查类型
- ✅ 测试数据包含真实场景（时间线/角色/情节/设定）
- ✅ 测试执行时间 < 5分钟

### Phase 4 (性能测试)
- ✅ 5文件场景 < 120秒
- ✅ 10文件场景 < 240秒
- ✅ 内存使用 < 500MB
- ✅ 无内存泄漏

### Sprint 4整体
- ✅ 所有P0测试用例通过
- ✅ 测试文档完整
- ✅ CI/CD集成测试自动化
- ✅ 生产环境部署验证通过

---

## 🚀 下一步行动

### 立即执行 (T4.1)
1. ✅ 创建测试计划文档（本文档）
2. 🔄 编写API集成测试（tests/integration/multi-file-api.test.ts）
3. ⏳ 运行并验证所有测试通过
4. ⏳ 记录测试结果

### 短期 (T4.2-T4.3)
1. 性能测试脚本（5-10文件场景）
2. 错误边界测试（格式错误、超大文件、API失败）

### 长期 (Post-Sprint 4)
1. 实现多文件上传UI
2. 完整E2E测试套件
3. 持续集成自动化

---

**最后更新**: 2025-11-05
**负责人**: AI Assistant
**审核状态**: 待审核
