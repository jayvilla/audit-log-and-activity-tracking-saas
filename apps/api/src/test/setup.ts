/// <reference types="jest" />
/// <reference path="../types/express-session.d.ts" />
import { DataSource, DataSourceOptions } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import * as dotenv from 'dotenv';

dotenv.config();

// Use test database
const testDataSourceOptions = {
  ...dataSourceOptions,
  database: process.env.DB_DATABASE_TEST || 'audit_test',
} as DataSourceOptions;

let testDataSource: DataSource;

beforeAll(async () => {
  // Initialize data source for tests
  testDataSource = new DataSource(testDataSourceOptions);
  await testDataSource.initialize();
});

afterEach(async () => {
  // Clean up database between tests
  if (testDataSource && testDataSource.isInitialized) {
    // Truncate all tables to reset state
    await testDataSource.query(`
      TRUNCATE TABLE 
        webhook_deliveries,
        webhooks,
        audit_events,
        api_keys,
        users,
        organizations,
        session
      RESTART IDENTITY CASCADE;
    `);
  }
});

afterAll(async () => {
  // Close data source after all tests
  if (testDataSource && testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
});

// Export data source for use in tests
export function getTestDataSource(): DataSource {
  return testDataSource;
}

