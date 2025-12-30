import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyEntity } from '../../entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepository: Repository<ApiKeyEntity>,
  ) {}

  /**
   * Validates an API key by hashing it and comparing with stored hash
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyEntity | null> {
    if (!apiKey || !apiKey.startsWith('sk_')) {
      return null;
    }

    // Hash the provided API key using SHA256 (same as seed script)
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Find API key by hash
    const apiKeyEntity = await this.apiKeyRepository.findOne({
      where: { keyHash },
      relations: ['organization'],
    });

    if (!apiKeyEntity) {
      return null;
    }

    // Update last used timestamp
    apiKeyEntity.lastUsedAt = new Date();
    await this.apiKeyRepository.save(apiKeyEntity);

    return apiKeyEntity;
  }

  /**
   * Hash an API key for storage
   */
  hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Generate a new API key
   */
  generateApiKey(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Get prefix of API key (first 8 characters)
   */
  getKeyPrefix(apiKey: string): string {
    return apiKey.substring(0, 8);
  }

  /**
   * Create a new API key
   */
  async createApiKey(
    orgId: string,
    userId: string,
    createDto: CreateApiKeyDto,
  ): Promise<{ entity: ApiKeyEntity; key: string }> {
    const apiKey = this.generateApiKey();
    const keyHash = this.hashApiKey(apiKey);
    const keyPrefix = this.getKeyPrefix(apiKey);

    const entity = this.apiKeyRepository.create({
      orgId,
      name: createDto.name,
      keyHash,
      keyPrefix,
    });

    const saved = await this.apiKeyRepository.save(entity);

    return { entity: saved, key: apiKey };
  }

  /**
   * List all API keys for an organization
   */
  async listApiKeys(orgId: string): Promise<ApiKeyEntity[]> {
    return await this.apiKeyRepository.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get an API key by ID
   */
  async getApiKey(orgId: string, apiKeyId: string): Promise<ApiKeyEntity> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId, orgId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  /**
   * Update an API key
   */
  async updateApiKey(
    orgId: string,
    apiKeyId: string,
    updateDto: UpdateApiKeyDto,
  ): Promise<ApiKeyEntity> {
    const apiKey = await this.getApiKey(orgId, apiKeyId);

    if (updateDto.name !== undefined) {
      apiKey.name = updateDto.name;
    }

    return await this.apiKeyRepository.save(apiKey);
  }

  /**
   * Delete (revoke) an API key
   */
  async deleteApiKey(orgId: string, apiKeyId: string): Promise<void> {
    const apiKey = await this.getApiKey(orgId, apiKeyId);
    await this.apiKeyRepository.remove(apiKey);
  }

  /**
   * Convert entity to DTO for list responses (without full key)
   */
  toDto(apiKey: ApiKeyEntity): {
    id: string;
    name: string;
    keyPrefix: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    createdBy: string;
  } {
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix || 'sk_****',
      lastUsedAt: apiKey.lastUsedAt?.toISOString() || null,
      expiresAt: null, // API keys don't have expiration in the current schema
      createdAt: apiKey.createdAt.toISOString(),
      createdBy: '', // We don't track who created the key in the current schema
    };
  }

  /**
   * Convert entity to DTO for create response (with full key)
   */
  toCreateDto(apiKey: ApiKeyEntity, fullKey: string): {
    id: string;
    name: string;
    key: string;
    keyPrefix: string;
    expiresAt: string | null;
    createdAt: string;
  } {
    return {
      id: apiKey.id,
      name: apiKey.name,
      key: fullKey,
      keyPrefix: this.getKeyPrefix(fullKey),
      expiresAt: null,
      createdAt: apiKey.createdAt.toISOString(),
    };
  }
}

