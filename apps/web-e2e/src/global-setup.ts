/**
 * Global Setup for E2E Tests
 * 
 * Starts the test API server before all tests
 */

import { startTestApiServer } from './support/test-api-server';

async function globalSetup() {
  const apiUrl = await startTestApiServer();
  process.env.TEST_API_URL = apiUrl;
  console.log(`✅ Global setup complete. Test API available at ${apiUrl}`);
}

export default globalSetup;

