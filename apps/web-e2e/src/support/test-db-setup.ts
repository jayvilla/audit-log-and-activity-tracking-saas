/**
 * E2E Test Database Setup
 * 
 * Standalone version of the test database setup without Jest dependencies
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
} from '../../../api/src/entities';
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
      path.join(__dirname, '..', '..', '..', 'api', 'src', 'migrations', '*.ts'),
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
  await dataSource.runMigrations();
}

/**
 * Cleanup - close data source and stop container
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (testDataSource?.isInitialized) {
    await testDataSource.destroy();
    testDataSource = null;
  }
  
  if (container) {
    await container.stop();
    container = null;
  }
}

