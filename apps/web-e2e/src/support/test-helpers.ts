/**
 * E2E Test Helpers
 * 
 * Utility functions for E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Extract and set cookies from API response to browser context
 */
async function syncCookiesToBrowser(page: Page, response: any): Promise<void> {
  const setCookieHeaders = response.headers()['set-cookie'];
  if (!setCookieHeaders) return;

  const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  const cookies = [];

  for (const cookieString of cookieArray) {
    const parts = cookieString.split(';');
    const [nameValue] = parts;
    const [name, value] = nameValue.split('=');
    
    if (!name || !value) continue;

    const cookie: any = {
      name: name.trim(),
      value: value.trim(),
      domain: 'localhost', // Must match the domain the browser uses
      path: '/',
      httpOnly: cookieString.toLowerCase().includes('httponly'),
      secure: false, // Tests run over HTTP
      sameSite: 'Lax' as const,
    };

    // Parse expires/max-age and other attributes
    for (const part of parts.slice(1)) {
      const trimmed = part.trim().toLowerCase();
      if (trimmed.startsWith('max-age=')) {
        const maxAge = parseInt(trimmed.split('=')[1], 10);
        cookie.expires = Math.floor(Date.now() / 1000) + maxAge;
      } else if (trimmed.startsWith('expires=')) {
        const expiresValue = trimmed.split('=')[1];
        try {
          cookie.expires = Math.floor(new Date(expiresValue).getTime() / 1000);
        } catch {
          // Ignore invalid dates
        }
      } else if (trimmed === 'samesite=strict' || trimmed.includes('samesite=strict')) {
        cookie.sameSite = 'Strict' as const;
      } else if (trimmed === 'samesite=none' || trimmed.includes('samesite=none')) {
        cookie.sameSite = 'None' as const;
      } else if (trimmed === 'samesite=lax' || trimmed.includes('samesite=lax')) {
        cookie.sameSite = 'Lax' as const;
      } else if (trimmed.startsWith('domain=')) {
        // Extract domain if specified, but use localhost for tests
        const domain = trimmed.split('=')[1];
        if (domain && domain !== 'localhost') {
          // For cross-domain cookies, we might need to handle differently
          // But for E2E tests, we'll use localhost
        }
      } else if (trimmed.startsWith('path=')) {
        cookie.path = trimmed.split('=')[1];
      }
    }

    cookies.push(cookie);
  }

  if (cookies.length > 0) {
    // Clear existing cookies for the domain first to avoid conflicts
    const existingCookies = await page.context().cookies();
    const cookiesToRemove = existingCookies.filter(c => 
      cookies.some(newCookie => newCookie.name === c.name && newCookie.domain === c.domain)
    );
    if (cookiesToRemove.length > 0) {
      await page.context().clearCookies();
    }
    
    await page.context().addCookies(cookies);
  }
}

/**
 * Register a new user via the browser UI (signup page)
 * This ensures cookies are naturally handled by the browser
 */
export async function registerUserViaPage(
  page: Page,
  apiUrl: string,
  email: string = `test-${Date.now()}@example.com`,
  password: string = 'TestPassword123!',
  name: string = 'Test User'
): Promise<{ email: string; password: string; name: string }> {
  // Navigate to signup page
  await page.goto('/sign-up', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for form to be visible - try multiple selectors
  await page.waitForSelector('form, input[name="name"], input#name, input[type="email"]', { timeout: 15000 });
  
  // Wait a bit for React to hydrate
  await page.waitForTimeout(1000);
  
  // Fill in signup form - use ID selectors which are more reliable
  const nameInput = page.locator('input#name');
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.fill(name);
  
  const emailInput = page.locator('input#email');
  await expect(emailInput).toBeVisible({ timeout: 5000 });
  await emailInput.fill(email);
  
  // Fill password fields
  const passwordInputs = page.locator('input[type="password"]');
  const passwordCount = await passwordInputs.count();
  if (passwordCount < 2) {
    throw new Error(`Expected 2 password fields, found ${passwordCount}`);
  }
  await expect(passwordInputs.first()).toBeVisible({ timeout: 5000 });
  await passwordInputs.first().fill(password);
  await expect(passwordInputs.nth(1)).toBeVisible({ timeout: 5000 });
  await passwordInputs.nth(1).fill(password);
  
  // Set up network monitoring for registration API call
  const registerResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/auth/register') && response.request().method() === 'POST',
    { timeout: 15000 }
  ).catch(() => null);
  
  // Submit the form
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  await submitButton.click();
  
  // Wait for the registration API response
  const registerResponse = await registerResponsePromise;
  
  if (registerResponse) {
    const status = registerResponse.status();
    if (status !== 200 && status !== 201) {
      try {
        const errorBody = await registerResponse.json();
        throw new Error(`Registration API returned ${status}: ${JSON.stringify(errorBody)}`);
      } catch {
        const errorText = await registerResponse.text().catch(() => 'Unknown error');
        throw new Error(`Registration API returned ${status}: ${errorText}`);
      }
    }
  }
  
  // Wait for navigation to overview (success)
  try {
    await page.waitForURL(/\/overview/, { timeout: 10000 });
    // Success!
    return { email, password, name };
  } catch {
    // Still on signup page - check for error
    const currentUrl = page.url();
    if (!currentUrl.includes('/sign-up')) {
      // We're on a different page, assume success
      return { email, password, name };
    }
    
    // Wait a bit more
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    if (finalUrl.includes('/overview')) {
      return { email, password, name };
    }
    
    // Check for error
    const errorElement = page.locator('[class*="error"], [class*="alert"]');
    const hasError = await errorElement.count() > 0;
    if (hasError) {
      const errorText = await errorElement.first().textContent();
      throw new Error(`Registration failed: ${errorText || 'Unknown error'}`);
    }
    throw new Error('Registration failed - still on signup page after API call');
  }
  
  return { email, password, name };
}

/**
 * Login a user via the browser UI
 * This ensures cookies are naturally handled by the browser and sent with all requests
 */
export async function loginUserViaPage(
  page: Page,
  apiUrl: string,
  email: string,
  password: string
): Promise<void> {
  // Navigate to login page
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"], input#email', { timeout: 10000 });
  
  // Fill in login form - use ID selectors
  const emailInput = page.locator('input#email');
  await expect(emailInput).toBeVisible({ timeout: 5000 });
  await expect(emailInput).toBeEnabled({ timeout: 5000 });
  
  // Click to focus, clear, and type to simulate real user input
  await emailInput.click();
  await emailInput.clear();
  await emailInput.type(email, { delay: 50 });
  
  // Wait a bit for React to process
  await page.waitForTimeout(200);
  
  // Verify the email was filled
  const emailValue = await emailInput.inputValue();
  if (emailValue !== email) {
    throw new Error(`Email input value mismatch. Expected: ${email}, Got: ${emailValue}`);
  }
  
  const passwordInput = page.locator('input#password');
  await expect(passwordInput).toBeVisible({ timeout: 5000 });
  await expect(passwordInput).toBeEnabled({ timeout: 5000 });
  
  // Click to focus, clear, and type to simulate real user input
  await passwordInput.click();
  await passwordInput.clear();
  await passwordInput.type(password, { delay: 50 });
  
  // Wait a bit for React to process
  await page.waitForTimeout(200);
  
  // Verify the password was filled
  const passwordValue = await passwordInput.inputValue();
  if (!passwordValue || passwordValue.length < 6) {
    throw new Error(`Password input value is invalid. Length: ${passwordValue?.length || 0}`);
  }
  
  // Set up network monitoring to catch login API response
  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/auth/login') && response.request().method() === 'POST',
    { timeout: 15000 }
  ).catch(() => null);
  
  // Submit the form
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  await submitButton.click();
  
  // Wait for the login API response
  const loginResponse = await loginResponsePromise;
  
  if (loginResponse) {
    const status = loginResponse.status();
    if (status !== 200 && status !== 201) {
      try {
        const errorBody = await loginResponse.json();
        throw new Error(`Login API returned ${status}: ${JSON.stringify(errorBody)}`);
      } catch {
        const errorText = await loginResponse.text().catch(() => 'Unknown error');
        throw new Error(`Login API returned ${status}: ${errorText}`);
      }
    }
  }
  
  // Wait for the /auth/me call that happens after login (for verification)
  const meResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/auth/me') && response.request().method() === 'GET',
    { timeout: 10000 }
  ).catch(() => null);
  
  // Wait for navigation to overview (success)
  // The login page calls getMe() after login, then redirects
  try {
    // Wait for either the redirect or the /auth/me call first
    await meResponsePromise;
    
    // After /auth/me, the page should redirect
    await page.waitForURL(/\/overview/, { timeout: 10000 });
    // Success!
    return;
  } catch (error) {
    // Check if we're already on overview (might have navigated quickly)
    try {
      const currentUrl = page.url();
      if (currentUrl.includes('/overview')) {
        return;
      }
      if (!currentUrl.includes('/login')) {
        // We're on a different page, assume success
        return;
      }
    } catch (urlError: any) {
      // If we can't get URL, page might be closed or navigating
      // Wait a moment and try again
      if (urlError?.message?.includes('closed') || urlError?.message?.includes('Target page')) {
        // Give it a moment for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 1000)).catch(() => {});
        try {
          const finalUrl = page.url();
          if (finalUrl.includes('/overview')) {
            return;
          }
        } catch {
          throw new Error('Page was closed during login process');
        }
      }
    }
    
    // Still on login page - wait a bit more for navigation
    try {
      // Use waitForLoadState instead of waitForTimeout to be more reliable
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
      const finalUrl = page.url();
      if (finalUrl.includes('/overview')) {
        return;
      }
    } catch (waitError: any) {
      // Ignore wait errors, continue to error checking
    }
    
    // Still on login - check for error message
    const errorElement = page.locator('[class*="error"], [class*="alert"], [role="alert"]').filter({ 
      hasNotText: /forgot|password|sign up|create account/i 
    });
    
    const errorCount = await errorElement.count();
    if (errorCount > 0) {
      const errorText = await errorElement.first().textContent();
      if (errorText && errorText.trim() && !errorText.toLowerCase().includes('forgot')) {
        throw new Error(`Login failed: ${errorText.trim()}`);
      }
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'login-error.png', fullPage: true });
    throw new Error('Login failed - still on login page after API call. Check login-error.png');
  }
  
  // Verify cookies are set
  const cookies = await page.context().cookies();
  const hasSessionCookie = cookies.some(c => c.name === 'sessionId' || c.name.includes('session'));
  if (!hasSessionCookie) {
    console.warn('Warning: sessionId cookie not found after UI login');
  }
}

/**
 * Wait for API request to complete
 */
export async function waitForApiRequest(
  page: Page,
  urlPattern: string | RegExp,
  method: string = 'GET'
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      const matchesUrl = typeof urlPattern === 'string' 
        ? url.includes(urlPattern)
        : urlPattern.test(url);
      return matchesUrl && response.request().method() === method;
    },
    { timeout: 10000 }
  );
}

