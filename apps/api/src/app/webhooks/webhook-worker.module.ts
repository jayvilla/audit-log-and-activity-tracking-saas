import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookWorkerService } from './webhook-worker.service';
import { WebhookEntity } from '../../entities/webhook.entity';
import { WebhookDeliveryEntity } from '../../entities/webhook-delivery.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WebhookEntity, WebhookDeliveryEntity])],
  providers: [WebhookWorkerService],
  exports: [WebhookWorkerService],
})
export class WebhookWorkerModule {}

