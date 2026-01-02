/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app/app.module';
import { initSentry } from './config/sentry.config';
import { SentryExceptionFilter } from './filters/sentry-exception.filter';
import { validateEnv } from './config/env.schema';

// Validate environment variables first (fail fast)
try {
  validateEnv();
} catch (error) {
  Logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Initialize Sentry as early as possible (after env validation)
initSentry();

// Use require for CommonJS modules that don't have proper ES module exports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const session = require('express-session');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const connectPgSimple = require('connect-pg-simple');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');
const PgSession = connectPgSimple(session);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Configure cookie parser (must be before session)
  app.use(cookieParser());

  // Configure CORS
  const webOrigin = configService.get<string>('WEB_ORIGIN', 'http://localhost:3000');
  app.enableCors({
    origin: webOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-api-key'],
  });

  // Configure express-session with PostgreSQL store
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const sessionSecret = configService.get<string>('SESSION_SECRET');
  
  if (!sessionSecret) {
    Logger.warn('⚠️  SESSION_SECRET not set. Using default secret (NOT SECURE FOR PRODUCTION)');
  }

  app.use(
    session({
      store: new PgSession({
        conObject: {
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          user: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_DATABASE', 'postgres'),
          ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        },
        tableName: 'session', // Table name for sessions
        createTableIfMissing: true,
      }),
      secret: sessionSecret || 'default-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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

  // Enable Sentry exception filter globally (only if Sentry is initialized)
  if (process.env.SENTRY_DSN) {
    app.useGlobalFilters(new SentryExceptionFilter());
  }

  // Configure OpenAPI document generation
  const config = new DocumentBuilder()
    .setTitle('Audit Logging API')
    .setDescription('API documentation for the Audit Logging and Activity Tracking application')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('app', 'Application endpoints')
    .addTag('audit-events', 'Audit event endpoints')
    .addTag('webhooks', 'Webhook endpoints')
    .addTag('api-key', 'API key management endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('orgs', 'Organization endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Serve OpenAPI JSON at /api/openapi.json
  app.getHttpAdapter().get('/api/openapi.json', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });

  // Serve Scalar API documentation at /api/docs (if enabled)
  const docsEnabled = configService.get<string>('DOCS_ENABLED', 'true') !== 'false';
  if (docsEnabled) {
    app.use(
      '/api/docs',
      apiReference({
        url: '/api/openapi.json',
      }),
    );
  }

  const port = process.env.PORT || 8000;
  
  try {
    await app.listen(port);
    Logger.log(
      `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
    );
    Logger.log(`🌐 CORS enabled for origin: ${webOrigin}`);
    if (docsEnabled) {
      Logger.log(`📚 API Documentation available at: http://localhost:${port}/${globalPrefix}/docs`);
      Logger.log(`📄 OpenAPI JSON available at: http://localhost:${port}/${globalPrefix}/openapi.json`);
    }
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      Logger.error(
        `❌ Port ${port} is already in use. Please stop the process using that port or set a different PORT in your .env file.`,
      );
      Logger.error(
        `   On Windows, run: Get-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess | Stop-Process -Force`,
      );
      process.exit(1);
    }
    throw error;
  }
}

bootstrap();
