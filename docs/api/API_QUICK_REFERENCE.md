# API 快速参考

**版本**: v1.0 | **更新**: 2025-11-05

---

## 🚀 快速开始

### 基础URL
```
/api/v1
```

### 认证
```http
Cookie: next-auth.session-token=...
```

---

## 📁 文件管理

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/projects/:id/files` | 上传单个文件 |
| POST | `/projects/:id/files/batch` | 批量上传 |
| GET | `/projects/:id/files` | 列出所有文件 |
| GET | `/projects/:id/files/:fileId` | 获取文件详情 |
| PATCH | `/projects/:id/files/:fileId` | 更新文件 |
| DELETE | `/projects/:id/files/:fileId` | 删除文件 |
| GET | `/projects/:id/files/stats` | 获取统计 |

---

## 🔍 分析

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/projects/:id/analyze/cross-file` | 执行跨文件分析 |
| GET | `/projects/:id/cross-file-findings` | 获取findings |

---

## 📊 请求示例

### 上传文件
```bash
curl -X POST /api/v1/projects/abc123/files \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "第1集.md",
    "episodeNumber": 1,
    "rawContent": "# 第1集\n...",
    "jsonContent": { "scenes": [...] }
  }'
```

### 执行分析
```bash
curl -X POST /api/v1/projects/abc123/analyze/cross-file \
  -H "Content-Type: application/json" \
  -d '{
    "checkTypes": [
      "cross_file_timeline",
      "cross_file_character"
    ],
    "minConfidence": 0.6
  }'
```

### 获取Findings
```bash
curl /api/v1/projects/abc123/cross-file-findings?grouped=true
```

---

## 🎯 检查类型

| 类型 | 描述 | 性能 |
|------|------|------|
| `cross_file_timeline` | 时间线一致性 | 快 (~20ms/10文件) |
| `cross_file_character` | 角色名称 | 快 (~25ms/10文件) |
| `cross_file_plot` | 情节连贯性 | 慢 (~40s/3文件) ⚠️ |
| `cross_file_setting` | 场景设定 | 慢 (~40s/3文件) ⚠️ |

**推荐**: 优先使用timeline和character检查

---

## ⚠️ 错误码

| 错误码 | HTTP | 含义 |
|--------|------|------|
| `VALIDATION_ERROR` | 400 | 参数错误 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `DUPLICATE_FILE` | 409 | 文件重复 |
| `ANALYSIS_FAILED` | 500 | 分析失败 |

---

## 📈 性能指标

- **5文件**: 上传126ms + 分析25ms = 151ms总计
- **10文件**: 上传233ms + 分析45ms = 278ms总计
- **吞吐量**: 35+ files/sec
- **内存**: 10-16MB/10文件

---

## 🔗 详细文档

完整API文档: [MULTI_FILE_ANALYSIS_API.md](./MULTI_FILE_ANALYSIS_API.md)
