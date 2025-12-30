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
import { CsrfGuard } from '../auth/csrf.guard';
import { UserRole } from '../../entities/user.entity';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiOkResponse({
    description: 'API key created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        key: { type: 'string', description: 'Full key shown only once' },
        keyPrefix: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createApiKey(@Body() createDto: CreateApiKeyDto, @Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const { entity, key } = await this.apiKeyService.createApiKey(orgId, userId, createDto);
    return this.apiKeyService.toCreateDto(entity, key);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'List all API keys' })
  @ApiOkResponse({
    description: 'API keys retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          keyPrefix: { type: 'string' },
          lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          createdBy: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listApiKeys(@Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const apiKeys = await this.apiKeyService.listApiKeys(orgId);
    return apiKeys.map((apiKey) => this.apiKeyService.toDto(apiKey));
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get an API key by ID' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiOkResponse({
    description: 'API key retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        keyPrefix: { type: 'string' },
        lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        createdBy: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async getApiKey(@Param('id') id: string, @Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const apiKey = await this.apiKeyService.getApiKey(orgId, id);
    return this.apiKeyService.toDto(apiKey);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Update an API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiOkResponse({
    description: 'API key updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        keyPrefix: { type: 'string' },
        lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        createdBy: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async updateApiKey(
    @Param('id') id: string,
    @Body() updateDto: UpdateApiKeyDto,
    @Req() req: Request,
  ) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const apiKey = await this.apiKeyService.updateApiKey(orgId, id, updateDto);
    return this.apiKeyService.toDto(apiKey);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke (delete) an API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiOkResponse({
    description: 'API key revoked successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async deleteApiKey(@Param('id') id: string, @Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    await this.apiKeyService.deleteApiKey(orgId, id);
    return { success: true };
  }
}

