import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateApiKeyDto {
  @ApiPropertyOptional({ description: 'Name for the API key', example: 'Updated API Key Name' })
  @IsOptional()
  @IsString()
  name?: string;
}

