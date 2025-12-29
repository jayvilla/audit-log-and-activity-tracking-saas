import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetAuditEventsDto {
  @ApiPropertyOptional({ description: 'Cursor for pagination (base64 encoded)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by action' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ enum: ['user', 'api-key', 'system'], description: 'Filter by actor type' })
  @IsOptional()
  @IsEnum(['user', 'api-key', 'system'])
  actorType?: 'user' | 'api-key' | 'system';

  @ApiPropertyOptional({ description: 'Filter by resource type' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Filter by resource ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Full-text search in metadata (JSONB)' })
  @IsOptional()
  @IsString()
  metadataText?: string;

  @ApiPropertyOptional({ description: 'Page size (default: 50, max: 100)', minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

