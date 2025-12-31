import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity, ActorType } from '../../entities/audit-event.entity';
import { UserEntity } from '../../entities/user.entity';

/**
 * DEMO SEEDING SERVICE
 * 
 * This service seeds demo audit events for admin@example.com ONLY.
 * This is for MVP/demo purposes and should be removed post-MVP.
 * 
 * Demo data is:
 * - Only seeded for admin@example.com
 * - Idempotent (only seeds if no events exist)
 * - Marked with metadata: { demo: true }
 * - Scoped to the admin user's organization
 */
@Injectable()
export class DemoSeedingService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditEventRepository: Repository<AuditEventEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Seed demo audit events for admin@example.com if they don't exist
   * Returns true if seeding occurred, false if already seeded or not admin
   */
  async seedDemoDataIfNeeded(userEmail: string, orgId: string): Promise<boolean> {
    // DEMO: Only seed for admin@example.com
    if (userEmail !== 'admin@example.com') {
      return false;
    }

    // Check if demo events already exist (idempotent)
    // Use raw query to check for demo metadata in JSONB
    const existingDemoEvent = await this.auditEventRepository
      .createQueryBuilder('event')
      .where('event.orgId = :orgId', { orgId })
      .andWhere("event.metadata->>'demo' = 'true'")
      .limit(1)
      .getOne();

    if (existingDemoEvent) {
      // Already seeded, skip
      return false;
    }

    // Get the admin user to use as actor
    const adminUser = await this.userRepository.findOne({
      where: { email: 'admin@example.com', orgId },
    });

    if (!adminUser) {
      // Admin user doesn't exist, can't seed
      return false;
    }

    // Generate demo events spanning the past 30 days
    const now = new Date();
    const events: Partial<AuditEventEntity>[] = [];

    // Event types to seed (realistic audit log actions)
    const eventTemplates = [
      { action: 'login', resourceType: 'user', count: 120 },
      { action: 'logout', resourceType: 'user', count: 110 },
      { action: 'created', resourceType: 'api-key', count: 25 },
      { action: 'deleted', resourceType: 'api-key', count: 8 },
      { action: 'created', resourceType: 'webhook', count: 15 },
      { action: 'updated', resourceType: 'webhook', count: 12 },
      { action: 'delivered', resourceType: 'webhook', count: 180 },
      { action: 'failed', resourceType: 'webhook', count: 5 },
      { action: 'exported', resourceType: 'audit-event', count: 18 },
      { action: 'viewed', resourceType: 'audit-event', count: 250 },
      { action: 'password_reset', resourceType: 'user', count: 3 },
      { action: 'updated', resourceType: 'user', count: 15 },
    ];

    // Generate events with realistic timestamps over the past 30 days
    let eventId = 0;
    for (const template of eventTemplates) {
      for (let i = 0; i < template.count; i++) {
        // Distribute events over the past 30 days (more recent = more events)
        const daysAgo = Math.random() * 30;
        // Bias towards recent days (exponential distribution)
        const biasedDaysAgo = Math.pow(Math.random(), 0.7) * 30;
        const timestamp = new Date(now.getTime() - biasedDaysAgo * 24 * 60 * 60 * 1000);

        events.push({
          orgId,
          actorType: ActorType.USER,
          actorId: adminUser.id,
          action: template.action,
          resourceType: template.resourceType,
          resourceId: `demo-${template.resourceType}-${eventId++}`,
          metadata: {
            demo: true,
            // Add some realistic metadata
            source: i % 3 === 0 ? 'api' : 'web',
            userAgent: i % 5 === 0 ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' : null,
          },
          ipAddress: i % 4 === 0 ? `192.168.1.${Math.floor(Math.random() * 255)}` : null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }

    // Insert all events in batches
    const batchSize = 100;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      await this.auditEventRepository.save(
        batch.map((e) => this.auditEventRepository.create(e)),
      );
    }

    return true;
  }
}

