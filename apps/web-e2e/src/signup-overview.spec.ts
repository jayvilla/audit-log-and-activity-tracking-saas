/**
 * Phase 5 E2E Test: Signup -> Overview
 * 
 * Tests the signup flow and verifies the user is redirected to the app
 * and the Overview page loads successfully.
 */

import { test, expect } from '@playwright/test';

test('signup -> redirected into app -> Overview loads successfully', async ({ page }) => {
  const testApiUrl = process.env.TEST_API_URL || 'http://localhost:8001/api';
  
  // Generate unique test credentials
  const timestamp = Date.now();
  const email = `e2e-test-${timestamp}@example.com`;
  const password = 'TestPassword123!';
  const name = 'E2E Test User';

  // Navigate to signup page with longer timeout
  await page.goto('/sign-up', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Wait a bit for React to hydrate
  await page.waitForTimeout(1000);

  // Wait for the form to be visible - try multiple selectors
  await page.waitForSelector('form, input[name="name"], input[type="email"]', { timeout: 15000 });
  
  // Fill in signup form - try multiple selectors
  const nameInput = page.locator('input[name="name"], input#name, input[placeholder*="name" i]').first();
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.fill(name);
  
  const emailInput = page.locator('input[type="email"], input#email, input[placeholder*="email" i]').first();
  await expect(emailInput).toBeVisible({ timeout: 5000 });
  await emailInput.fill(email);
  
  // Fill password fields
  const passwordInputs = page.locator('input[type="password"]');
  await expect(passwordInputs.first()).toBeVisible({ timeout: 5000 });
  await passwordInputs.first().fill(password);
  
  // Fill confirm password (the form has two password fields)
  await expect(passwordInputs.nth(1)).toBeVisible({ timeout: 5000 });
  await passwordInputs.nth(1).fill(password);

  // Wait for submit button to be enabled
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeEnabled({ timeout: 5000 });

  // Submit signup form
  await submitButton.click();

  // Wait for redirect to app (should go to /overview)
  await page.waitForURL(/\/overview/, { timeout: 15000 });

  // Verify we're in the app (not on login/signup page)
  const currentUrl = page.url();
  expect(currentUrl).toMatch(/\/overview/);

  // Verify Overview page loads - check for key elements
  await expect(page.locator('h2:has-text("Overview")')).toBeVisible({ timeout: 5000 });
  
  // Verify overview metrics are displayed (at least one stat card)
  const statsCards = page.locator('[class*="card"]').filter({ hasText: /Events Today|Active Users|Success Rate|Avg Response/i });
  await expect(statsCards.first()).toBeVisible({ timeout: 5000 });

  // Verify page title
  await expect(page).toHaveTitle(/Overview/i);
});

