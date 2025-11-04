# Docker 部署指南

## 📦 服务架构

本项目使用 Docker Compose 编排以下服务：

1. **PostgreSQL 数据库** (director-postgres)
   - 端口: 5433 (主机) → 5432 (容器)
   - 版本: postgres:16-alpine
   - 持久化卷: director_postgres_data

2. **Python 脚本转换服务** (python-converter)
   - 端口: 8001
   - 版本: Python 3.13-alpine
   - 健康检查: http://localhost:8001/health

3. **Next.js 应用** (可选，默认注释)
   - 端口: 3000
   - 推荐在本地运行: `npm run dev`

## 🚀 快速启动

### 1. 启动所有服务

```bash
# 启动 PostgreSQL 和 Python 转换服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 2. 验证服务

```bash
# 测试 PostgreSQL (端口 5433)
psql -h localhost -p 5433 -U director_user -d director_actor_db

# 测试 Python 转换服务
curl http://localhost:8001/health
# 预期输出: {"status":"healthy","service":"python-converter","version":"1.0.0"}

# 查看 API 文档
curl http://localhost:8001/api/v1/
```

### 3. 测试 API 端点

**单文件转换**:
```bash
curl -X POST http://localhost:8001/api/v1/convert/script \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "test123",
    "raw_content": "场景1：咖啡厅-白天\n\n张三走进咖啡厅。",
    "filename": "test.txt",
    "episode_number": 1
  }'
```

**批量转换**:
```bash
curl -X POST http://localhost:8001/api/v1/convert/outline \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "project123",
    "files": [
      {
        "file_id": "file1",
        "raw_content": "场景1：办公室-白天\n\n经理在工作。",
        "filename": "第1集.txt",
        "episode_number": 1
      }
    ]
  }'
```

## 🔧 开发模式

### 启动开发环境（热重载）

```bash
# 使用开发配置文件
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 此配置启用：
# - uvicorn --reload (代码热重载)
# - 调试日志 (LOG_LEVEL=debug)
# - 源码挂载 (实时更新)
```

### 修改代码后重启

```bash
# 重启 Python 服务（配置热重载后自动生效）
docker-compose restart python-converter

# 或者重新构建镜像（依赖更新时）
docker-compose build python-converter
docker-compose up -d python-converter
```

## 🛠️ 常用命令

### 服务管理

```bash
# 停止所有服务
docker-compose stop

# 停止并删除容器
docker-compose down

# 停止并删除容器+卷（清空数据库）
docker-compose down -v

# 重启特定服务
docker-compose restart python-converter

# 查看服务状态
docker-compose ps
```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f python-converter

# 查看最近 50 行日志
docker-compose logs --tail=50 python-converter
```

### 进入容器

```bash
# 进入 Python 容器
docker exec -it python-converter sh

# 进入 PostgreSQL 容器
docker exec -it director-postgres sh
```

### 数据库操作

```bash
# 连接数据库
docker exec -it director-postgres psql -U director_user -d director_actor_db

# 备份数据库
docker exec director-postgres pg_dump -U director_user director_actor_db > backup.sql

# 恢复数据库
cat backup.sql | docker exec -i director-postgres psql -U director_user -d director_actor_db
```

## 📝 配置说明

### 环境变量

**PostgreSQL**:
- `POSTGRES_USER`: director_user
- `POSTGRES_PASSWORD`: director_pass_2024
- `POSTGRES_DB`: director_actor_db

**Python Converter**:
- `PORT`: 8001
- `LOG_LEVEL`: info (生产) / debug (开发)
- `PYTHONUNBUFFERED`: 1 (禁用 Python 输出缓冲)

### 端口映射

| 服务 | 容器端口 | 主机端口 | 说明 |
|------|---------|---------|------|
| PostgreSQL | 5432 | 5433 | 避免与本地 PostgreSQL 冲突 |
| Python Converter | 8001 | 8001 | 脚本转换 API |
| Next.js (可选) | 3000 | 3000 | 前端应用 |

### 数据持久化

**持久化卷**:
- `director_postgres_data`: PostgreSQL 数据
- `./services/python-converter/logs`: Python 服务日志

**开发模式额外挂载**:
- `./services/python-converter/app`: Python 源码
- `./services/python-converter/tests`: 测试文件

## 🧪 测试

### 运行 Python 服务测试

```bash
# 在容器中运行测试
docker exec python-converter pytest tests/ -v

# 运行特定测试文件
docker exec python-converter pytest tests/test_api.py -v

# 生成覆盖率报告
docker exec python-converter pytest tests/ --cov=app --cov-report=html
```

### 本地测试（推荐）

```bash
# 进入 Python 服务目录
cd services/python-converter

# 激活虚拟环境
source venv/bin/activate

# 运行测试
pytest tests/ -v
```

## 🐛 故障排查

### 端口冲突

**问题**: `Bind for 0.0.0.0:5432 failed: port is already allocated`

**解决方案**:
```bash
# 查看占用端口的进程
sudo lsof -i :5432
docker ps | grep postgres

# 修改 docker-compose.yml 中的端口映射
# "5433:5432"  # 使用 5433 替代 5432
```

### 容器启动失败

**问题**: 容器不断重启

**解决方案**:
```bash
# 查看日志
docker logs python-converter --tail 100

# 检查配置
docker-compose config

# 重新构建镜像
docker-compose build --no-cache python-converter
docker-compose up -d
```

### API 无响应

**问题**: `curl http://localhost:8001/health` 无响应

**解决方案**:
```bash
# 检查容器状态
docker-compose ps

# 查看健康检查
docker inspect python-converter | grep -A 10 Health

# 重启服务
docker-compose restart python-converter
```

### 数据库连接失败

**问题**: Python 服务无法连接数据库

**解决方案**:
```bash
# 检查网络
docker network ls
docker network inspect director_network

# 测试数据库连接
docker exec python-converter ping postgres

# 检查数据库健康状态
docker exec director-postgres pg_isready -U director_user
```

## 📊 性能优化

### 生产环境优化

1. **移除源码挂载** (docker-compose.yml):
```yaml
# 注释掉开发挂载
# volumes:
#   - ./services/python-converter/app:/app/app:ro
```

2. **增加 workers**:
```yaml
environment:
  WORKERS: 4  # 根据 CPU 核心数调整
```

3. **限制资源**:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 512M
```

### 镜像优化

```bash
# 查看镜像大小
docker images | grep python-converter

# 清理未使用的镜像
docker system prune -a

# 构建优化后的镜像
docker-compose build --no-cache
```

## 🔐 安全建议

### 生产环境安全配置

1. **更改默认密码**:
```yaml
environment:
  POSTGRES_PASSWORD: <strong_random_password>
```

2. **限制网络访问**:
```yaml
networks:
  app_network:
    internal: true  # 内部网络
```

3. **使用 secrets** (Docker Swarm):
```yaml
secrets:
  postgres_password:
    external: true
```

## 📚 相关文档

- [Dockerfile 说明](../services/python-converter/Dockerfile)
- [Python 服务 API 文档](http://localhost:8001/docs)
- [项目开发进度](../DEVELOPMENT_PROGRESS.md)
- [Sprint 2 总结](../docs/sprint-summaries/)

## 🆘 获取帮助

遇到问题？
1. 查看日志: `docker-compose logs -f`
2. 检查配置: `docker-compose config`
3. 参考故障排查章节
4. 查阅项目文档

---

**版本**: 1.0.0
**更新时间**: 2025-11-04
**维护者**: Director-Actor-Collaborater Team
