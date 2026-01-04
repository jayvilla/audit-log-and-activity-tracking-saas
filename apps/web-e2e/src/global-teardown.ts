/**
 * Global Teardown for E2E Tests
 * 
 * Stops the test API server after all tests
 */

import { stopTestApiServer } from './support/test-api-server';

async function globalTeardown() {
  await stopTestApiServer();
  console.log('✅ Global teardown complete');
}

export default globalTeardown;

