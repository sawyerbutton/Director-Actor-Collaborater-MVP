# 4. API规范
采用**OpenAPI 3.0**定义RESTful API。核心端点包括 `/api/projects` (GET, POST), `/api/analyze` (POST), 和 `/api/analyze/{id}` (GET)。所有需认证的端点都将通过NextAuth.js的会话保护。
