import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../app/app.module';
import {
  OrganizationEntity,
  UserEntity,
  ApiKeyEntity,
  AuditEventEntity,
  WebhookEntity,
  WebhookDeliveryEntity,
} from '../entities';

// Use require for CommonJS modules
// eslint-disable-next-line @typescript-eslint/no-var-requires
const session = require('express-session');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const connectPgSimple = require('connect-pg-simple');
const PgSession = connectPgSimple(session);

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
      }),
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_DATABASE_TEST', 'audit_test'),
          entities: [
            OrganizationEntity,
            UserEntity,
            ApiKeyEntity,
            AuditEventEntity,
            WebhookEntity,
            WebhookDeliveryEntity,
          ],
          synchronize: false,
          logging: false,
          ssl: false,
          // For tests, use a single connection to avoid connection pool isolation issues
          extra: {
            max: 1, // Limit connection pool to 1 for tests
          },
        }),
        inject: [ConfigService],
      }),
      AppModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  const configService = app.get(ConfigService);

  // Configure cookie parser (must be before session)
  app.use(cookieParser());

  // Configure CORS
  app.enableCors({
    origin: configService.get<string>('WEB_ORIGIN', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-api-key'],
  });

  // Configure express-session with PostgreSQL store
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const sessionSecret = configService.get<string>('SESSION_SECRET', 'test-secret');

  app.use(
    session({
      store: new PgSession({
        conObject: {
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          user: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_DATABASE_TEST', 'audit_test'),
          ssl: false,
        },
        tableName: 'session',
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
      name: 'sessionId',
    }),
  );

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Set global prefix to match main app
  app.setGlobalPrefix('api');

  await app.init();
  
  // Export the app's DataSource and UserRepository for test helpers to use
  // Get DataSource from TypeORM module using the default connection token
  try {
    const dataSource = app.get<DataSource>(getDataSourceToken());
    (global as any).__TEST_APP_DATA_SOURCE__ = dataSource;
    
    // Get the UserRepository using the same token that AuthService uses
    try {
      const userRepo = app.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
      (global as any).__TEST_APP_USER_REPO__ = userRepo;
      console.log('✅ Test app DataSource and UserRepository set for test helpers');
    } catch (repoError) {
      console.warn('⚠️  Could not get UserRepository, will use DataSource repository');
    }
  } catch (error) {
    // If DataSource injection fails, try getting it directly
    try {
      const dataSource = app.get<DataSource>(DataSource);
      (global as any).__TEST_APP_DATA_SOURCE__ = dataSource;
      console.log('✅ Test app DataSource set for test helpers (fallback method)');
    } catch (e) {
      // If DataSource injection fails, test helpers will fall back to setup DataSource
      console.warn('⚠️  Could not get DataSource from app, test helpers will use setup DataSource');
      console.warn('Error:', e);
    }
  }
  
  return app;
}

export function getTestAgent(app: INestApplication) {
  return request.agent(app.getHttpServer());
}

