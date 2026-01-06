import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../../entities/user.entity';
import { RateLimiterService } from '../api-key/rate-limiter.service';
import { UserRateLimitGuard, RateLimit } from '../api-key/user-rate-limit.guard';
import { AuditEventsService } from './audit-events.service';
import { DemoSeedingService } from './demo-seeding.service';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';
import { GetAuditEventsDto } from './dto/get-audit-events.dto';
import { GetAnalyticsDto } from './dto/get-analytics.dto';
import { GetAISummaryDto } from './dto/get-ai-summary.dto';
import { InvestigateDto } from './dto/investigate.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';

@ApiTags('audit-events')
@Controller('v1/audit-events')
export class AuditEventsController {
  constructor(
    private readonly auditEventsService: AuditEventsService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly demoSeedingService: DemoSeedingService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an audit event' })
  @ApiHeader({
    name: 'x-api-key',
    description: 'API key for authentication',
    required: true,
  })
  @ApiOkResponse({
    description: 'Audit event created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async createAuditEvent(
    @Body() createDto: CreateAuditEventDto,
    @Req() req: Request,
  ) {
    const apiKey = (req as any).apiKey;
    const orgId = (req as any).orgId;

    // Check rate limit
    this.rateLimiterService.checkRateLimit(apiKey.id);

    // Extract IP and user agent from request
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      req.ip;
    const userAgent = req.headers['user-agent'] || undefined;

    const result = await this.auditEventsService.createAuditEvent(
      orgId,
      createDto,
      ipAddress,
      userAgent,
    );

    return {
      id: result.id,
      createdAt: result.createdAt.toISOString(),
    };
  }

  @Get()
  @UseGuards(AuthGuard, UserRateLimitGuard)
  @RateLimit('auditQuery')
  @ApiOperation({ summary: 'Get audit events' })
  @ApiOkResponse({
    description: 'Audit events retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              orgId: { type: 'string', format: 'uuid' },
              actorType: { type: 'string', enum: ['user', 'api-key', 'system'] },
              actorId: { type: 'string', format: 'uuid', nullable: true },
              action: { type: 'string' },
              resourceType: { type: 'string' },
              resourceId: { type: 'string' },
              metadata: { type: 'object', nullable: true },
              ipAddress: { type: 'string', nullable: true },
              userAgent: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        pageInfo: {
          type: 'object',
          properties: {
            nextCursor: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getAuditEvents(
    @Query() query: GetAuditEventsDto,
    @Req() req: Request,
  ) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    // Get user email for demo data filtering
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    return this.auditEventsService.getAuditEvents(orgId, userId, role, query, user?.email);
  }

  @Get('export.json')
  @UseGuards(AuthGuard, RolesGuard, UserRateLimitGuard)
  @RateLimit('auditQuery')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Export audit events as JSON (admin/auditor only)' })
  @ApiOkResponse({
    description: 'Audit events exported as JSON',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orgId: { type: 'string', format: 'uuid' },
          actorType: { type: 'string', enum: ['user', 'api-key', 'system'] },
          actorId: { type: 'string', format: 'uuid', nullable: true },
          action: { type: 'string' },
          resourceType: { type: 'string' },
          resourceId: { type: 'string' },
          metadata: { type: 'object', nullable: true },
          ipAddress: { type: 'string', nullable: true },
          userAgent: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin/auditor role required' })
  async exportAsJson(
    @Query() query: GetAuditEventsDto,
    @Req() req: Request,
  ) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    // Get user email for demo data filtering
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    const data = await this.auditEventsService.exportAsJson(orgId, userId, role, query, user?.email);
    return data;
  }

  @Get('export.csv')
  @UseGuards(AuthGuard, RolesGuard, UserRateLimitGuard)
  @RateLimit('auditQuery')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Export audit events as CSV (admin/auditor only, streams results)' })
  @ApiOkResponse({
    description: 'Audit events exported as CSV (streamed)',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin/auditor role required' })
  async exportAsCsv(
    @Query() query: GetAuditEventsDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    // Get user email for demo data filtering
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-events-${new Date().toISOString().split('T')[0]}.csv"`);

    // Get the stream from service and pipe to response
    const stream = await this.auditEventsService.exportAsCsvStream(orgId, userId, role, query, user?.email);
    
    // Handle stream errors
    stream.on('error', (_error) => {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error streaming audit events',
        });
      }
    });

    stream.pipe(res);
  }

  @Get('overview')
  @UseGuards(AuthGuard, UserRateLimitGuard)
  @RateLimit('auditQuery')
  @ApiOperation({ summary: 'Get overview metrics for dashboard' })
  @ApiOkResponse({
    description: 'Overview metrics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOverview(@Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    // DEMO: Check if this is admin@example.com and seed demo data if needed
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (user?.email === 'admin@example.com') {
      // Seed demo data if needed (idempotent)
      await this.demoSeedingService.seedDemoDataIfNeeded(user.email, orgId);
    }

    // Get metrics (pass user email for demo data filtering)
    const metrics = await this.auditEventsService.getOverviewMetrics(
      orgId,
      userId,
      role,
      user?.email,
    );

    return metrics;
  }

  @Get('analytics')
  @UseGuards(AuthGuard, UserRateLimitGuard)
  @RateLimit('auditQuery')
  @ApiOperation({ summary: 'Get analytics data for analytics page' })
  @ApiOkResponse({
    description: 'Analytics data retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAnalytics(
    @Query() query: GetAnalyticsDto,
    @Req() req: Request,
  ) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    // Get user email for demo data filtering
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    return this.auditEventsService.getAnalytics(
      orgId,
      userId,
      role,
      query,
      user?.email,
    );
  }

  @Post('ai-summary')
  @UseGuards(AuthGuard, UserRateLimitGuard)
  @RateLimit('auditQuery')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Generate AI summary for audit events',
    description: 'Read-only endpoint that generates an AI-powered summary of audit events based on filters and time range. Feature-gated and disabled by default.',
  })
  @ApiOkResponse({
    description: 'AI summary generated successfully',
    schema: {
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
        provenance: {
          type: 'object',
          properties: {
            timeRange: { type: 'string' },
            filters: { type: 'array', items: { type: 'string' } },
            totalEventsAnalyzed: { type: 'number' },
            sourceEventIds: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'AI features are disabled' })
  @ApiResponse({ status: 503, description: 'AI service is unavailable' })
  async getAISummary(
    @Body() query: GetAISummaryDto,
    @Req() req: Request,
  ) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    // Get user email for demo data filtering and admin override
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    return this.auditEventsService.getAISummary(
      orgId,
      userId,
      role,
      query,
      user?.email,
    );
  }

  @Post('investigate')
  @UseGuards(AuthGuard, UserRateLimitGuard)
  @RateLimit('auditQuery')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Investigate related events using AI correlation and timeline reconstruction',
    description: 'Read-only endpoint that uses AI to identify correlations between events and reconstruct timelines. Feature-gated and disabled by default.',
  })
  @ApiOkResponse({
    description: 'Investigation completed successfully',
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        triggerContext: { type: 'string' },
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
        provenance: {
          type: 'object',
          properties: {
            timeRange: { type: 'string' },
            filters: { type: 'array', items: { type: 'string' } },
            totalEventsAnalyzed: { type: 'number' },
            correlationModel: { type: 'string' },
            sourceEventIds: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    } as any,
  })
  @ApiResponse({ status: 403, description: 'AI features are disabled' })
  @ApiResponse({ status: 503, description: 'AI service is unavailable' })
  async investigate(
    @Body() dto: InvestigateDto,
    @Req() req: Request,
  ) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    // Get user email for demo data filtering and admin override
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    return this.auditEventsService.investigate(
      orgId,
      userId,
      role,
      dto.context,
      user?.email,
    );
  }
}

