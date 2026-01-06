import { IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAnalyticsDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '1y'])
  timeRange?: '7d' | '30d' | '90d' | '1y';

  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}

