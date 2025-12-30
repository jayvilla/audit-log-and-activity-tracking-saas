import { IsString, IsObject, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateAuditEventRequest } from '@audit-log-and-activity-tracking-saas/types';

class ActorDto {
  @ApiProperty({ enum: ['user', 'api-key', 'system'] })
  @IsEnum(['user', 'api-key', 'system'])
  type: 'user' | 'api-key' | 'system';

  @ApiProperty()
  @IsString()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}

class ResourceDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateAuditEventDto implements CreateAuditEventRequest {
  @ApiProperty()
  @IsString()
  eventType: string;

  @ApiProperty({ type: ActorDto })
  @ValidateNested()
  @Type(() => ActorDto)
  actor: ActorDto;

  @ApiProperty({ type: ResourceDto })
  @ValidateNested()
  @Type(() => ResourceDto)
  resource: ResourceDto;

  @ApiProperty()
  @IsString()
  action: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timestamp?: string;
}

