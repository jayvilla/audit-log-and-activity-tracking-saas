import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import type { Relation } from 'typeorm';
import { UserEntity } from './user.entity';
import { ApiKeyEntity } from './api-key.entity';
import { AuditEventEntity } from './audit-event.entity';
import { WebhookEntity } from './webhook.entity';
import { SavedViewEntity } from './saved-view.entity';

@Entity({ name: 'organizations' })
export class OrganizationEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  slug: string | null;

  @OneToMany(() => UserEntity, (user) => user.organization, {
    cascade: true,
  })
  users: Relation<UserEntity[]>;

  @OneToMany(() => ApiKeyEntity, (apiKey) => apiKey.organization, {
    cascade: true,
  })
  apiKeys: Relation<ApiKeyEntity[]>;

  @OneToMany(() => AuditEventEntity, (auditEvent) => auditEvent.organization, {
    cascade: true,
  })
  auditEvents: Relation<AuditEventEntity[]>;

  @OneToMany(() => WebhookEntity, (webhook) => webhook.organization, {
    cascade: true,
  })
  webhooks: Relation<WebhookEntity[]>;

  @OneToMany(() => SavedViewEntity, (savedView) => savedView.organization, {
    cascade: true,
  })
  savedViews: Relation<SavedViewEntity[]>;
}

