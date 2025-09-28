import { test, expect, type Page } from '@playwright/test';
import { testData, generateTestEmail } from '../fixtures/test-data';

/**
 * E2E-AUTH-001 to E2E-AUTH-008: Authentication Flow Tests
 * Priority: P0 (Critical)
 * These tests validate the complete authentication system
 */

test.describe('Authentication Flow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
  });

  /**
   * E2E-AUTH-001: New user registration flow
   * Priority: P0
   * Validates: Form validation, password requirements, email uniqueness, redirect
   */
  test('P0: should successfully register a new user', async () => {
    // Navigate to registration page
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/auth/register');

    // Generate unique test email
    const uniqueEmail = generateTestEmail();

    // Fill registration form
    await page.fill('[data-testid="register-email"]', uniqueEmail);
    await page.fill('[data-testid="register-password"]', testData.users.newUser.password);
    await page.fill('[data-testid="register-confirm-password"]', testData.users.newUser.password);
    
    // Test password validation
    await page.fill('[data-testid="register-password"]', 'weak');
    await page.click('[data-testid="register-submit"]');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
    
    // Use strong password
    await page.fill('[data-testid="register-password"]', testData.users.newUser.password);
    await page.fill('[data-testid="register-confirm-password"]', testData.users.newUser.password);
    
    // Submit registration
    await page.click('[data-testid="register-submit"]');
    
    // Verify successful registration and redirect
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome');
  });

  /**
   * E2E-AUTH-002: User login with valid credentials
   * Priority: P0
   * Validates: JWT token generation, session persistence, dashboard access
   */
  test('P0: should successfully login with valid credentials', async () => {
    // Navigate to login page
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/auth/login');

    // Fill login form
    await page.fill('[data-testid="login-email"]', testData.users.existingUser.email);
    await page.fill('[data-testid="login-password"]', testData.users.existingUser.password);
    
    // Submit login
    await page.click('[data-testid="login-submit"]');
    
    // Verify successful login
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    
    // Verify JWT token is stored
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'next-auth.session-token');
    expect(sessionCookie).toBeDefined();
    
    // Verify user info is displayed
    await expect(page.locator('[data-testid="user-email"]')).toContainText(testData.users.existingUser.email);
  });

  /**
   * E2E-AUTH-003: Invalid login attempts
   * Priority: P0
   * Validates: Error messages, rate limiting, account lockout
   */
  test('P0: should handle invalid login attempts correctly', async () => {
    await page.goto('/auth/login');

    // Test with invalid email
    await page.fill('[data-testid="login-email"]', 'notexist@example.com');
    await page.fill('[data-testid="login-password"]', 'anypassword');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid email or password');
    
    // Test with invalid password
    await page.fill('[data-testid="login-email"]', testData.users.existingUser.email);
    await page.fill('[data-testid="login-password"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid email or password');
    
    // Test rate limiting after multiple attempts
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="login-password"]', `wrongpassword${i}`);
      await page.click('[data-testid="login-submit"]');
      await page.waitForTimeout(100); // Small delay between attempts
    }
    
    // Should show rate limit message after 5 attempts
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Too many attempts');
  });

  /**
   * E2E-AUTH-005: Logout flow
   * Priority: P0
   * Validates: Session termination, token invalidation, redirect
   */
  test('P0: should successfully logout user', async () => {
    // First login
    await page.goto('/auth/login');
    await page.fill('[data-testid="login-email"]', testData.users.existingUser.email);
    await page.fill('[data-testid="login-password"]', testData.users.existingUser.password);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL('/dashboard');

    // Perform logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Verify logout
    await expect(page).toHaveURL('/auth/login');
    
    // Verify session is cleared
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'next-auth.session-token');
    expect(sessionCookie).toBeUndefined();
    
    // Verify cannot access protected route
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/auth/login');
  });

  /**
   * E2E-AUTH-008: Protected route access
   * Priority: P0
   * Validates: Unauthorized redirect, auth middleware
   */
  test('P0: should redirect unauthenticated users from protected routes', async () => {
    // Try to access protected routes without authentication
    const protectedRoutes = [
      '/dashboard',
      '/projects',
      '/analysis',
      '/settings'
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL('/auth/login');
      await expect(page.locator('[data-testid="auth-message"]')).toContainText('Please sign in to continue');
    }
  });

  /**
   * E2E-AUTH-004: Session timeout and refresh
   * Priority: P1
   * Validates: 30-day session expiry, token refresh, re-authentication
   */
  test('P1: should handle session timeout and refresh', async () => {
    // This test would require mocking time or using a shorter session for testing
    test.skip(); // Implement with time mocking in next iteration
  });

  /**
   * E2E-AUTH-006: Password reset flow
   * Priority: P1
   * Validates: Reset email trigger, token validation, password update
   */
  test('P1: should handle password reset flow', async () => {
    await page.goto('/auth/login');
    await page.click('text=Forgot password?');
    
    await expect(page).toHaveURL('/auth/forgot-password');
    
    // Request password reset
    await page.fill('[data-testid="reset-email"]', testData.users.existingUser.email);
    await page.click('[data-testid="reset-submit"]');
    
    // Verify confirmation message
    await expect(page.locator('[data-testid="reset-message"]')).toContainText('Password reset email sent');
    
    // Note: Full flow would require email testing infrastructure
  });

  /**
   * E2E-AUTH-007: Concurrent session handling
   * Priority: P2
   * Validates: Multiple device login, session synchronization
   */
  test('P2: should handle concurrent sessions', async () => {
    test.skip(); // Implement with multiple browser contexts in next iteration
  });
});

/**
 * Test helper functions
 */
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  await expect(page).toHaveURL('/dashboard');
}