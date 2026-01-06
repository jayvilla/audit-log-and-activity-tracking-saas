import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { AuditEventsModule } from './audit-events/audit-events.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { UsersModule } from './users/users.module';
import { OrgsModule } from './orgs/orgs.module';
import { SavedViewsModule } from './saved-views/saved-views.module';
import { CsrfGuard } from './auth/csrf.guard';
import {
  OrganizationEntity,
  UserEntity,
  ApiKeyEntity,
  AuditEventEntity,
  WebhookEntity,
  WebhookDeliveryEntity,
  SavedViewEntity,
} from '../entities';

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
        entities: [
          OrganizationEntity,
          UserEntity,
          ApiKeyEntity,
          AuditEventEntity,
          WebhookEntity,
          WebhookDeliveryEntity,
          SavedViewEntity,
        ],
        synchronize: false, // Never use synchronize in production
        logging: configService.get<string>('NODE_ENV') === 'development',
        ssl:
          configService.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      OrganizationEntity,
      UserEntity,
      ApiKeyEntity,
      AuditEventEntity,
      WebhookEntity,
      WebhookDeliveryEntity,
      SavedViewEntity,
    ]),
    AuthModule,
    ApiKeyModule,
    AuditEventsModule,
    WebhooksModule,
    UsersModule,
    OrgsModule,
    SavedViewsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
