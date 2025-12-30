import { DataSource, DataSourceOptions } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use test database
const testDatabase = process.env.DB_DATABASE_TEST || 'audit_test';
const testDataSourceOptions = {
  ...dataSourceOptions,
  database: testDatabase,
} as DataSourceOptions;

let dataSource: DataSource;

export default async function globalSetup() {
  console.log('🔧 Setting up test database...');

  // Create test database if it doesn't exist
  const adminDataSource = new DataSource({
    ...dataSourceOptions,
    database: 'postgres', // Connect to default postgres DB to create test DB
  } as DataSourceOptions);

  try {
    await adminDataSource.initialize();
    const result = await adminDataSource.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [testDatabase],
    );
    if (result.length === 0) {
      await adminDataSource.query(`CREATE DATABASE ${testDatabase}`);
      console.log(`✅ Created test database: ${testDatabase}`);
    }
    await adminDataSource.destroy();
  } catch (error) {
    console.error('❌ Error creating test database:', error);
    throw error;
  }

  // Initialize data source and run migrations
  dataSource = new DataSource(testDataSourceOptions);
  await dataSource.initialize();
  console.log('✅ Test database connected');

  // Run migrations
  await dataSource.runMigrations();
  console.log('✅ Migrations completed');

  // Create session table for express-session
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
    )
    WITH (OIDS=FALSE);
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);
  console.log('✅ Session table created');

  await dataSource.destroy();
  console.log('✅ Global setup complete');
}

