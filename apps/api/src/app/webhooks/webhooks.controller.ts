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

