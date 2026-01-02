import {
  Entity,
  Column,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import type { Relation } from 'typeorm';
import { WebhookEntity } from './webhook.entity';

@Entity({ name: 'webhook_deliveries' })
@Index(['webhook', 'createdAt'])
export class WebhookDeliveryEntity extends BaseEntity {
  @ManyToOne(() => WebhookEntity, (webhook) => webhook.deliveries, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'webhook_id' })
  webhook: Relation<WebhookEntity>;

  @Column({ name: 'webhook_id', type: 'uuid' })
  webhookId: string;

  @Column({ type: 'text' })
  payload: string;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number | null;

  @Column({ type: 'text', nullable: true })
  response: string | null;

  @Column({ name: 'attempted_at', type: 'timestamp' })
  attemptedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'next_retry_at', type: 'timestamp', nullable: true })
  nextRetryAt: Date | null;
}

