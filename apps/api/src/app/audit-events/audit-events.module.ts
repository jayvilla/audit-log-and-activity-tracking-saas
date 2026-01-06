import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventsController } from './audit-events.controller';
import { AuditEventsService } from './audit-events.service';
import { DemoSeedingService } from './demo-seeding.service';
import { AuditEventEntity } from '../../entities/audit-event.entity';
import { UserEntity } from '../../entities/user.entity';
import { ApiKeyEntity } from '../../entities/api-key.entity';
import { ApiKeyModule } from '../api-key/api-key.module';
import { AuthModule } from '../auth/auth.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditEventEntity, UserEntity, ApiKeyEntity]),
    ApiKeyModule,
    AuthModule,
    WebhooksModule,
  ],
  controllers: [AuditEventsController],
  providers: [AuditEventsService, DemoSeedingService],
  exports: [AuditEventsService, DemoSeedingService],
})
export class AuditEventsModule {}

