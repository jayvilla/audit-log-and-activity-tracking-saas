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
import { AuditEventsService } from './audit-events.service';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';
import { GetAuditEventsDto } from './dto/get-audit-events.dto';

@ApiTags('audit-events')
@Controller('v1/audit-events')
export class AuditEventsController {
  constructor(
    private readonly auditEventsService: AuditEventsService,
    private readonly rateLimiterService: RateLimiterService,
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
  @UseGuards(AuthGuard)
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

    return this.auditEventsService.getAuditEvents(orgId, userId, role, query);
  }

  @Get('export.json')
  @UseGuards(AuthGuard, RolesGuard)
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

    const data = await this.auditEventsService.exportAsJson(orgId, userId, role, query);
    return data;
  }

  @Get('export.csv')
  @UseGuards(AuthGuard, RolesGuard)
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

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-events-${new Date().toISOString().split('T')[0]}.csv"`);

    // Get the stream from service and pipe to response
    const stream = await this.auditEventsService.exportAsCsvStream(orgId, userId, role, query);
    
    // Handle stream errors
    stream.on('error', (error) => {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error streaming audit events',
        });
      }
    });

    stream.pipe(res);
  }
}

