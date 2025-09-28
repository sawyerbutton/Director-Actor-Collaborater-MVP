const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: '../',
})

const customJestConfig = {
  rootDir: '../',
  setupFiles: ['<rootDir>/tests/__tests__/api/setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/config/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^next-auth': '<rootDir>/tests/__mocks__/next-auth.js',
    '^next-auth/next': '<rootDir>/tests/__mocks__/next-auth.js',
  },
  testMatch: [
    '**/tests/__tests__/**/*.test.ts?(x)',
    '**/tests/__tests__/**/*.spec.ts?(x)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/__tests__/.*samples/.*'
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    '!lib/**/*.d.ts',
    '!lib/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
}

module.exports = createJestConfig(customJestConfig)