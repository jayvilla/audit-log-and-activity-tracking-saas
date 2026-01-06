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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SavedViewsService } from './saved-views.service';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
import { UpdateSavedViewDto } from './dto/update-saved-view.dto';
import { SavedViewEntity } from '../../entities/saved-view.entity';

@ApiTags('saved-views')
@Controller('v1/saved-views')
export class SavedViewsController {
  constructor(private readonly savedViewsService: SavedViewsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a saved view' })
  @ApiOkResponse({
    description: 'Saved view created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        orgId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
        filters: { type: 'object' },
        useCount: { type: 'number' },
        lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
        created: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createSavedView(@Body() createDto: CreateSavedViewDto, @Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const savedView = await this.savedViewsService.createSavedView(orgId, createDto);
    return this.toDto(savedView);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List all saved views' })
  @ApiOkResponse({
    description: 'Saved views retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orgId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          filters: { type: 'object' },
          useCount: { type: 'number' },
          lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
          created: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listSavedViews(@Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const savedViews = await this.savedViewsService.listSavedViews(orgId);
    return savedViews.map((view) => this.toDto(view));
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get a saved view by ID' })
  @ApiParam({ name: 'id', description: 'Saved view ID' })
  @ApiOkResponse({
    description: 'Saved view retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        orgId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
        filters: { type: 'object' },
        useCount: { type: 'number' },
        lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
        created: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Saved view not found' })
  async getSavedView(@Param('id') id: string, @Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const savedView = await this.savedViewsService.getSavedView(orgId, id);
    return this.toDto(savedView);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update a saved view' })
  @ApiParam({ name: 'id', description: 'Saved view ID' })
  @ApiOkResponse({
    description: 'Saved view updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        orgId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
        filters: { type: 'object' },
        useCount: { type: 'number' },
        lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
        created: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Saved view not found' })
  async updateSavedView(
    @Param('id') id: string,
    @Body() updateDto: UpdateSavedViewDto,
    @Req() req: Request,
  ) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const savedView = await this.savedViewsService.updateSavedView(orgId, id, updateDto);
    return this.toDto(savedView);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved view' })
  @ApiParam({ name: 'id', description: 'Saved view ID' })
  @ApiResponse({ status: 204, description: 'Saved view deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Saved view not found' })
  async deleteSavedView(@Param('id') id: string, @Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    await this.savedViewsService.deleteSavedView(orgId, id);
  }

  @Post(':id/use')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record that a saved view was used' })
  @ApiParam({ name: 'id', description: 'Saved view ID' })
  @ApiOkResponse({
    description: 'Usage recorded successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        orgId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
        filters: { type: 'object' },
        useCount: { type: 'number' },
        lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
        created: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Saved view not found' })
  async recordUsage(@Param('id') id: string, @Req() req: Request) {
    const orgId = req.session.orgId;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!orgId || !userId || !role) {
      throw new UnauthorizedException('Session data missing');
    }

    const savedView = await this.savedViewsService.recordUsage(orgId, id);
    return this.toDto(savedView);
  }

  /**
   * Convert entity to DTO format expected by frontend
   */
  private toDto(savedView: SavedViewEntity) {
    return {
      id: savedView.id,
      name: savedView.name,
      description: savedView.description || undefined,
      filters: savedView.filters,
      created: savedView.createdAt.toISOString(),
      lastUsed: savedView.lastUsedAt?.toISOString() || null,
      useCount: savedView.useCount,
    };
  }
}

