/**
 * Phase 0 Test Setup
 * 
 * This file sets up the test environment:
 * - Initializes Testcontainers PostgreSQL
 * - Runs migrations
 * - Sets up cleanup between tests
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource, DataSourceOptions } from 'typeorm';
import {
  OrganizationEntity,
  UserEntity,
  ApiKeyEntity,
  AuditEventEntity,
  WebhookEntity,
  WebhookDeliveryEntity,
} from '../entities';
import * as path from 'path';

let container: StartedPostgreSqlContainer | null = null;
let testDataSource: DataSource | null = null;

/**
 * Get the test database container (creates if needed)
 */
export async function getTestContainer(): Promise<StartedPostgreSqlContainer> {
  if (!container) {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('audit_test')
      .withUsername('test')
      .withPassword('test')
      .start();
  }
  return container;
}

/**
 * Get test DataSource (creates if needed)
 */
export async function getTestDataSource(): Promise<DataSource> {
  if (testDataSource?.isInitialized) {
    return testDataSource;
  }

  const container = await getTestContainer();
  
  const options: DataSourceOptions = {
    type: 'postgres',
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    entities: [
      OrganizationEntity,
      UserEntity,
      ApiKeyEntity,
      AuditEventEntity,
      WebhookEntity,
      WebhookDeliveryEntity,
    ],
    migrations: [
      path.join(__dirname, '..', 'migrations', '*.ts'),
    ],
    synchronize: false, // Always use migrations
    logging: false,
    ssl: false,
    extra: {
      max: 1, // Single connection for tests
      min: 1,
      idleTimeoutMillis: 0,
    },
  };

  testDataSource = new DataSource(options);
  await testDataSource.initialize();

  // Run migrations
  await runMigrations(testDataSource);

  return testDataSource;
}

/**
 * Run TypeORM migrations on the test database
 */
async function runMigrations(dataSource: DataSource): Promise<void> {
  // Migrations are loaded via glob pattern in DataSource options
  // Run pending migrations
  await dataSource.runMigrations();
}

/**
 * Truncate all tables (except migrations table)
 */
export async function truncateAllTables(dataSource: DataSource): Promise<void> {
  // Check if session table exists before truncating
  const sessionTableExists = await dataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'session'
    );
  `);

  const tables = [
    'webhook_deliveries',
    'webhooks',
    'audit_events',
    'api_keys',
    'users',
    'organizations',
  ];

  // Add session table only if it exists
  if (sessionTableExists[0]?.exists) {
    tables.push('session');
  }

  await dataSource.query(`
    TRUNCATE TABLE ${tables.join(', ')}
    RESTART IDENTITY CASCADE;
  `);
}

// Global setup - runs once before all tests
beforeAll(async () => {
  await getTestDataSource();
});

// Cleanup between tests
afterEach(async () => {
  if (testDataSource?.isInitialized) {
    await truncateAllTables(testDataSource);
  }
});

// Global teardown - runs once after all tests
afterAll(async () => {
  if (testDataSource?.isInitialized) {
    await testDataSource.destroy();
  }
  if (container) {
    await container.stop();
  }
});

