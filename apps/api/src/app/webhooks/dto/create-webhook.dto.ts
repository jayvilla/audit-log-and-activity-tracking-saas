import { IsString, IsUrl, IsArray, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook name', example: 'User Events Webhook' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Webhook URL', example: 'https://example.com/webhook' })
  @IsUrl({ require_protocol: true })
  url: string;

  @ApiProperty({ description: 'Event types to subscribe to', example: ['user.created', 'user.updated'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  eventTypes: string[];

  @ApiPropertyOptional({ description: 'Optional custom secret for HMAC signing' })
  @IsOptional()
  @IsString()
  @MinLength(16)
  secret?: string;
}

