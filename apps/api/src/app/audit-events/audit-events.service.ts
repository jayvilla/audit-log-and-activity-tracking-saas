import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual, LessThanOrEqual, ILike } from 'typeorm';
import { AuditEventEntity, ActorType } from '../../entities/audit-event.entity';
import type { CreateAuditEventRequest } from '@cursor-rules-monorepo/types';
import { GetAuditEventsDto } from './dto/get-audit-events.dto';

interface Cursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class AuditEventsService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditEventRepository: Repository<AuditEventEntity>,
  ) {}

  async createAuditEvent(
    orgId: string,
    request: CreateAuditEventRequest,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ id: string; createdAt: Date }> {
    // Map actor type from DTO to entity enum
    const actorTypeMap: Record<string, ActorType> = {
      user: ActorType.USER,
      'api-key': ActorType.API_KEY,
      system: ActorType.SYSTEM,
    };

    const auditEvent = this.auditEventRepository.create({
      orgId,
      actorType: actorTypeMap[request.actor.type] || ActorType.SYSTEM,
      actorId: request.actor.id,
      action: request.action,
      resourceType: request.resource.type,
      resourceId: request.resource.id,
      metadata: request.metadata || null,
      ipAddress: ipAddress || request.ipAddress || null,
      userAgent: userAgent || request.userAgent || null,
    });

    const saved = await this.auditEventRepository.save(auditEvent);

    return {
      id: saved.id,
      createdAt: saved.createdAt,
    };
  }

  async getAuditEvents(
    orgId: string,
    userId: string,
    userRole: string,
    query: GetAuditEventsDto,
  ): Promise<{
    data: Array<{
      id: string;
      orgId: string;
      actorType: string;
      actorId: string | null;
      action: string;
      resourceType: string;
      resourceId: string;
      metadata: Record<string, any> | null;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: string;
    }>;
    pageInfo: {
      nextCursor: string | null;
    };
  }> {
    const limit = Math.min(query.limit || 50, 100);
    const queryBuilder = this.auditEventRepository
      .createQueryBuilder('audit_event')
      .where('audit_event.orgId = :orgId', { orgId });

    // RBAC: member/user can only see their own user events
    // admin can see all org events
    if (userRole !== 'admin') {
      queryBuilder.andWhere('audit_event.actorType = :actorType', {
        actorType: ActorType.USER,
      });
      queryBuilder.andWhere('audit_event.actorId = :userId', { userId });
    }
    // admin/auditor can see all org events (no additional filter)

    // Parse cursor for pagination
    let cursor: Cursor | null = null;
    if (query.cursor) {
      try {
        const decoded = Buffer.from(query.cursor, 'base64').toString('utf-8');
        cursor = JSON.parse(decoded) as Cursor;
      } catch {
        // Invalid cursor, ignore
      }
    }

    // Apply cursor pagination (using createdAt, id for stable ordering)
    if (cursor) {
      queryBuilder.andWhere(
        '(audit_event.createdAt < :cursorCreatedAt OR (audit_event.createdAt = :cursorCreatedAt AND audit_event.id < :cursorId))',
        {
          cursorCreatedAt: cursor.createdAt,
          cursorId: cursor.id,
        },
      );
    }

    // Apply filters
    if (query.startDate) {
      queryBuilder.andWhere('audit_event.createdAt >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('audit_event.createdAt <= :endDate', {
        endDate: query.endDate,
      });
    }

    if (query.action) {
      queryBuilder.andWhere('audit_event.action = :action', {
        action: query.action,
      });
    }

    if (query.actorType) {
      const actorTypeMap: Record<string, ActorType> = {
        user: ActorType.USER,
        'api-key': ActorType.API_KEY,
        system: ActorType.SYSTEM,
      };
      queryBuilder.andWhere('audit_event.actorType = :actorType', {
        actorType: actorTypeMap[query.actorType],
      });
    }

    if (query.resourceType) {
      queryBuilder.andWhere('audit_event.resourceType = :resourceType', {
        resourceType: query.resourceType,
      });
    }

    if (query.resourceId) {
      queryBuilder.andWhere('audit_event.resourceId = :resourceId', {
        resourceId: query.resourceId,
      });
    }

    if (query.metadataText) {
      // Full-text search in JSONB metadata using PostgreSQL's JSONB operators
      queryBuilder.andWhere(
        "audit_event.metadata::text ILIKE :metadataText",
        {
          metadataText: `%${query.metadataText}%`,
        },
      );
    }

    // Order by createdAt DESC, id DESC for stable pagination
    // Uses index IDX_audit_events_org_created (orgId, createdAt)
    queryBuilder
      .orderBy('audit_event.createdAt', 'DESC')
      .addOrderBy('audit_event.id', 'DESC')
      .limit(limit + 1); // Fetch one extra to determine if there's a next page

    const events = await queryBuilder.getMany();

    // Determine next cursor
    let nextCursor: string | null = null;
    if (events.length > limit) {
      const lastEvent = events[limit - 1];
      const cursorData: Cursor = {
        createdAt: lastEvent.createdAt.toISOString(),
        id: lastEvent.id,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
      events.pop(); // Remove the extra item
    }

    // Map to response format
    const data = events.map((event) => ({
      id: event.id,
      orgId: event.orgId,
      actorType: event.actorType,
      actorId: event.actorId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      metadata: event.metadata,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      createdAt: event.createdAt.toISOString(),
    }));

    return {
      data,
      pageInfo: {
        nextCursor,
      },
    };
  }
}

