import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  OrganizationEntity,
  UserEntity,
  ApiKeyEntity,
  AuditEventEntity,
  WebhookEntity,
  WebhookDeliveryEntity,
  SavedViewEntity,
} from '../entities';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * TypeORM DataSource configuration for migrations and CLI usage.
 * This file is used by TypeORM CLI for running migrations.
 *
 * Important:
 * - synchronize is set to false - NEVER enable this in production
 * - Use migrations for all schema changes
 * - Migrations path supports both .ts (development) and .js (production builds)
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'postgres',
  entities: [
    OrganizationEntity,
    UserEntity,
    ApiKeyEntity,
    AuditEventEntity,
    WebhookEntity,
    WebhookDeliveryEntity,
    SavedViewEntity,
  ],
  // Migrations path: supports both .ts (dev) and .js (prod builds)
  // Path is relative to apps/api/src (one level up from config/)
  // When running via ts-node in dev: resolves to .ts files
  // When running compiled in prod: resolves to .js files
  migrations: [
    path.join(__dirname, '..', 'migrations', '*.ts'),
    path.join(__dirname, '..', 'migrations', '*.js'),
  ],
  synchronize: false, // NEVER enable synchronize in production - use migrations instead
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: {
    // Prevent issues with enum types in migrations
    applicationName: 'audit-log-saas-api',
  },
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

