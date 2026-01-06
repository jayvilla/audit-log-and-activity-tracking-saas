import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../../entities/user.entity';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
// Session type augmentation is automatically included via tsconfig

@ApiTags('webhooks')
@Controller('v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a webhook (admin only)' })
  @ApiOkResponse({
    description: 'Webhook created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        orgId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        url: { type: 'string' },
        eventTypes: { type: 'array', items: { type: 'string' } },
        secret: { type: 'string', description: 'Masked secret (last 4 chars visible)' },
        active: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  async createWebhook(@Body() createDto: CreateWebhookDto, @Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const webhook = await this.webhooksService.createWebhook(orgId, createDto);
    return this.webhooksService.toDto(webhook);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all webhooks (admin only)' })
  @ApiOkResponse({
    description: 'Webhooks retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orgId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          url: { type: 'string' },
          eventTypes: { type: 'array', items: { type: 'string' } },
          secret: { type: 'string' },
          active: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  async listWebhooks(@Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const webhooks = await this.webhooksService.listWebhooks(orgId);
    return webhooks.map((webhook) => this.webhooksService.toDto(webhook));
  }

  // CRITICAL: This route MUST come before @Get(':id') to prevent "deliveries" from being matched as an ID
  // Using explicit path to ensure it's registered before parameterized routes
  @Get('deliveries')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get webhook deliveries (admin only)' })
  @ApiOkResponse({
    description: 'Webhook deliveries retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        deliveries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              webhookId: { type: 'string', format: 'uuid' },
              webhookName: { type: 'string' },
              eventType: { type: 'string' },
              endpoint: { type: 'string' },
              status: { type: 'string' },
              statusCode: { type: 'number', nullable: true },
              latency: { type: 'number', nullable: true },
              attempts: { type: 'number' },
              attemptedAt: { type: 'string', format: 'date-time' },
              completedAt: { type: 'string', format: 'date-time', nullable: true },
              payload: { type: 'string' },
              response: { type: 'string', nullable: true },
              error: { type: 'string', nullable: true },
            },
          },
        },
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  async getWebhookDeliveries(@Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    // Parse query parameters
    const query = req.query;
    const params = {
      webhookId: query.webhookId as string | undefined,
      status: query.status as string | undefined,
      startDate: query.startDate as string | undefined,
      endDate: query.endDate as string | undefined,
      eventType: query.eventType as string | undefined,
      endpoint: query.endpoint as string | undefined,
      minLatency: query.minLatency ? parseInt(query.minLatency as string, 10) : undefined,
      maxLatency: query.maxLatency ? parseInt(query.maxLatency as string, 10) : undefined,
      limit: query.limit ? parseInt(query.limit as string, 10) : 50,
      offset: query.offset ? parseInt(query.offset as string, 10) : 0,
    };

    return await this.webhooksService.getWebhookDeliveries(orgId, params);
  }

  // IMPORTANT: This route must come AFTER the 'deliveries' route above
  // NestJS matches routes in order, so specific routes must come before parameterized routes

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a webhook by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiOkResponse({
    description: 'Webhook retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        orgId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        url: { type: 'string' },
        eventTypes: { type: 'array', items: { type: 'string' } },
        secret: { type: 'string' },
        active: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getWebhook(@Param('id') id: string, @Req() req: Request) {
    // CRITICAL: Early validation to prevent routing conflicts
    // If "deliveries" is passed as ID, this route was matched incorrectly
    // This should never happen if routes are ordered correctly, but provides defense in depth
    if (id === 'deliveries' || id === 'test' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      // This indicates a routing conflict - the specific route should have matched instead
      throw new NotFoundException(`Invalid webhook ID: "${id}". This may indicate a routing conflict.`);
    }

    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const webhook = await this.webhooksService.getWebhook(orgId, id);
    return this.webhooksService.toDto(webhook);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a webhook (admin only)' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiOkResponse({
    description: 'Webhook updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        orgId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        url: { type: 'string' },
        eventTypes: { type: 'array', items: { type: 'string' } },
        secret: { type: 'string' },
        active: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async updateWebhook(
    @Param('id') id: string,
    @Body() updateDto: UpdateWebhookDto,
    @Req() req: Request,
  ) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const webhook = await this.webhooksService.updateWebhook(orgId, id, updateDto);
    return this.webhooksService.toDto(webhook);
  }

  @Patch(':id/disable')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Disable a webhook (admin only)' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiOkResponse({
    description: 'Webhook disabled successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        orgId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        url: { type: 'string' },
        eventTypes: { type: 'array', items: { type: 'string' } },
        secret: { type: 'string' },
        active: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async disableWebhook(@Param('id') id: string, @Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const webhook = await this.webhooksService.disableWebhook(orgId, id);
    return this.webhooksService.toDto(webhook);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a webhook (admin only)' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiOkResponse({
    description: 'Webhook deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async deleteWebhook(@Param('id') id: string, @Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    await this.webhooksService.deleteWebhook(orgId, id);
    return { success: true };
  }

  @Post(':id/test')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test webhook (admin only)' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiOkResponse({
    description: 'Test webhook sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        deliveryId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async testWebhook(@Param('id') id: string, @Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    return await this.webhooksService.testWebhook(orgId, id);
  }
}

