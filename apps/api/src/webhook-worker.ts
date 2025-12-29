/**
 * Webhook Worker Entry Point
 * 
 * This worker process polls for pending webhook deliveries and processes them
 * with retry logic and exponential backoff.
 * 
 * Run with: pnpm nx run api:webhook-worker
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { WebhookWorkerService } from './app/webhooks/webhook-worker.service';
import { WebhookEntity } from './entities/webhook.entity';
import { WebhookDeliveryEntity } from './entities/webhook-delivery.entity';

@Module({
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
        database: configService.get<string>('DB_DATABASE', 'postgres'),
        entities: [WebhookEntity, WebhookDeliveryEntity],
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
        ssl:
          configService.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([WebhookEntity, WebhookDeliveryEntity]),
  ],
  providers: [WebhookWorkerService],
})
class WebhookWorkerAppModule {}

async function bootstrap() {
  const logger = new Logger('WebhookWorker');

  // Create a minimal NestJS application context for the worker
  const app = await NestFactory.createApplicationContext(WebhookWorkerAppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  logger.log('Webhook worker started');
  logger.log('Press CTRL+C to stop the worker');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.log('Received SIGINT, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('Received SIGTERM, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start webhook worker:', error);
  process.exit(1);
});

