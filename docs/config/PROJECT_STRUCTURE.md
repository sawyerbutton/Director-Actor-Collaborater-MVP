# Project Structure

## Overview
This document describes the organized directory structure of the Director-Actor-Collaborater-MVP project.

## Root Directory Organization

```
├── app/                    # Next.js App Router pages and API routes
├── components/             # React components
├── lib/                    # Core business logic and services
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── prisma/                 # Database schema and migrations
│
├── config/                 # Configuration files
│   ├── jest.config.js      # Jest testing configuration
│   ├── jest.setup.js       # Jest setup file
│   ├── playwright.config.ts # Playwright E2E configuration
│   ├── postcss.config.js   # PostCSS configuration
│   └── tailwind.config.js  # Tailwind CSS configuration
│
├── docs/                   # Documentation
│   ├── deployment/         # Deployment guides
│   ├── guides/             # Development guides
│   └── PROJECT_STRUCTURE.md # This file
│
├── env/                    # Environment files examples
│   ├── .env.example
│   ├── .env.local.example
│   ├── .env.production.example
│   └── .env.test
│
├── scripts/                # Utility scripts
│   ├── deployment/         # Deployment scripts
│   │   └── pre-deploy-check.sh
│   └── testing/            # Testing scripts
│       └── test-runner.sh
│
├── tests/                  # All test files
│   ├── __tests__/          # Unit and integration tests
│   ├── __mocks__/          # Test mocks
│   ├── e2e/                # End-to-end tests
│   └── results/            # Test results (gitignored)
│       ├── coverage/
│       ├── playwright-report/
│       └── test-results/
│
├── .next/                  # Next.js build output (gitignored)
├── node_modules/           # Dependencies (gitignored)
│
├── .env                    # Local environment variables (gitignored)
├── .gitignore              # Git ignore rules
├── .eslintrc.json          # ESLint configuration
├── LICENSE                 # Project license
├── README.md               # Project documentation
├── middleware.ts           # Next.js middleware
├── next.config.js          # Next.js configuration
├── package.json            # Package dependencies
├── tsconfig.json           # TypeScript configuration
└── vercel.json             # Vercel deployment configuration
```

## Key Changes from Previous Structure

1. **Configuration Files**: Moved all config files (jest, playwright, tailwind, postcss) to `/config` directory
2. **Test Organization**: Consolidated all test-related files under `/tests` directory
3. **Documentation**: Organized docs into subdirectories by category
4. **Environment Files**: Moved example env files to `/env` directory
5. **Scripts**: Organized scripts by purpose (deployment, testing)
6. **Test Results**: Centralized test output in `/tests/results`

## Symlinks
For backward compatibility, the following symlinks exist in the root:
- `postcss.config.js -> config/postcss.config.js`
- `tailwind.config.js -> config/tailwind.config.js`

## Notes
- The structure maintains full compatibility with Next.js conventions
- All paths in configuration files have been updated to reflect the new structure
- Test commands in package.json now reference the config directory
- The build and deployment processes remain unchanged