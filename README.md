# ScriptAI MVP - Intelligent Script Analysis Assistant

> An AI-powered collaborative system that helps screenwriters detect and fix common logical errors in scripts within 10 seconds.

## Overview

ScriptAI is a Next.js monolithic application that leverages three collaborative AI agents to analyze scripts and provide intelligent suggestions for improving logical consistency. Built with a "function-first, architecture-second" philosophy after learning from over-engineering failures.

### Key Features

- **Instant Script Analysis**: Detect and fix 5+ types of common logical errors in under 10 seconds
- **AI Agent Collaboration**: Three specialized agents working together for comprehensive analysis
- **Interactive Modifications**: Accept or reject AI suggestions with visual context
- **Continuous Consistency Engine**: Maintains script consistency even after setting changes
- **Clean, Minimal Interface**: Distraction-free writing and editing environment

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Language** | TypeScript | 5.x |
| **Frontend Framework** | Next.js | 14.x |
| **Backend Framework** | Next.js API Routes | 14.x |
| **UI Components** | shadcn/ui | latest |
| **Styling** | Tailwind CSS | 3.x |
| **Database** | PostgreSQL | 15.x |
| **ORM** | Prisma | 5.x |
| **Authentication** | NextAuth.js | v5 (beta) |
| **AI Service** | DeepSeek API | v1 |
| **Testing** | Jest + RTL, Playwright | latest |
| **Deployment** | Vercel & Supabase | - |

## Project Structure

```
Director-Actor-Collaborater-MVP/
├── app/                    # Next.js App Router pages and layouts
│   ├── api/               # API routes and serverless functions
│   ├── (auth)/            # Authentication pages
│   └── (dashboard)/       # Main application pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── features/         # Feature-specific components
├── lib/                   # Core business logic
│   ├── ai/               # AI agent implementations
│   ├── db/               # Database utilities
│   └── utils/            # Helper functions
├── prisma/               # Database schema and migrations
├── public/               # Static assets
├── types/                # TypeScript type definitions
├── docs/                 # Project documentation
│   ├── prd.md           # Product Requirements Document
│   └── architecture.md   # Architecture Document
└── tests/                # Test suites
    ├── unit/            # Unit tests
    └── e2e/             # End-to-end tests
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL 15+ (or Supabase account)
- DeepSeek API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Director-Actor-Collaborater-MVP.git
cd Director-Actor-Collaborater-MVP
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
DATABASE_URL="postgresql://..."
DEEPSEEK_API_KEY="your_api_key"
NEXTAUTH_SECRET="your_secret"
NEXTAUTH_URL="http://localhost:3000"
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Core Features

### 1. Script Input (FR1)
- Paste text directly or upload .txt/.docx files
- Support for standard screenplay formats

### 2. AI Collaborative Analysis (FR2)
Three specialized agents working in concert:
- **Consistency Guardian**: Detects logical inconsistencies
- **Modification Executive**: Proposes contextual fixes
- **Continuous Analyzer**: Maintains consistency after changes

### 3. Error Detection (FR3)
Detects 5+ core logical error types:
- Character inconsistencies
- Timeline conflicts
- Plot holes
- Setting contradictions
- Dialogue incongruities

### 4. Interactive Modifications (FR5)
- Visual diff view showing proposed changes
- One-click accept/reject for each suggestion
- Real-time script updates

### 5. Export Functionality (FR6)
- Export revised script with accepted changes
- Multiple format support (.txt, .docx, .pdf)

## Development

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run typecheck

# Format code
npm run format
```

### Database Management

```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio
```

## Deployment

The application is designed for seamless deployment on Vercel with Supabase:

1. Push to GitHub main branch
2. Vercel automatically builds and deploys
3. Preview deployments for feature branches
4. Production deployment on main branch

### Environment Variables (Production)

Configure these in Vercel dashboard:
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - Production URL

## Architecture Highlights

### Monolithic Design
- Single Next.js application with serverless functions
- Single PostgreSQL database
- Simplified deployment and maintenance

### Performance Optimizations
- Async AI processing with status polling
- Database indexing on frequently queried fields
- Next.js automatic code splitting and optimization
- Edge caching for static assets

### Security Measures
- NextAuth.js for secure authentication
- Zod validation for all inputs
- Environment variables for sensitive data
- HTTPS-only in production

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the established code conventions
- Write tests for new features
- Keep the architecture simple
- Prioritize functionality over complexity

## Roadmap

### Phase 1: Core MVP (Weeks 1-3) ✅
- [x] AI agent implementation
- [x] Basic UI for script upload and analysis
- [x] Minimal backend with authentication

### Phase 2: Enhancement (Weeks 4-5)
- [ ] Advanced error detection patterns
- [ ] Collaborative editing features
- [ ] Performance optimizations

### Phase 3: Scale (Weeks 6+)
- [ ] Team collaboration features
- [ ] API for third-party integrations
- [ ] Mobile responsive design

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the development team

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI powered by [DeepSeek](https://deepseek.com/)
- Deployed on [Vercel](https://vercel.com/) and [Supabase](https://supabase.com/)

---

**Project Status**: 🚧 Active Development

*Built with a focus on simplicity, functionality, and real-world usability.*