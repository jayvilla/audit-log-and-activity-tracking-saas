import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

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

  @ApiPropertyOptional({ 
    description: 'Filter by action(s). Can be a single action or comma-separated list (e.g., "create,update,delete")',
    type: [String],
    example: 'create'
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value.map(v => String(v).trim()).filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  action?: string[];

  @ApiPropertyOptional({ enum: ['user', 'api-key', 'system'], description: 'Filter by actor type' })
  @IsOptional()
  @IsEnum(['user', 'api-key', 'system'])
  actorType?: 'user' | 'api-key' | 'system';

  @ApiPropertyOptional({ description: 'Filter by actor ID (partial match, case-insensitive)' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Filter by resource type' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Filter by resource ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by status(es). Can be a single status or comma-separated list (e.g., "success,failure"). Status is derived from metadata.status field.',
    type: [String],
    example: 'success'
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value.map(v => String(v).trim()).filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @ApiPropertyOptional({ description: 'Filter by IP address (partial match, case-insensitive)' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

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

