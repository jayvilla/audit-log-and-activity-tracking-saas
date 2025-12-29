import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual, LessThanOrEqual, ILike } from 'typeorm';
import { AuditEventEntity, ActorType } from '../../entities/audit-event.entity';
import type { CreateAuditEventRequest } from '@cursor-rules-monorepo/types';
import { GetAuditEventsDto } from './dto/get-audit-events.dto';
import { Readable } from 'stream';

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
    const queryBuilder = this.buildFilteredQuery(orgId, userId, userRole, query);

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

    // Uses index IDX_audit_events_org_created (orgId, createdAt)
    queryBuilder.limit(limit + 1); // Fetch one extra to determine if there's a next page

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

  /**
   * Builds a query builder with filters applied (reused by export methods)
   */
  private buildFilteredQuery(
    orgId: string,
    userId: string,
    userRole: string,
    query: GetAuditEventsDto,
  ) {
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

    // Order by createdAt DESC, id DESC for consistent ordering
    queryBuilder
      .orderBy('audit_event.createdAt', 'DESC')
      .addOrderBy('audit_event.id', 'DESC');

    return queryBuilder;
  }

  /**
   * Export audit events as JSON (all results, no pagination)
   */
  async exportAsJson(
    orgId: string,
    userId: string,
    userRole: string,
    query: GetAuditEventsDto,
  ): Promise<Array<{
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
  }>> {
    const queryBuilder = this.buildFilteredQuery(orgId, userId, userRole, query);
    const events = await queryBuilder.getMany();

    return events.map((event) => ({
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
  }

  /**
   * Export audit events as CSV stream (streams results in chunks without loading all into memory)
   */
  async exportAsCsvStream(
    orgId: string,
    userId: string,
    userRole: string,
    query: GetAuditEventsDto,
  ): Promise<Readable> {
    // Create a readable stream (not in object mode, pushes strings)
    const stream = new Readable({
      read() {
        // This will be called by the stream consumer
      },
    });

    // Write CSV header first
    const csvHeader = [
      'id',
      'orgId',
      'actorType',
      'actorId',
      'action',
      'resourceType',
      'resourceId',
      'metadata',
      'ipAddress',
      'userAgent',
      'createdAt',
    ].join(',') + '\n';
    stream.push(csvHeader);

    // Helper function to escape CSV values
    const escapeCsvValue = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      // If contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Process in chunks to avoid loading all results into memory
    // Fetch in batches of 1000 records at a time
    const batchSize = 1000;
    let lastCursor: Cursor | null = null;
    let hasMore = true;

    (async () => {
      try {
        while (hasMore) {
          // Build query for this batch
          const queryBuilder = this.buildFilteredQuery(orgId, userId, userRole, query);

          // Apply cursor pagination if we have one
          if (lastCursor) {
            queryBuilder.andWhere(
              '(audit_event.createdAt < :cursorCreatedAt OR (audit_event.createdAt = :cursorCreatedAt AND audit_event.id < :cursorId))',
              {
                cursorCreatedAt: lastCursor.createdAt,
                cursorId: lastCursor.id,
              },
            );
          }

          // Fetch batch
          const events = await queryBuilder
            .limit(batchSize + 1) // Fetch one extra to check if there's more
            .getMany();

          // Process events in this batch
          const batchToProcess = events.slice(0, batchSize);
          for (const event of batchToProcess) {
            // Flatten metadata to JSON string
            const metadataJson = event.metadata 
              ? JSON.stringify(event.metadata) 
              : '';

            const row = [
              escapeCsvValue(event.id),
              escapeCsvValue(event.orgId),
              escapeCsvValue(event.actorType),
              escapeCsvValue(event.actorId),
              escapeCsvValue(event.action),
              escapeCsvValue(event.resourceType),
              escapeCsvValue(event.resourceId),
              escapeCsvValue(metadataJson),
              escapeCsvValue(event.ipAddress),
              escapeCsvValue(event.userAgent),
              escapeCsvValue(event.createdAt.toISOString()),
            ].join(',') + '\n';

            stream.push(row);
          }

          // Check if there are more records
          if (events.length > batchSize) {
            // Set cursor for next batch
            const lastEvent = events[batchSize - 1];
            lastCursor = {
              createdAt: lastEvent.createdAt.toISOString(),
              id: lastEvent.id,
            };
            hasMore = true;
          } else {
            hasMore = false;
          }
        }

        stream.push(null); // End of stream
      } catch (error) {
        stream.destroy(error as Error);
      }
    })();

    return stream;
  }
}

