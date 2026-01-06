import { IsString, IsOptional, IsObject, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSavedViewDto {
  @ApiPropertyOptional({ description: 'Saved view name', example: 'Failed Logins Last Week' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Optional description', example: 'Monitor failed login attempts from the past 7 days' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Filter configuration',
    example: {
      search: 'login',
      dateRange: 'Last 7 days',
      actions: ['user.login'],
      statuses: ['failure'],
    },
  })
  @IsOptional()
  @IsObject()
  filters?: {
    search?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    actors?: string[];
    actions?: string[];
    resources?: string[];
    statuses?: string[];
    actor?: string;
    resourceType?: string;
    resourceId?: string;
    ip?: string;
  };
}

