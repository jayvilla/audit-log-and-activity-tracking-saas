import {
  Entity,
  Column,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import type { Relation } from 'typeorm';
import { OrganizationEntity } from './organization.entity';

@Entity({ name: 'api_keys' })
@Index(['keyHash'], { unique: true })
export class ApiKeyEntity extends BaseEntity {
  @ManyToOne(() => OrganizationEntity, (org) => org.apiKeys, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'org_id' })
  organization: Relation<OrganizationEntity>;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'key_hash', type: 'varchar', length: 255, unique: true })
  keyHash: string;

  @Column({ name: 'key_prefix', type: 'varchar', length: 16, nullable: true })
  keyPrefix: string | null;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;
}

