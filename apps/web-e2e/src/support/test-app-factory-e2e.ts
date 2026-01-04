/**
 * E2E Test App Factory
 * 
 * Creates a NestJS application instance for E2E testing.
 * Standalone version without Jest dependencies.
 */

import 'reflect-metadata';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { AppModule } from '../../../api/src/app/app.module';
import { WebhookWorkerModule } from '../../../api/src/app/webhooks/webhook-worker.module';
import { WebhookWorkerService } from '../../../api/src/app/webhooks/webhook-worker.service';
import { getTestDataSource, cleanupTestDatabase } from './test-db-setup';

// Use require for CommonJS modules
// eslint-disable-next-line @typescript-eslint/no-var-requires
const session = require('express-session');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const connectPgSimple = require('connect-pg-simple');
const PgSession = connectPgSimple(session);

/**
 * Create a test NestJS application
 */
export async function createTestApp(): Promise<INestApplication> {
  const testDataSource = await getTestDataSource();
  
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            // Set extremely high rate limits for E2E tests to avoid 429 errors when tests run in parallel
            // All tests come from localhost, so they share the same rate limit bucket
            RATE_LIMIT_AUTH_MAX_REQUESTS: '1000000',
            RATE_LIMIT_AUDIT_INGEST_MAX_REQUESTS: '1000000',
            RATE_LIMIT_AUDIT_QUERY_MAX_REQUESTS: '1000000',
            RATE_LIMIT_API_KEY_MANAGEMENT_MAX_REQUESTS: '1000000',
          }),
        ],
      }),
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: () => {
          const options = testDataSource.options as PostgresConnectionOptions;
          return {
            type: 'postgres' as const,
            host: options.host,
            port: options.port,
            username: options.username,
            password: options.password,
            database: typeof options.database === 'string' ? options.database : undefined,
            entities: options.entities,
            synchronize: false,
            logging: false,
            ssl: false,
            extra: {
              max: 1,
              min: 1,
              idleTimeoutMillis: 0,
            },
          };
        },
      }),
      AppModule,
      WebhookWorkerModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  const configService = app.get(ConfigService);

  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-api-key'],
  });

  const sessionSecret = 'test-secret';
  
  const sessionStore = new PgSession({
    conObject: {
      host: (testDataSource.options as PostgresConnectionOptions).host,
      port: (testDataSource.options as PostgresConnectionOptions).port,
      user: (testDataSource.options as PostgresConnectionOptions).username as string,
      password: (testDataSource.options as PostgresConnectionOptions).password as string,
      database:
        typeof (testDataSource.options as PostgresConnectionOptions).database === 'string'
          ? (testDataSource.options as PostgresConnectionOptions).database
          : undefined,
      ssl: false,
    },
    tableName: 'session',
    createTableIfMissing: true,
  });
  
  if (sessionStore.pool) {
    sessionStore.pool.removeAllListeners('error');
    sessionStore.pool.on('error', (error: Error & { code?: string }) => {
      if (error?.code === '57P01' || error?.message?.includes('terminating connection')) {
        return;
      }
    });
  }
  
  (app as any).__sessionStore = sessionStore;
  
  app.use(
    session({
      store: sessionStore,
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
      name: 'sessionId',
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  await app.init();

  try {
    const webhookWorker = app.get(WebhookWorkerService, { strict: false });
    if (webhookWorker) {
      webhookWorker.stop();
    }
  } catch {
    // WebhookWorkerService not available, that's ok
  }

  return app;
}

/**
 * Close the test app and cleanup
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  const sessionStore = (app as any).__sessionStore;
  if (sessionStore?.pool) {
    try {
      const pool = sessionStore.pool;
      pool.removeAllListeners('error');
      await pool.end();
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
  
  await app.close();
  
  // Cleanup database
  await cleanupTestDatabase();
}

