import {
  Controller,
  Get,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { OrgsService } from './orgs.service';

@ApiTags('orgs')
@Controller('orgs')
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current user organization' })
  @ApiOkResponse({
    description: 'Organization data',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        slug: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrg(@Req() req: Request) {
    const orgId = req.session.orgId;

    if (!orgId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const org = await this.orgsService.getOrganizationById(orgId);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }
}

