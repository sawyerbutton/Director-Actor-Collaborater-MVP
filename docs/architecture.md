# 全栈架构文档: ScriptAI MVP

## 1. 高层架构
* **技术摘要**: 本项目将采用基于Next.js的全栈单体架构，部署在Vercel平台上。前端将利用`shadcn/ui`组件库构建，后端逻辑通过Vercel的Serverless Functions实现。数据将存储在由Supabase托管的PostgreSQL数据库中。整个架构的核心是与DeepSeek AI API的集成。
* **平台与基础设施**: **Vercel + Supabase**。
* **代码仓库结构**: **单体仓库 (Single Repository)**。
* **高层架构图**:
    ```mermaid
    graph TD
        subgraph "用户端 (Browser)"
            A[Next.js Frontend on Vercel]
        end
        subgraph "Vercel平台"
            B[API Routes / Serverless Functions]
        end
        subgraph "第三方服务"
            C[DeepSeek AI API]
            D[Supabase (PostgreSQL DB)]
        end
        A -- "HTTP请求" --> B;
        B -- "调用AI分析" --> C;
        B -- "读写数据 (Prisma)" --> D;
    ```

## 2. 技术栈
| 类别 | 技术 | 版本 |
| :--- | :--- | :--- |
| **语言** | TypeScript | 5.x |
| **前端框架** | Next.js | 14.x |
| **后端框架** | Next.js API Routes | 14.x |
| **UI组件库** | shadcn/ui | latest |
| **样式** | Tailwind CSS | 3.x |
| **数据库** | PostgreSQL | 15.x |
| **ORM** | Prisma | 5.x |
| **认证** | NextAuth.js | v5 (beta) |
| **AI服务** | DeepSeek API | v1 |
| **测试** | Jest + RTL, Playwright | latest |
| **部署** | Vercel & Supabase | - |

## 3. 数据模型
* **User**: 存储用户基本信息。
* **Project**: 代表用户的一个剧本工程。
* **Analysis**: 存储对某一个项目的AI分析结果。

## 4. API规范
采用**OpenAPI 3.0**定义RESTful API。核心端点包括 `/api/projects` (GET, POST), `/api/analyze` (POST), 和 `/api/analyze/{id}` (GET)。所有需认证的端点都将通过NextAuth.js的会话保护。

## 5. 组件
* **后端**: 认证组件、项目管理组件、AI分析管道组件、数据访问组件 (Prisma)、LLM提供商组件。
* **前端**: UI组件库、状态管理组件 (Zustand)、API客户端组件。

## 6. 外部API
* **DeepSeek AI API**: 唯一的、核心的外部API依赖，用于执行所有AI分析任务。

## 7. 核心工作流
采用**异步AI剧本分析流程**。前端通过POST请求启动分析，后端立即返回202 Accepted和任务ID。前端通过该ID轮询分析状态，直至任务完成或失败。

## 8. 数据库模式
使用Prisma Schema定义数据库结构，包含`User`, `Project`, `Analysis`三个模型，并合理使用级联删除、索引和JSON数据类型。

## 9. 前端架构
基于Next.js 14 App Router，清晰组织组件、状态(Zustand)、路由和服务层代码。

## 10. 后端架构
完全拥抱Serverless理念，利用Next.js API Routes构建，并通过Prisma单例模式访问数据库，NextAuth.js处理认证。

## 11. 统一项目结构
采用清晰的单体仓库文件结构，分离`app/` (UI/路由)和`lib/` (核心逻辑)，并通过`types/`共享类型定义。

## 12. 开发工作流
提供标准化的本地开发设置流程，包括依赖安装、环境变量配置和数据库迁移。

## 13. 部署架构
利用Vercel与GitHub的集成，实现全自动的CI/CD流程。每个特性分支都有独立的预览环境，主分支自动部署到生产环境。

## 14. 安全与性能
* **安全**: 依赖NextAuth.js处理认证安全，使用Zod进行输入验证，通过环境变量管理密钥。
* **性能**: 利用Next.js进行前端性能优化，后端采用异步处理和数据库索引。

## 15. 测试策略
采用精简的测试金字塔，重点投入在核心逻辑的单元测试和关键用户流程的E2E测试上。

## 16. 编码规范
制定了5条最简化的关键规则和统一的命名约定，以保证代码质量和一致性。

## 17. 错误处理策略
实施贯穿全栈的统一错误处理策略，向用户显示友好提示，并记录可追踪的错误信息。

## 18. 监控与可观察性
利用Vercel Analytics、Supabase Dashboard和专门的错误追踪服务（如Sentry）来监控应用健康状况。

## 19. 架构师清单检查结果
**结论**: 本《全栈架构文档》是**完整、一致且可执行的**，为项目提供了坚实的技术蓝图。

## 20. 后续步骤：向产品负责人移交
本文档现已完成并移交给产品负责人（PO），以进行最终的跨文档一致性验证。
