import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Name for the API key', example: 'Production API Key' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Expiration in days', example: 90, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expiresInDays?: number;
}

