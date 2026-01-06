import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import type { Relation } from 'typeorm';
import { OrganizationEntity } from './organization.entity';

@Entity({ name: 'saved_views' })
@Index(['orgId', 'createdAt'])
export class SavedViewEntity extends BaseEntity {
  @ManyToOne(() => OrganizationEntity, (org) => org.savedViews, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'org_id' })
  organization: Relation<OrganizationEntity>;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb' })
  filters: {
    search?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    actors?: string[];
    actions?: string[];
    resources?: string[];
    statuses?: string[];
    actor?: string;
    resourceType?: string;
    resourceId?: string;
    ip?: string;
  };

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'use_count', type: 'int', default: 0 })
  useCount: number;
}

