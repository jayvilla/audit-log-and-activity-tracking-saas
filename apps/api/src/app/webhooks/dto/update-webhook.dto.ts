import { IsString, IsUrl, IsArray, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: 'Webhook name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @ApiPropertyOptional({ description: 'Event types to subscribe to', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];

  @ApiPropertyOptional({ description: 'Whether webhook is active' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Secret for HMAC signing' })
  @IsOptional()
  @IsString()
  @MinLength(16)
  secret?: string;
}

