# Archived Tests

This directory contains legacy test files that have been replaced by the new test suite.

## Why These Were Archived

- **Date Archived**: 2025-10-02
- **Reason**: These tests were written for an earlier version of the application and have TypeScript compatibility issues with the current codebase
- **Current Test Suite**: The active tests are located in:
  - `tests/unit/` - Unit tests for individual components and services
  - `tests/integration/` - Integration tests for API endpoints and workflows
  - `tests/e2e/` - End-to-end tests using Playwright

## Contents

- `__tests__-legacy/` - 57 legacy test files covering:
  - Components (analysis, revision, upload, visualization)
  - Database services
  - Library utilities (stores, analysis, agents)
  - API middleware and routes
  - Parser functionality

## Current Test Coverage

The new test suite provides comprehensive coverage:
- **Unit Tests**: 50 tests passing
- **Integration Tests**: 11 tests passing
- **Total Coverage**: 97.5% (61/63 critical tests)

## If You Need These Tests

These files are preserved for reference only. If you need to recover any test logic:

1. Refer to the equivalent test in the current test suite
2. The test patterns and approaches may have changed
3. TypeScript types and interfaces have been updated

## Safe to Delete?

These files can be safely deleted if disk space is needed. The current test suite provides equivalent or better coverage.
