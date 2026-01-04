/**
 * Phase 5 E2E Test: API Keys Create -> Revoke
 * 
 * Tests the API key management flow:
 * - Create a new API key
 * - Verify the key appears in the list
 * - Revoke the key
 * - Verify it's removed
 */

import { test, expect } from '@playwright/test';
import { registerUserViaPage, loginUserViaPage } from './support/test-helpers';

test('API Keys -> create key -> key appears -> revoke -> removed', async ({ page }) => {
  const testApiUrl = process.env.TEST_API_URL || 'http://localhost:8001/api';
  
  // Register a user first
  const credentials = await registerUserViaPage(page, testApiUrl);
  
  // Login via page context (cookies automatically stored)
  await loginUserViaPage(page, testApiUrl, credentials.email, credentials.password);

  // Navigate to API keys page - cookies should be sent automatically
  await page.goto('/api-keys', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Check if we were redirected to login
  const finalUrl = page.url();
  if (finalUrl.includes('/login')) {
    // Debug: check what cookies are available
    const cookies = await page.context().cookies();
    console.log('Available cookies:', cookies.map(c => c.name));
    throw new Error('User was redirected to login - authentication failed');
  }
  
  // Wait for React to hydrate
  await page.waitForTimeout(1000);
  
  // Wait for page to load - check for heading
  const heading = page.locator('h2:has-text("API Keys")');
  await expect(heading).toBeVisible({ timeout: 15000 });

  // Click "Create API Key" button
  const createButton = page.locator('button:has-text("Create API Key")').first();
  await expect(createButton).toBeVisible({ timeout: 5000 });
  await createButton.click();

  // Wait for dialog to open
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  
  // Wait for dialog animations to complete (backdrop and dialog)
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500); // Give dialog time to fully render and animations to complete

  // Fill in API key name - try multiple selectors, scoped to dialog
  const keyName = `E2E Test Key ${Date.now()}`;
  // Try different selectors, scoped to the dialog
  const nameInput = dialog.locator('input').first();
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await expect(nameInput).toBeEnabled({ timeout: 5000 });
  await nameInput.fill(keyName);

  // Submit the form - wait for backdrop animation to complete first
  // The backdrop might be intercepting clicks, so wait for it to be ready
  const backdrop = page.locator('[data-state="open"][aria-hidden="true"]').first();
  if (await backdrop.count() > 0) {
    // Wait for backdrop animation to settle
    await page.waitForTimeout(500);
  }
  
  const submitButton = dialog.locator('button[type="submit"], button:has-text("Create")').filter({ hasText: /Create/i }).first();
  await expect(submitButton).toBeVisible({ timeout: 5000 });
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  
  // Force click if needed to bypass backdrop
  await submitButton.click({ force: true });

  // Wait for success dialog or key to appear in list
  // The key creation shows a dialog with the full key, then we need to close it
  const successDialog = page.locator('[role="dialog"]').filter({ hasText: /API Key Created|Make sure to copy/i });
  await expect(successDialog).toBeVisible({ timeout: 5000 });

  // Close the success dialog (click "Done" or close button)
  const doneButton = page.locator('button:has-text("Done"), button:has-text("Close")').first();
  if (await doneButton.isVisible({ timeout: 2000 })) {
    await doneButton.click();
  }

  // Wait for dialog to close
  await page.waitForTimeout(500);

  // Verify the key appears in the list
  // Look for the key name in the table row
  const keyRow = page.locator('tr').filter({ hasText: keyName }).first();
  await expect(keyRow).toBeVisible({ timeout: 5000 });
  
  // Wait for the row to be fully rendered
  await page.waitForTimeout(500);

  // Find the revoke button - it's a button with a Trash2 icon in the last TableCell
  // The button has variant="ghost" and contains a Trash2 icon (lucide-react)
  // Look for button in the row that contains an SVG (the trash icon)
  const revokeButton = keyRow.locator('button').filter({ has: page.locator('svg') }).last();
  
  // Alternative: look for button in the last TableCell
  if (await revokeButton.count() === 0) {
    const lastCell = keyRow.locator('td').last();
    const buttonInLastCell = lastCell.locator('button').first();
    if (await buttonInLastCell.count() > 0) {
      await expect(buttonInLastCell).toBeVisible({ timeout: 3000 });
      await buttonInLastCell.click();
    } else {
      throw new Error('Revoke button not found for API key');
    }
  } else {
    await expect(revokeButton).toBeVisible({ timeout: 5000 });
    await revokeButton.click();
  }

  // Confirm deletion if there's a confirmation dialog
  const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Revoke")').filter({ hasText: /Confirm|Delete|Revoke/i }).first();
  if (await confirmButton.isVisible({ timeout: 2000 })) {
    await confirmButton.click();
  }

  // Wait for the key to be removed from the list
  await page.waitForTimeout(1000);

  // Verify the key is no longer in the list
  const keyRowAfterRevoke = page.locator('tr, [class*="row"], [class*="item"]').filter({ hasText: keyName });
  await expect(keyRowAfterRevoke).toHaveCount(0, { timeout: 5000 });
});

