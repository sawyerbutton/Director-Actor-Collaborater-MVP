import { describe, it, expect } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'

describe('Authentication Removal Verification', () => {
  describe('Package Dependencies', () => {
    it('should not have NextAuth dependencies in package.json', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      )

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      }

      const authRelatedPackages = Object.keys(allDeps).filter(dep =>
        dep.toLowerCase().includes('next-auth') ||
        dep.toLowerCase().includes('nextauth') ||
        dep === '@auth/prisma-adapter'
      )

      expect(authRelatedPackages).toHaveLength(0)
    })
  })

  describe('File System', () => {
    it('should not have authentication-related directories', () => {
      const authPaths = [
        'app/api/auth',
        'app/auth',
        'components/auth',
        'lib/auth'
      ]

      authPaths.forEach(authPath => {
        const fullPath = path.join(process.cwd(), authPath)
        expect(fs.existsSync(fullPath)).toBe(false)
      })
    })

    it('should not have authentication-related files', () => {
      const authFiles = [
        'lib/auth.ts',
        'middleware/auth.ts',
        '.env.local'
      ]

      authFiles.forEach(file => {
        const fullPath = path.join(process.cwd(), file)
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8')
          expect(content).not.toMatch(/NEXTAUTH_URL|NEXTAUTH_SECRET/)
        }
      })
    })
  })

  describe('Environment Configuration', () => {
    it('should not have NEXTAUTH environment variables in example files', () => {
      const envFiles = [
        '.env.local.example',
        '.env.production.example'
      ]

      envFiles.forEach(file => {
        const fullPath = path.join(process.cwd(), file)
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8')
          expect(content).not.toMatch(/NEXTAUTH_URL/)
          expect(content).not.toMatch(/NEXTAUTH_SECRET/)
          expect(content).not.toMatch(/GITHUB_ID/)
          expect(content).not.toMatch(/GITHUB_SECRET/)
          expect(content).not.toMatch(/GOOGLE_CLIENT_ID/)
          expect(content).not.toMatch(/GOOGLE_CLIENT_SECRET/)
        }
      })
    })

    it('should not have auth-related environment type definitions', () => {
      const envTypePath = path.join(process.cwd(), 'types/env.d.ts')
      if (fs.existsSync(envTypePath)) {
        const content = fs.readFileSync(envTypePath, 'utf-8')
        expect(content).not.toMatch(/NEXTAUTH_URL/)
        expect(content).not.toMatch(/NEXTAUTH_SECRET/)
        expect(content).not.toMatch(/AUTH_/)
      }
    })
  })

  describe('Middleware', () => {
    it('should have middleware that bypasses authentication', () => {
      const middlewarePath = path.join(process.cwd(), 'middleware.ts')
      if (fs.existsSync(middlewarePath)) {
        const content = fs.readFileSync(middlewarePath, 'utf-8')
        expect(content).toMatch(/NextResponse\.next\(\)/)
        expect(content).not.toMatch(/auth\(\)/)
        expect(content).not.toMatch(/getServerSession/)
        expect(content).not.toMatch(/NextAuth/)
      }
    })
  })

  describe('Application Pages', () => {
    it('should not have auth() calls in page components', () => {
      const pageFiles = [
        'app/page.tsx',
        'app/dashboard/page.tsx',
        'app/projects/page.tsx',
        'app/settings/page.tsx'
      ]

      pageFiles.forEach(file => {
        const fullPath = path.join(process.cwd(), file)
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8')
          expect(content).not.toMatch(/auth\(\)/)
          expect(content).not.toMatch(/getServerSession/)
          expect(content).not.toMatch(/useSession/)
          expect(content).not.toMatch(/SessionProvider/)
        }
      })
    })
  })

  describe('API Routes', () => {
    it('should not have authentication checks in API routes', () => {
      const apiPath = path.join(process.cwd(), 'app/api')

      const checkDirectory = (dir: string) => {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir)
          files.forEach(file => {
            const fullPath = path.join(dir, file)
            const stat = fs.statSync(fullPath)
            if (stat.isDirectory() && !file.includes('auth')) {
              checkDirectory(fullPath)
            } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
              const content = fs.readFileSync(fullPath, 'utf-8')
              expect(content).not.toMatch(/auth\(\)/)
              expect(content).not.toMatch(/getServerSession/)
            }
          })
        }
      }

      checkDirectory(apiPath)
    })
  })
})