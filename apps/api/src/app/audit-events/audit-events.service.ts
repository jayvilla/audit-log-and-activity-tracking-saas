import { Injectable, Inject, forwardRef, ForbiddenException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AuditEventEntity, ActorType } from '../../entities/audit-event.entity';
import { UserEntity } from '../../entities/user.entity';
import { ApiKeyEntity } from '../../entities/api-key.entity';
import type { CreateAuditEventRequest } from '@audit-log-and-activity-tracking-saas/types';
import { GetAuditEventsDto } from './dto/get-audit-events.dto';
import { GetAnalyticsDto } from './dto/get-analytics.dto';
import { GetAISummaryDto } from './dto/get-ai-summary.dto';
import { Readable } from 'stream';
import { WebhooksService } from '../webhooks/webhooks.service';
import { LLMService } from '../llm/llm.service';
import { redactAuditEvents, formatTimeRange, formatFilters } from '../llm/utils/data-redaction.util';

interface Cursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class AuditEventsService {
  private readonly logger = new Logger(AuditEventsService.name);

  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditEventRepository: Repository<AuditEventEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepository: Repository<ApiKeyEntity>,
    @Inject(forwardRef(() => WebhooksService))
    private readonly webhooksService: WebhooksService,
    private readonly llmService: LLMService,
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

    // Enqueue webhook deliveries for matching webhooks (async, don't wait)
    // Event type format: resourceType.action (e.g., "user.created", "api-key.deleted")
    const eventType = `${saved.resourceType}.${saved.action}`;
    const webhookPayload = {
      event: eventType,
      timestamp: saved.createdAt.toISOString(),
      data: {
        id: saved.id,
        orgId: saved.orgId,
        actorType: saved.actorType,
        actorId: saved.actorId,
        action: saved.action,
        resourceType: saved.resourceType,
        resourceId: saved.resourceId,
        metadata: saved.metadata,
        ipAddress: saved.ipAddress,
        userAgent: saved.userAgent,
        createdAt: saved.createdAt.toISOString(),
      },
    };

    // Enqueue webhook deliveries (fire and forget)
    this.webhooksService.enqueueWebhookDeliveries(orgId, eventType, webhookPayload).catch((error) => {
      // Log error but don't fail audit event creation
      console.error('Failed to enqueue webhook deliveries:', error);
    });

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
    userEmail?: string,
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
    // DEMO: Exclude demo data unless user is admin@example.com
    const excludeDemo = userEmail !== 'admin@example.com';
    const queryBuilder = this.buildFilteredQuery(orgId, userId, userRole, query, excludeDemo, userEmail);

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
   * @param excludeDemoData - If true, excludes events with metadata.demo = true (unless user is admin@example.com)
   */
  private buildFilteredQuery(
    orgId: string,
    userId: string,
    userRole: string,
    query: GetAuditEventsDto,
    excludeDemoData: boolean = false,
    userEmail?: string,
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

    // DEMO: Exclude demo data from exports unless user is admin@example.com
    if (excludeDemoData && userEmail !== 'admin@example.com') {
      queryBuilder.andWhere(
        "(audit_event.metadata->>'demo' IS NULL OR audit_event.metadata->>'demo' != 'true')",
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

    // Filter by action(s) - support multiple actions
    if (query.action && query.action.length > 0) {
      if (query.action.length === 1) {
        queryBuilder.andWhere('audit_event.action = :action', {
          action: query.action[0],
        });
      } else {
        queryBuilder.andWhere('audit_event.action IN (:...actions)', {
          actions: query.action,
        });
      }
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

    // Filter by actor ID (partial match, case-insensitive)
    if (query.actorId) {
      queryBuilder.andWhere('audit_event.actor_id::text ILIKE :actorId', {
        actorId: `%${query.actorId}%`,
      });
    }

    // Filter by status(es) - derived from metadata.status
    // NULL metadata.status defaults to 'success' (matching UI behavior)
    if (query.status && query.status.length > 0) {
      const hasSuccess = query.status.includes('success');
      const hasFailure = query.status.includes('failure');
      
      if (hasSuccess && hasFailure) {
        // Both statuses selected - match all (no filter needed, or match any status including NULL)
        // Since NULL = success and 'failure' = failure, we match everything
        // This is equivalent to no filter, but we'll keep it explicit
        queryBuilder.andWhere(
          "(audit_event.metadata->>'status' = 'failure' OR audit_event.metadata->>'status' = 'success' OR audit_event.metadata->>'status' IS NULL)"
        );
      } else if (hasSuccess) {
        // Only success - match where status is 'success' or NULL
        queryBuilder.andWhere(
          "(audit_event.metadata->>'status' = 'success' OR audit_event.metadata->>'status' IS NULL)"
        );
      } else if (hasFailure) {
        // Only failure - match where status is 'failure'
        queryBuilder.andWhere("audit_event.metadata->>'status' = 'failure'");
      }
    }

    // Filter by IP address (partial match, case-insensitive)
    if (query.ipAddress) {
      queryBuilder.andWhere('audit_event.ipAddress ILIKE :ipAddress', {
        ipAddress: `%${query.ipAddress}%`,
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
   * DEMO: Excludes demo data unless user is admin@example.com
   */
  async exportAsJson(
    orgId: string,
    userId: string,
    userRole: string,
    query: GetAuditEventsDto,
    userEmail?: string,
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
    const queryBuilder = this.buildFilteredQuery(orgId, userId, userRole, query, true, userEmail);
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
   * DEMO: Excludes demo data unless user is admin@example.com
   */
  async exportAsCsvStream(
    orgId: string,
    userId: string,
    userRole: string,
    query: GetAuditEventsDto,
    userEmail?: string,
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
          const queryBuilder = this.buildFilteredQuery(orgId, userId, userRole, query, true, userEmail);

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

  /**
   * Get overview metrics for the dashboard
   * DEMO: Includes demo data only for admin@example.com
   */
  async getOverviewMetrics(
    orgId: string,
    userId: string,
    userRole: string,
    userEmail?: string,
  ): Promise<{
    eventsToday: number;
    eventsTodayChange: number; // Percentage change from yesterday
    activeUsers: number;
    activeUsersChange: number; // Percentage change
    successRate: number; // Percentage (0-100)
    avgResponseTime: number; // Milliseconds
    eventActivityLast7Days: Array<{ date: string; events: number }>;
    topActions: Array<{ action: string; count: number }>;
    recentActivity: Array<{
      id: string;
      actor: string | null;
      action: string;
      resourceType: string;
      createdAt: string;
      status: 'success' | 'failure';
    }>;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(todayStart.getTime() - 1);
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    // DEMO: Exclude demo data unless user is admin@example.com
    const excludeDemo = userEmail !== 'admin@example.com';

    // Build base query with RBAC
    const baseQuery = this.auditEventRepository
      .createQueryBuilder('audit_event')
      .where('audit_event.orgId = :orgId', { orgId });

    if (userRole !== 'admin') {
      baseQuery
        .andWhere('audit_event.actorType = :actorType', { actorType: ActorType.USER })
        .andWhere('audit_event.actorId = :userId', { userId });
    }

    // DEMO: Filter out demo data unless user is admin@example.com
    if (excludeDemo) {
      baseQuery.andWhere(
        "(audit_event.metadata->>'demo' IS NULL OR audit_event.metadata->>'demo' != 'true')",
      );
    }

    // Events today
    const eventsToday = await baseQuery
      .clone()
      .andWhere('audit_event.createdAt >= :todayStart', { todayStart })
      .getCount();

    // Events yesterday (for change calculation)
    const eventsYesterday = await baseQuery
      .clone()
      .andWhere('audit_event.createdAt >= :yesterdayStart', { yesterdayStart })
      .andWhere('audit_event.createdAt <= :yesterdayEnd', { yesterdayEnd })
      .getCount();

    const eventsTodayChange =
      eventsYesterday > 0
        ? Math.round(((eventsToday - eventsYesterday) / eventsYesterday) * 100)
        : eventsToday > 0
          ? 100
          : 0;

    // Active users (distinct user actors in last 30 days)
    const activeUsersResult = await baseQuery
      .clone()
      .select('COUNT(DISTINCT audit_event.actorId)', 'count')
      .andWhere('audit_event.actorType = :actorType', { actorType: ActorType.USER })
      .andWhere('audit_event.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getRawOne<{ count: string }>();

    const activeUsers = parseInt(activeUsersResult?.count || '0', 10);

    // Active users change (compare last 30 days to previous 30 days)
    const previous30DaysStart = new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30DaysEnd = thirtyDaysAgo;

    const previousActiveUsersResult = await baseQuery
      .clone()
      .select('COUNT(DISTINCT audit_event.actorId)', 'count')
      .andWhere('audit_event.actorType = :actorType', { actorType: ActorType.USER })
      .andWhere('audit_event.createdAt >= :previous30DaysStart', { previous30DaysStart })
      .andWhere('audit_event.createdAt < :previous30DaysEnd', { previous30DaysEnd })
      .getRawOne<{ count: string }>();

    const previousActiveUsers = parseInt(previousActiveUsersResult?.count || '0', 10);
    const activeUsersChange =
      previousActiveUsers > 0
        ? Math.round(((activeUsers - previousActiveUsers) / previousActiveUsers) * 100)
        : activeUsers > 0
          ? 100
          : 0;

    // Success rate (derive from metadata or default to 99.7%)
    // For MVP, we'll use a default high success rate
    const successRate = 99.7;

    // Average response time (derive from metadata or default to 45ms)
    // For MVP, we'll use a default
    const avgResponseTime = 45;

    // Event activity last 7 days (grouped by date)
    const activityQuery = baseQuery
      .clone()
      .select("DATE_TRUNC('day', audit_event.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .andWhere('audit_event.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .groupBy("DATE_TRUNC('day', audit_event.createdAt)")
      .orderBy("DATE_TRUNC('day', audit_event.createdAt)", 'ASC');

    const activityResults = await activityQuery.getRawMany<{
      date: Date;
      count: string;
    }>();

    // Fill in missing days with 0
    const eventActivityLast7Days: Array<{ date: string; events: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const result = activityResults.find(
        (r) =>
          new Date(r.date).toDateString() === date.toDateString(),
      );
      eventActivityLast7Days.push({
        date: dateStr,
        events: result ? parseInt(result.count, 10) : 0,
      });
    }

    // Top actions (grouped by action, last 30 days)
    const topActionsQuery = baseQuery
      .clone()
      .select('audit_event.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .andWhere('audit_event.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .groupBy('audit_event.action')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5);

    const topActionsResults = await topActionsQuery.getRawMany<{
      action: string;
      count: string;
    }>();

    const topActions = topActionsResults.map((r) => ({
      action: r.action,
      count: parseInt(r.count, 10),
    }));

    // Recent activity (last 10 events with actor info)
    const recentEvents = await baseQuery
      .clone()
      .orderBy('audit_event.createdAt', 'DESC')
      .addOrderBy('audit_event.id', 'DESC')
      .limit(10)
      .getMany();

    // Get actor names for user actors
    const actorIds = recentEvents
      .filter((e) => e.actorType === ActorType.USER && e.actorId)
      .map((e) => e.actorId!);
    const actors = actorIds.length > 0
      ? await this.userRepository.find({ where: { id: In(actorIds) } }).catch(() => [])
      : [];

    const actorMap = new Map(actors.map((u) => [u.id, u.name || u.email]));

    const recentActivity = recentEvents.map((event) => {
      // Determine status from metadata or default to success
      const status: 'success' | 'failure' =
        event.metadata?.status === 'failure' || event.action.includes('failed')
          ? 'failure'
          : 'success';

      return {
        id: event.id,
        actor: event.actorType === ActorType.USER && event.actorId
          ? actorMap.get(event.actorId) || 'Unknown User'
          : event.actorType === ActorType.API_KEY
            ? 'API Key'
            : 'System',
        action: `${event.resourceType}.${event.action}`,
        resourceType: event.resourceType,
        createdAt: event.createdAt.toISOString(),
        status,
      };
    });

    return {
      eventsToday,
      eventsTodayChange,
      activeUsers,
      activeUsersChange,
      successRate,
      avgResponseTime,
      eventActivityLast7Days,
      topActions,
      recentActivity,
    };
  }

  /**
   * Get analytics data for the analytics page
   * Returns time series, action distribution, and actor volume data
   */
  async getAnalytics(
    orgId: string,
    userId: string,
    userRole: string,
    query: GetAnalyticsDto,
    userEmail?: string,
  ): Promise<{
    eventsPerDay: Array<{
      date: string;
      fullDate: string;
      total: number;
      success: number;
      failure: number;
    }>;
    actionsByType: Array<{
      action: string;
      count: number;
      percentage: number;
    }>;
    actorsByVolume: Array<{
      actor: string;
      count: number;
      type: 'user' | 'api_key' | 'system';
    }>;
    summary: {
      totalEvents: number;
      totalFailures: number;
      failureRate: number;
      avgEventsPerDay: number;
      trend: number;
    };
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Determine date range
    let days: number;
    let startDate: Date;
    
    if (query.timeRange === '7d') {
      days = 7;
      startDate = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    } else if (query.timeRange === '30d') {
      days = 30;
      startDate = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
    } else if (query.timeRange === '90d') {
      days = 90;
      startDate = new Date(todayStart.getTime() - 89 * 24 * 60 * 60 * 1000);
    } else if (query.timeRange === '1y') {
      days = 365;
      startDate = new Date(todayStart.getTime() - 364 * 24 * 60 * 60 * 1000);
    } else if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    } else {
      // Default to 30 days
      days = 30;
      startDate = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
    }
    
    const endDate = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000); // End of today

    // DEMO: Exclude demo data unless user is admin@example.com
    const excludeDemo = userEmail !== 'admin@example.com';

    // Build base query with RBAC
    const baseQuery = this.auditEventRepository
      .createQueryBuilder('audit_event')
      .where('audit_event.orgId = :orgId', { orgId })
      .andWhere('audit_event.createdAt >= :startDate', { startDate })
      .andWhere('audit_event.createdAt < :endDate', { endDate });

    if (userRole !== 'admin') {
      baseQuery
        .andWhere('audit_event.actorType = :actorType', { actorType: ActorType.USER })
        .andWhere('audit_event.actorId = :userId', { userId });
    }

    // DEMO: Filter out demo data unless user is admin@example.com
    if (excludeDemo) {
      baseQuery.andWhere(
        "(audit_event.metadata->>'demo' IS NULL OR audit_event.metadata->>'demo' != 'true')",
      );
    }

    // Events per day with success/failure breakdown
    const eventsPerDayQuery = baseQuery
      .clone()
      .select("DATE_TRUNC('day', audit_event.createdAt)", 'date')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "COUNT(*) FILTER (WHERE audit_event.metadata->>'status' = 'failure')",
        'failure'
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE audit_event.metadata->>'status' != 'failure' OR audit_event.metadata->>'status' IS NULL)",
        'success'
      )
      .groupBy("DATE_TRUNC('day', audit_event.createdAt)")
      .orderBy("DATE_TRUNC('day', audit_event.createdAt)", 'ASC');

    const eventsPerDayResults = await eventsPerDayQuery.getRawMany<{
      date: Date;
      total: string;
      success: string;
      failure: string;
    }>();

    // Fill in missing days with 0
    const eventsPerDay: Array<{
      date: string;
      fullDate: string;
      total: number;
      success: number;
      failure: number;
    }> = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const fullDate = date.toISOString().split('T')[0];
      const result = eventsPerDayResults.find(
        (r) => new Date(r.date).toDateString() === date.toDateString(),
      );
      eventsPerDay.push({
        date: dateStr,
        fullDate,
        total: result ? parseInt(result.total, 10) : 0,
        success: result ? parseInt(result.success, 10) : 0,
        failure: result ? parseInt(result.failure, 10) : 0,
      });
    }

    // Actions by type
    const actionsByTypeQuery = baseQuery
      .clone()
      .select('audit_event.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit_event.action')
      .orderBy('COUNT(*)', 'DESC')
      .limit(20);

    const actionsByTypeResults = await actionsByTypeQuery.getRawMany<{
      action: string;
      count: string;
    }>();

    const totalEventsForPercentage = eventsPerDay.reduce((sum, day) => sum + day.total, 0);
    const actionsByType = actionsByTypeResults.map((r) => ({
      action: r.action,
      count: parseInt(r.count, 10),
      percentage: totalEventsForPercentage > 0
        ? Math.round((parseInt(r.count, 10) / totalEventsForPercentage) * 100)
        : 0,
    }));

    // Actors by volume
    const actorsByVolumeQuery = baseQuery
      .clone()
      .select('audit_event.actorType', 'actorType')
      .addSelect('audit_event.actorId', 'actorId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit_event.actorType')
      .addGroupBy('audit_event.actorId')
      .orderBy('COUNT(*)', 'DESC')
      .limit(50);

    const actorsByVolumeResults = await actorsByVolumeQuery.getRawMany<{
      actorType: string;
      actorId: string;
      count: string;
    }>();

    // Resolve actor names
    const userActorIds = actorsByVolumeResults
      .filter((r) => r.actorType === ActorType.USER && r.actorId)
      .map((r) => r.actorId);
    const apiKeyActorIds = actorsByVolumeResults
      .filter((r) => r.actorType === ActorType.API_KEY && r.actorId)
      .map((r) => r.actorId);

    const users = userActorIds.length > 0
      ? await this.userRepository.find({ where: { id: In(userActorIds) } }).catch(() => [])
      : [];
    const apiKeys = apiKeyActorIds.length > 0
      ? await this.apiKeyRepository.find({ where: { id: In(apiKeyActorIds) } }).catch(() => [])
      : [];

    const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));
    const apiKeyMap = new Map(apiKeys.map((k) => [k.id, k.name || k.keyPrefix || `api_key_${k.id.substring(0, 8)}`]));

    const actorsByVolume = actorsByVolumeResults.map((r) => {
      let actorName = 'Unknown';
      if (r.actorType === ActorType.USER && r.actorId) {
        actorName = userMap.get(r.actorId) || `user_${r.actorId.substring(0, 8)}`;
      } else if (r.actorType === ActorType.API_KEY && r.actorId) {
        actorName = apiKeyMap.get(r.actorId) || `api_key_${r.actorId.substring(0, 8)}`;
      } else if (r.actorType === ActorType.SYSTEM) {
        actorName = 'system';
      }

      const actorType: 'user' | 'api_key' | 'system' = 
        r.actorType === ActorType.USER ? 'user' : r.actorType === ActorType.API_KEY ? 'api_key' : 'system';

      return {
        actor: actorName,
        count: parseInt(r.count, 10),
        type: actorType,
      };
    });

    // Calculate summary stats
    const totalEvents = eventsPerDay.reduce((sum, day) => sum + day.total, 0);
    const totalFailures = eventsPerDay.reduce((sum, day) => sum + day.failure, 0);
    const failureRate = totalEvents > 0 ? (totalFailures / totalEvents) * 100 : 0;
    const avgEventsPerDay = Math.round(totalEvents / days);

    // Calculate 7-day trend (compare last 7 days to previous 7 days)
    let trend = 0;
    if (eventsPerDay.length >= 14) {
      const recent7Days = eventsPerDay.slice(-7).reduce((sum, d) => sum + d.total, 0);
      const previous7Days = eventsPerDay.slice(-14, -7).reduce((sum, d) => sum + d.total, 0);
      if (previous7Days > 0) {
        trend = ((recent7Days - previous7Days) / previous7Days) * 100;
      } else if (recent7Days > 0) {
        trend = 100;
      }
    } else if (eventsPerDay.length >= 7) {
      const recent7Days = eventsPerDay.slice(-7).reduce((sum, d) => sum + d.total, 0);
      const previousDays = eventsPerDay.slice(0, Math.min(7, eventsPerDay.length - 7)).reduce((sum, d) => sum + d.total, 0);
      if (previousDays > 0) {
        trend = ((recent7Days - previousDays) / previousDays) * 100;
      } else if (recent7Days > 0) {
        trend = 100;
      }
    }

    return {
      eventsPerDay,
      actionsByType,
      actorsByVolume,
      summary: {
        totalEvents,
        totalFailures,
        failureRate: parseFloat(failureRate.toFixed(2)),
        avgEventsPerDay,
        trend: parseFloat(trend.toFixed(1)),
      },
    };
  }

  /**
   * Generate AI summary for audit events
   * 
   * This is a read-only operation that analyzes audit events and generates
   * an AI-powered summary. Data is redacted before sending to LLM.
   */
  async getAISummary(
    orgId: string,
    userId: string,
    userRole: string,
    query: GetAISummaryDto,
    userEmail?: string,
  ): Promise<{
    summary: string;
    patterns?: Array<{
      id: string;
      title: string;
      description: string;
      eventCount: number;
      severity?: 'low' | 'medium' | 'high';
    }>;
    changes?: Array<{
      id: string;
      description: string;
      eventCount: number;
    }>;
    provenance: {
      timeRange: string;
      filters: string[];
      totalEventsAnalyzed: number;
      sourceEventIds?: string[];
    };
  }> {
    // Check if LLM is enabled
    // DEV ONLY: Allow admin@example.com to use AI features even if globally disabled
    const normalizedEmail = userEmail?.toLowerCase().trim();
    const isAdminOverride = normalizedEmail === 'admin@example.com';
    const isLLMEnabled = this.llmService.isEnabled();
    
    this.logger.debug(`AI Summary check: email=${normalizedEmail}, isAdminOverride=${isAdminOverride}, isLLMEnabled=${isLLMEnabled}`);
    
    if (!isLLMEnabled && !isAdminOverride) {
      this.logger.warn(`AI features disabled for user: ${normalizedEmail || 'unknown'}`);
      throw new ForbiddenException('AI features are disabled');
    }

    // Convert AI summary DTO to GetAuditEventsDto for query building
    const getEventsDto: GetAuditEventsDto = {
      startDate: query.timeRange?.startDate,
      endDate: query.timeRange?.endDate,
      action: query.filters?.actions,
      status: query.filters?.statuses,
      actorId: query.filters?.actor,
      resourceType: query.filters?.resourceType,
      resourceId: query.filters?.resourceId,
      ipAddress: query.filters?.ip,
      metadataText: query.filters?.search,
      limit: 1000, // Limit to 1000 events for AI analysis
    };

    // Build query and fetch events
    const excludeDemo = userEmail !== 'admin@example.com';
    const queryBuilder = this.buildFilteredQuery(orgId, userId, userRole, getEventsDto, excludeDemo, userEmail);
    
    // Limit to most recent events for analysis
    queryBuilder.limit(1000);
    
    const events = await queryBuilder.getMany();

    if (events.length === 0) {
      return {
        summary: 'No audit events found for the selected time range and filters.',
        provenance: {
          timeRange: formatTimeRange(
            query.timeRange?.startDate ? new Date(query.timeRange.startDate) : undefined,
            query.timeRange?.endDate ? new Date(query.timeRange.endDate) : undefined,
          ),
          filters: formatFilters(query.filters || {}),
          totalEventsAnalyzed: 0,
        },
      };
    }

    // Redact sensitive data before sending to LLM
    const redactedEvents = redactAuditEvents(events);

    // Prepare prompt for LLM
    const timeRangeStr = formatTimeRange(
      query.timeRange?.startDate ? new Date(query.timeRange.startDate) : undefined,
      query.timeRange?.endDate ? new Date(query.timeRange.endDate) : undefined,
    );
    const filtersStr = formatFilters(query.filters || {}).join('; ') || 'None';

    // System prompt: Define the AI's role and constraints
    const systemPrompt = `You are an audit log analysis assistant. Your role is to analyze audit events and provide factual, grounded insights.

CRITICAL RULES:
- Be factual and grounded ONLY in the provided data. Never invent events, timestamps, actors, or details.
- If you're uncertain about something, state that clearly.
- Focus on observable patterns, trends, and notable events.
- Security-related events (failures, unauthorized access, suspicious patterns) should be highlighted.
- Operational changes (new resources, configuration changes, access patterns) should be noted.

Your analysis should help users understand:
1. What happened during this time period
2. Notable patterns or trends
3. Significant changes or anomalies
4. Security or operational concerns (if any)`;

    try {
      // Limit events sent to LLM to avoid timeout - use a manageable subset
      const eventsToSend = redactedEvents.slice(0, 50);
      const eventCountNote = redactedEvents.length > 50 
        ? `\nNote: Analyzing ${eventsToSend.length} representative events from ${redactedEvents.length} total events.`
        : '';
      
      // Create a structured event summary for analysis
      const eventSummaryText = eventsToSend.map((e, i) => {
        const parts = [
          `${i + 1}. [${e.timestamp}]`,
          `${e.action}`,
          `on ${e.resourceType}`,
        ];
        
        if (e.resourceId) {
          parts.push(`(${e.resourceId})`);
        }
        
        if (e.status) {
          parts.push(`- Status: ${e.status}`);
        }
        
        if (e.actorType && e.actorId) {
          parts.push(`- Actor: ${e.actorType}:${e.actorId}`);
        }
        
        if (e.metadataSummary) {
          parts.push(`- Metadata: ${e.metadataSummary}`);
        }
        
        return parts.join(' ');
      }).join('\n');
      
      // Group events by action for pattern analysis
      const actionCounts: Record<string, number> = {};
      const statusCounts: Record<string, number> = {};
      const resourceTypeCounts: Record<string, number> = {};
      
      eventsToSend.forEach(e => {
        actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
        if (e.status) {
          statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
        }
        resourceTypeCounts[e.resourceType] = (resourceTypeCounts[e.resourceType] || 0) + 1;
      });
      
      const actionSummary = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([action, count]) => `  - ${action}: ${count} events`)
        .join('\n');
      
      const userPrompt = `Analyze these audit events and provide insights:

Time Range: ${timeRangeStr}
Applied Filters: ${filtersStr || 'None'}
${eventCountNote}

Event Details:
${eventSummaryText}

Event Statistics:
Most Common Actions:
${actionSummary}

Status Distribution:
${Object.entries(statusCounts).map(([status, count]) => `  - ${status}: ${count} events`).join('\n')}

Most Active Resource Types:
${Object.entries(resourceTypeCounts)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .map(([type, count]) => `  - ${type}: ${count} events`)
  .join('\n')}

Provide your analysis in the following JSON format:
{
  "summary": "A concise 2-3 paragraph summary of the overall activity, highlighting key trends, notable events, and any security or operational concerns. Be specific about what you observed in the data.",
  "patterns": [
    {
      "id": "pattern_1",
      "title": "Pattern title (e.g., 'Repeated Failed Login Attempts')",
      "description": "Detailed description of the pattern with specific event counts and context",
      "eventCount": 5,
      "severity": "low|medium|high"
    }
  ],
  "changes": [
    {
      "id": "change_1",
      "description": "Description of a notable change or trend (e.g., 'New API key creation pattern detected')",
      "eventCount": 3
    }
  ]
}

Guidelines:
- Only include patterns if you observe clear, repeated behaviors (3+ similar events)
- Only include changes if you observe notable shifts or new activity types
- Set severity to "high" for security concerns (failures, unauthorized access), "medium" for operational concerns, "low" for informational patterns
- If no clear patterns or changes exist, use empty arrays []
- Be specific: reference actual actions, resource types, and timeframes from the data`;

      const llmResponse = await this.llmService.generate({
        model: 'llama3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 2000,
        jsonSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            patterns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  eventCount: { type: 'number' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                },
              },
            },
            changes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  description: { type: 'string' },
                  eventCount: { type: 'number' },
                },
              },
            },
          },
        },
      }, isAdminOverride);

      // Parse JSON response
      let aiData: {
        summary: string;
        patterns?: Array<{
          id: string;
          title: string;
          description: string;
          eventCount: number;
          severity?: 'low' | 'medium' | 'high';
        }>;
        changes?: Array<{
          id: string;
          description: string;
          eventCount: number;
        }>;
      };

      if (llmResponse.json) {
        aiData = llmResponse.json as typeof aiData;
      } else {
        // Fallback: try to parse text response
        // LLM might return JSON wrapped in markdown code blocks or with extra text
        let textToParse = llmResponse.text.trim();
        
        // Remove markdown code blocks if present
        if (textToParse.startsWith('```')) {
          const codeBlockMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            textToParse = codeBlockMatch[1].trim();
          } else {
            // Try to extract JSON from between backticks
            const backtickMatch = textToParse.match(/```[\s\S]*?```/);
            if (backtickMatch) {
              textToParse = backtickMatch[0].replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
            }
          }
        }
        
        // Try to find JSON object in the text (in case there's extra text before/after)
        const jsonMatch = textToParse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          textToParse = jsonMatch[0];
        }
        
        try {
          aiData = JSON.parse(textToParse);
        } catch (parseError) {
          this.logger.warn('Failed to parse LLM JSON response', {
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
            textLength: llmResponse.text.length,
            textPreview: llmResponse.text.substring(0, 200),
          });
          // If parsing fails, use text as summary
          aiData = {
            summary: llmResponse.text || 'Unable to generate structured summary.',
          };
        }
      }

      // Ensure summary exists
      if (!aiData.summary) {
        aiData.summary = 'Summary generation completed, but no summary text was provided.';
      }

      return {
        summary: aiData.summary,
        patterns: aiData.patterns?.filter((p) => p.title && p.description) || [],
        changes: aiData.changes?.filter((c) => c.description) || [],
        provenance: {
          timeRange: timeRangeStr,
          filters: formatFilters(query.filters || {}),
          totalEventsAnalyzed: events.length,
          sourceEventIds: events.slice(0, 100).map((e) => e.id), // Include first 100 IDs for reference
        },
      };
    } catch (error) {
      // Safe failure: return appropriate error based on error type
      // If it's already a ServiceUnavailableException, re-throw it
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // If LLM provider is unavailable, return 503
      if (errorMessage.includes('not available') || errorMessage.includes('unavailable')) {
        throw new ServiceUnavailableException('AI service is currently unavailable. Please ensure Ollama is running and the model is available.');
      }
      
      // For other errors, return 500 with error message
      this.logger.error(`AI summary generation failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw new Error(`Failed to generate AI summary: ${errorMessage}`);
    }
  }

  /**
   * Investigate related events using AI correlation and timeline reconstruction
   * Read-only investigation that groups related events and reconstructs timelines
   */
  async investigate(
    orgId: string,
    userId: string,
    userRole: string,
    context: {
      eventId?: string;
      patternId?: string;
      actorEmail?: string;
      action?: string;
      timeRange?: { startDate?: string; endDate?: string };
      filters?: {
        actions?: string[];
        statuses?: string[];
        actor?: string;
        resourceType?: string;
        resourceId?: string;
        ip?: string;
        search?: string;
      };
      focus?: 'correlation' | 'timeline' | 'both';
    },
    userEmail?: string,
  ): Promise<{
    summary: string;
    triggerContext: string;
    correlationGroups?: Array<{
      id: string;
      title: string;
      description: string;
      relevanceScore: number;
      eventCount: number;
      timeSpan: string;
      events: Array<{
        id: string;
        timestamp: string;
        actor: string;
        actorType: string;
        action: string;
        status: string;
        resourceType: string;
        resourceId: string;
        whyRelevant: string;
        sourceCitations: string[];
      }>;
      whyCorrelated: string;
      citations: string[];
    }>;
    timeline?: Array<{
      id: string;
      timestamp: string;
      actor: string;
      actorType: string;
      action: string;
      status: string;
      resourceType: string;
      resourceId: string;
      significance: 'critical' | 'important' | 'normal';
      explanation: string;
      relatedEventIds: string[];
    }>;
    keyFindings?: Array<{
      id: string;
      title: string;
      description: string;
      severity: 'high' | 'medium' | 'low';
      eventCount: number;
      citations: string[];
    }>;
    provenance: {
      timeRange: string;
      filters: string[];
      totalEventsAnalyzed: number;
      correlationModel: string;
      sourceEventIds: string[];
    };
  }> {
    try {
      // Check if LLM is enabled (allow admin override for dev)
      const isAdminOverride = userEmail === 'admin@example.com';
      if (!this.llmService.isEnabled() && !isAdminOverride) {
        throw new ServiceUnavailableException('AI-guided investigation is not available for your account. Contact your administrator to enable this feature.');
      }

      // Build query to retrieve events based on context
      const excludeDemo = userEmail !== 'admin@example.com';
      
      // Determine time range
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (context.timeRange?.startDate) {
        startDate = new Date(context.timeRange.startDate);
      }
      if (context.timeRange?.endDate) {
        endDate = new Date(context.timeRange.endDate);
      }
      
      // If eventId is provided, get that event and use its timestamp to set time range
      let triggerEvent: AuditEventEntity | null = null;
      if (context.eventId) {
        triggerEvent = await this.auditEventRepository.findOne({
          where: { id: context.eventId, orgId },
        });
        
        if (!triggerEvent) {
          throw new ForbiddenException('Event not found or access denied');
        }
        
        // Set time range to 24 hours around the event if not specified
        if (!startDate && !endDate) {
          const eventTime = triggerEvent.createdAt;
          startDate = new Date(eventTime.getTime() - 12 * 60 * 60 * 1000); // 12 hours before
          endDate = new Date(eventTime.getTime() + 12 * 60 * 60 * 1000); // 12 hours after
        }
      } else if (!startDate && !endDate) {
        // Default to last 7 days if no time range specified
        endDate = new Date();
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Build query similar to getAuditEvents
      const queryBuilder = this.buildFilteredQuery(
        orgId,
        userId,
        userRole,
        {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          action: context.filters?.actions,
          status: context.filters?.statuses,
          actorId: context.filters?.actor || context.actorEmail,
          resourceType: context.filters?.resourceType,
          resourceId: context.filters?.resourceId,
          ipAddress: context.filters?.ip,
          metadataText: context.filters?.search,
        } as GetAuditEventsDto,
        excludeDemo,
        userEmail,
      );

      // If specific action is provided, filter by it
      if (context.action) {
        queryBuilder.andWhere('audit_event.action = :action', { action: context.action });
      }

      // Limit to reasonable number of events for analysis (max 500)
      queryBuilder.limit(500);
      queryBuilder.orderBy('audit_event.createdAt', 'DESC');

      const events = await queryBuilder.getMany();

      if (events.length === 0) {
        return {
          summary: 'No related events found for this investigation.',
          triggerContext: context.eventId 
            ? `Investigating: Event ${context.eventId}`
            : 'Investigating: Current filters and time range',
          correlationGroups: [],
          timeline: [],
          keyFindings: [],
          provenance: {
            timeRange: formatTimeRange(startDate, endDate),
            filters: formatFilters(context.filters || {}),
            totalEventsAnalyzed: 0,
            correlationModel: 'Pattern-v2.1',
            sourceEventIds: [],
          },
        };
      }

      // Redact events before sending to LLM
      const redactedEvents = redactAuditEvents(events);

      // Build trigger context string
      let triggerContext = 'Investigating: ';
      if (context.eventId && triggerEvent) {
        const actorEmail = triggerEvent.metadata?.actorEmail || triggerEvent.actorId || 'unknown';
        triggerContext += `Event ${context.eventId} from ${actorEmail}`;
      } else if (context.actorEmail) {
        triggerContext += `Events from ${context.actorEmail}`;
      } else if (context.action) {
        triggerContext += `Events with action ${context.action}`;
      } else {
        triggerContext += 'Current filters and time range';
      }

      // Determine focus (default to both)
      const focus = context.focus || 'both';
      const needsCorrelation = focus === 'correlation' || focus === 'both';
      const needsTimeline = focus === 'timeline' || focus === 'both';

      // Prepare LLM prompt
      const systemPrompt = `You are an audit log analysis assistant. Your role is to analyze audit events and identify correlations and reconstruct timelines. 

CRITICAL RULES:
- You MUST only describe what happened (past tense). Never predict, speculate, or recommend actions.
- You MUST ground all claims in the provided event data.
- You MUST cite specific event IDs for every claim.
- You MUST explain why events are correlated (shared resources, time windows, IP addresses, actors, etc.).
- You MUST explain why each event is relevant to the investigation.
- Never claim certainty ("this is definitely...") or make security assessments ("this is an attack").
- Use calm, factual language. No hype or marketing language.`;

      const eventsJson = JSON.stringify(redactedEvents, null, 2);
      const timeRangeStr = formatTimeRange(startDate, endDate);
      const filtersStr = formatFilters(context.filters || {}).join(', ') || 'None';

      const userPrompt = `Analyze the following audit events and ${needsCorrelation ? 'identify correlation groups' : ''}${needsCorrelation && needsTimeline ? ' and ' : ''}${needsTimeline ? 'reconstruct a timeline' : ''}.

Time Range: ${timeRangeStr}
Filters: ${filtersStr}
Total Events: ${events.length}

Events (redacted, no secrets):
${eventsJson}

${needsCorrelation ? `
CORRELATION GROUPS:
Group related events that share:
- Same resource (resourceType + resourceId)
- Same actor (actorId)
- Same IP address (if available in metadata)
- Overlapping time windows (within 10-15 minutes)
- Sequential patterns (e.g., login → access → update)

For each correlation group, provide:
- Title: Brief descriptive title
- Description: One-sentence summary
- Relevance Score: 0-100% confidence that events are meaningfully related
- Why Correlated: Factual explanation (e.g., "These events share the same resource (doc_12345) and occurred within a 10-minute window from the same IP address")
- Citations: List of event IDs used to determine correlation (not just the events in the group, but events that support the correlation logic)
- Events: List of events in the group with "why relevant" explanations for each
` : ''}

${needsTimeline ? `
TIMELINE RECONSTRUCTION:
Order events chronologically and explain the significance of each event in the sequence.

For each timeline event, provide:
- Significance: "critical" (failures, privilege changes), "important" (precursors/outcomes), or "normal" (context)
- Explanation: Factual description of significance (e.g., "This login established the session used for subsequent document access")
- Related Event IDs: List of event IDs that are temporally or causally related
` : ''}

KEY FINDINGS:
Identify notable patterns or sequences:
- Failed authentication attempts
- Elevated privilege changes
- Unusual access patterns
- Sequential resource access

For each finding, provide:
- Title: Brief descriptive title
- Description: 2-3 sentence factual summary
- Severity: "high" (security concerns), "medium" (operational concerns), "low" (informational)
- Event Count: Number of events contributing
- Citations: List of supporting event IDs

Provide your analysis in the following JSON format:
{
  "summary": "A concise 2-3 paragraph summary of the investigation findings. Calm, factual tone. Past tense only.",
  ${needsCorrelation ? `"correlationGroups": [
    {
      "id": "group_1",
      "title": "Correlation group title",
      "description": "One-sentence summary",
      "relevanceScore": 85,
      "eventCount": 3,
      "timeSpan": "2:15 PM - 2:25 PM (10 minutes)",
      "whyCorrelated": "Factual explanation of correlation logic",
      "citations": ["evt_1a2b", "evt_2b3c"],
      "events": [
        {
          "id": "evt_1a2b",
          "timestamp": "2025-12-31T14:15:00Z",
          "actor": "sarah@acme.com",
          "actorType": "user",
          "action": "user.login",
          "status": "success",
          "resourceType": "authentication",
          "resourceId": "auth_98765",
          "whyRelevant": "Factual explanation with source citations",
          "sourceCitations": ["evt_1a2b", "evt_2b3c"]
        }
      ]
    }
  ],` : ''}
  ${needsTimeline ? `"timeline": [
    {
      "id": "evt_1a2b",
      "timestamp": "2025-12-31T14:15:00Z",
      "actor": "sarah@acme.com",
      "actorType": "user",
      "action": "user.login",
      "status": "success",
      "resourceType": "authentication",
      "resourceId": "auth_98765",
      "significance": "important",
      "explanation": "Factual description of significance",
      "relatedEventIds": ["evt_2b3c", "evt_3c4d"]
    }
  ],` : ''}
  "keyFindings": [
    {
      "id": "finding_1",
      "title": "Finding title",
      "description": "2-3 sentence factual summary",
      "severity": "high",
      "eventCount": 3,
      "citations": ["evt_4d5e", "evt_5e6f"]
    }
  ]
}

Guidelines:
- Only include correlation groups if you observe clear relationships (2+ events)
- Only include timeline events if they have meaningful significance
- Only include key findings if you observe notable patterns
- Relevance scores should reflect actual correlation strength (not just temporal proximity)
- All explanations must be factual and grounded in the data
- Use event IDs from the provided events list`;

      const llmResponse = await this.llmService.generate({
        model: 'llama3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 4000,
        jsonSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            ...(needsCorrelation ? {
              correlationGroups: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    relevanceScore: { type: 'number' },
                    eventCount: { type: 'number' },
                    timeSpan: { type: 'string' },
                    whyCorrelated: { type: 'string' },
                    citations: { type: 'array', items: { type: 'string' } },
                    events: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          timestamp: { type: 'string' },
                          actor: { type: 'string' },
                          actorType: { type: 'string' },
                          action: { type: 'string' },
                          status: { type: 'string' },
                          resourceType: { type: 'string' },
                          resourceId: { type: 'string' },
                          whyRelevant: { type: 'string' },
                          sourceCitations: { type: 'array', items: { type: 'string' } },
                        },
                      },
                    },
                  },
                },
              },
            } : {}),
            ...(needsTimeline ? {
              timeline: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    timestamp: { type: 'string' },
                    actor: { type: 'string' },
                    actorType: { type: 'string' },
                    action: { type: 'string' },
                    status: { type: 'string' },
                    resourceType: { type: 'string' },
                    resourceId: { type: 'string' },
                    significance: { type: 'string', enum: ['critical', 'important', 'normal'] },
                    explanation: { type: 'string' },
                    relatedEventIds: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            } : {}),
            keyFindings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                  eventCount: { type: 'number' },
                  citations: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      }, isAdminOverride);

      // Parse JSON response
      let aiData: {
        summary: string;
        correlationGroups?: Array<{
          id: string;
          title: string;
          description: string;
          relevanceScore: number;
          eventCount: number;
          timeSpan: string;
          whyCorrelated: string;
          citations: string[];
          events: Array<{
            id: string;
            timestamp: string;
            actor: string;
            actorType: string;
            action: string;
            status: string;
            resourceType: string;
            resourceId: string;
            whyRelevant: string;
            sourceCitations: string[];
          }>;
        }>;
        timeline?: Array<{
          id: string;
          timestamp: string;
          actor: string;
          actorType: string;
          action: string;
          status: string;
          resourceType: string;
          resourceId: string;
          significance: 'critical' | 'important' | 'normal';
          explanation: string;
          relatedEventIds: string[];
        }>;
        keyFindings?: Array<{
          id: string;
          title: string;
          description: string;
          severity: 'high' | 'medium' | 'low';
          eventCount: number;
          citations: string[];
        }>;
      };

      if (llmResponse.json) {
        aiData = llmResponse.json as typeof aiData;
      } else {
        // Fallback: try to parse text response
        let textToParse = llmResponse.text.trim();
        
        if (textToParse.startsWith('```')) {
          const codeBlockMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            textToParse = codeBlockMatch[1].trim();
          }
        }
        
        const jsonMatch = textToParse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          textToParse = jsonMatch[0];
        }
        
        try {
          aiData = JSON.parse(textToParse);
        } catch (parseError) {
          this.logger.warn('Failed to parse LLM investigation response', {
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
          });
          aiData = {
            summary: llmResponse.text || 'Investigation completed, but structured results could not be parsed.',
            correlationGroups: [],
            timeline: [],
            keyFindings: [],
          };
        }
      }

      // Ensure summary exists
      if (!aiData.summary) {
        aiData.summary = 'Investigation completed, but no summary was provided.';
      }

      // Collect all source event IDs
      const sourceEventIds = new Set<string>();
      events.forEach(e => sourceEventIds.add(e.id));
      if (aiData.correlationGroups) {
        aiData.correlationGroups.forEach(group => {
          group.events.forEach(e => sourceEventIds.add(e.id));
          group.citations.forEach(id => sourceEventIds.add(id));
        });
      }
      if (aiData.timeline) {
        aiData.timeline.forEach(item => {
          sourceEventIds.add(item.id);
          item.relatedEventIds.forEach(id => sourceEventIds.add(id));
        });
      }
      if (aiData.keyFindings) {
        aiData.keyFindings.forEach(finding => {
          finding.citations.forEach(id => sourceEventIds.add(id));
        });
      }

      return {
        summary: aiData.summary,
        triggerContext,
        correlationGroups: aiData.correlationGroups || [],
        timeline: aiData.timeline || [],
        keyFindings: aiData.keyFindings || [],
        provenance: {
          timeRange: timeRangeStr,
          filters: formatFilters(context.filters || {}),
          totalEventsAnalyzed: events.length,
          correlationModel: 'Pattern-v2.1',
          sourceEventIds: Array.from(sourceEventIds).slice(0, 200), // Limit to 200 IDs
        },
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('not available') || errorMessage.includes('unavailable')) {
        throw new ServiceUnavailableException('The AI correlation model is temporarily unavailable. The audit log data is still accessible. Please try again later.');
      }
      
      this.logger.error(`Investigation failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw new Error(`Failed to complete investigation: ${errorMessage}`);
    }
  }
}

