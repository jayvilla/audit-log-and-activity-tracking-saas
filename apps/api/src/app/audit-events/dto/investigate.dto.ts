import { IsOptional, IsString, ValidateNested, IsEnum } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TimeRangeDto, FiltersDto } from './get-ai-summary.dto';

export enum InvestigationFocus {
  CORRELATION = 'correlation',
  TIMELINE = 'timeline',
  BOTH = 'both',
}

export class InvestigationContextDto {
  @ApiPropertyOptional({ description: 'Event ID to investigate from' })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({ description: 'Pattern ID to investigate (from AI Summary)' })
  @IsOptional()
  @IsString()
  patternId?: string;

  @ApiPropertyOptional({ description: 'Actor email to focus investigation on' })
  @IsOptional()
  @IsString()
  actorEmail?: string;

  @ApiPropertyOptional({ description: 'Action to focus investigation on' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Time range for investigation', type: TimeRangeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRangeDto)
  timeRange?: TimeRangeDto;

  @ApiPropertyOptional({ description: 'Filters to apply', type: FiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FiltersDto)
  filters?: FiltersDto;

  @ApiPropertyOptional({ 
    description: 'Focus type for investigation',
    enum: InvestigationFocus,
    default: InvestigationFocus.BOTH
  })
  @IsOptional()
  @IsEnum(InvestigationFocus)
  focus?: InvestigationFocus;
}

export class InvestigateDto {
  @ApiProperty({ description: 'Investigation context', type: InvestigationContextDto })
  @ValidateNested()
  @Type(() => InvestigationContextDto)
  context: InvestigationContextDto;
}

