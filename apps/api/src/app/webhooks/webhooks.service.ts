import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookEntity } from '../../entities/webhook.entity';
import { WebhookDeliveryEntity } from '../../entities/webhook-delivery.entity';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import * as crypto from 'crypto';
import axios, { AxiosError } from 'axios';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(WebhookEntity)
    private readonly webhookRepository: Repository<WebhookEntity>,
    @InjectRepository(WebhookDeliveryEntity)
    private readonly webhookDeliveryRepository: Repository<WebhookDeliveryEntity>,
  ) {}

  /**
   * Generate a random secret if not provided
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Mask secret for responses (show only last 4 characters)
   */
  private maskSecret(secret: string | null): string {
    if (!secret) return '';
    if (secret.length <= 4) return '****';
    return `****${secret.slice(-4)}`;
  }

  /**
   * Create HMAC SHA-256 signature for webhook payload
   */
  private signPayload(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Create a webhook
   */
  async createWebhook(orgId: string, createDto: CreateWebhookDto): Promise<WebhookEntity> {
    const secret = createDto.secret || this.generateSecret();

    const webhook = this.webhookRepository.create({
      orgId,
      name: createDto.name,
      url: createDto.url,
      secret,
      status: 'active',
      events: createDto.eventTypes,
    });

    return await this.webhookRepository.save(webhook);
  }

  /**
   * List all webhooks for an organization
   */
  async listWebhooks(orgId: string): Promise<WebhookEntity[]> {
    return await this.webhookRepository.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a webhook by ID
   */
  async getWebhook(orgId: string, webhookId: string): Promise<WebhookEntity> {
    const webhook = await this.webhookRepository.findOne({
      where: { id: webhookId, orgId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  /**
   * Update a webhook
   */
  async updateWebhook(
    orgId: string,
    webhookId: string,
    updateDto: UpdateWebhookDto,
  ): Promise<WebhookEntity> {
    const webhook = await this.getWebhook(orgId, webhookId);

    if (updateDto.name !== undefined) {
      webhook.name = updateDto.name;
    }
    if (updateDto.url !== undefined) {
      webhook.url = updateDto.url;
    }
    if (updateDto.eventTypes !== undefined) {
      webhook.events = updateDto.eventTypes;
    }
    if (updateDto.active !== undefined) {
      webhook.status = updateDto.active ? 'active' : 'disabled';
    }
    if (updateDto.secret !== undefined) {
      webhook.secret = updateDto.secret;
    }

    return await this.webhookRepository.save(webhook);
  }

  /**
   * Disable a webhook (soft disable by setting status)
   */
  async disableWebhook(orgId: string, webhookId: string): Promise<WebhookEntity> {
    const webhook = await this.getWebhook(orgId, webhookId);
    webhook.status = 'disabled';
    return await this.webhookRepository.save(webhook);
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(orgId: string, webhookId: string): Promise<void> {
    const webhook = await this.getWebhook(orgId, webhookId);
    await this.webhookRepository.remove(webhook);
  }

  /**
   * Send a test webhook with sample payload
   */
  async testWebhook(orgId: string, webhookId: string): Promise<{ success: boolean; deliveryId: string }> {
    const webhook = await this.getWebhook(orgId, webhookId);

    if (webhook.status !== 'active') {
      throw new NotFoundException('Webhook is not active');
    }

    // Create sample payload
    const samplePayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook payload',
        test: true,
      },
    };

    const payloadString = JSON.stringify(samplePayload);

    // Create delivery record
    const delivery = this.webhookDeliveryRepository.create({
      webhookId: webhook.id,
      payload: payloadString,
      status: 'pending',
      attemptedAt: new Date(),
    });
    const savedDelivery = await this.webhookDeliveryRepository.save(delivery);

    // Send webhook with HMAC signature
    try {
      const signature = this.signPayload(payloadString, webhook.secret || '');
      
      const response = await axios.post(webhook.url, samplePayload, {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': `sha256=${signature}`,
        },
        timeout: 10000, // 10 second timeout
      });

      // Update delivery as successful
      savedDelivery.status = 'success';
      savedDelivery.statusCode = response.status;
      savedDelivery.response = JSON.stringify(response.data);
      savedDelivery.completedAt = new Date();
      await this.webhookDeliveryRepository.save(savedDelivery);

      return {
        success: true,
        deliveryId: savedDelivery.id,
      };
    } catch (error) {
      // Update delivery as failed
      const axiosError = error as AxiosError;
      savedDelivery.status = 'failed';
      savedDelivery.statusCode = axiosError.response?.status || null;
      savedDelivery.response = axiosError.response?.data ? JSON.stringify(axiosError.response.data) : null;
      savedDelivery.error = axiosError.message;
      savedDelivery.completedAt = new Date();
      await this.webhookDeliveryRepository.save(savedDelivery);

      // Return failure instead of throwing - test endpoint should report the result
      return {
        success: false,
        deliveryId: savedDelivery.id,
      };
    }
  }

  /**
   * Enqueue webhook delivery for matching webhooks (creates delivery records without sending)
   */
  async enqueueWebhookDeliveries(
    orgId: string,
    eventType: string,
    payload: Record<string, any>,
  ): Promise<void> {
    // Find all active webhooks for this org that subscribe to this event type
    const webhooks = await this.webhookRepository.find({
      where: {
        orgId,
        status: 'active',
      },
    });

    const payloadString = JSON.stringify(payload);

    // Create delivery records for matching webhooks
    const deliveries = webhooks
      .filter((webhook) => {
        // Check if webhook subscribes to this event type
        // If events is null/empty, subscribe to all events
        return !webhook.events || webhook.events.length === 0 || webhook.events.includes(eventType);
      })
      .map((webhook) =>
        this.webhookDeliveryRepository.create({
          webhookId: webhook.id,
          payload: payloadString,
          status: 'pending',
          attempts: 0,
          attemptedAt: new Date(),
          nextRetryAt: new Date(), // Ready to process immediately
        }),
      );

    if (deliveries.length > 0) {
      await this.webhookDeliveryRepository.save(deliveries);
    }
  }

  /**
   * Send webhook payload (used by audit events or other triggers)
   * NOTE: This method is kept for backward compatibility but enqueueWebhookDeliveries should be used instead
   */
  async sendWebhook(
    webhook: WebhookEntity,
    eventType: string,
    payload: Record<string, any>,
  ): Promise<void> {
    if (webhook.status !== 'active') {
      return; // Skip inactive webhooks
    }

    // Check if webhook subscribes to this event type
    if (webhook.events && !webhook.events.includes(eventType)) {
      return; // Skip if not subscribed to this event
    }

    const payloadString = JSON.stringify(payload);

    // Create delivery record
    const delivery = this.webhookDeliveryRepository.create({
      webhookId: webhook.id,
      payload: payloadString,
      status: 'pending',
      attemptedAt: new Date(),
    });
    const savedDelivery = await this.webhookDeliveryRepository.save(delivery);

    // Send webhook with HMAC signature
    try {
      const signature = this.signPayload(payloadString, webhook.secret || '');
      
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': `sha256=${signature}`,
        },
        timeout: 10000, // 10 second timeout
      });

      // Update delivery as successful
      savedDelivery.status = 'success';
      savedDelivery.statusCode = response.status;
      savedDelivery.response = JSON.stringify(response.data);
      savedDelivery.completedAt = new Date();
      await this.webhookDeliveryRepository.save(savedDelivery);
    } catch (error) {
      // Update delivery as failed
      const axiosError = error as AxiosError;
      savedDelivery.status = 'failed';
      savedDelivery.statusCode = axiosError.response?.status || null;
      savedDelivery.response = axiosError.response?.data ? JSON.stringify(axiosError.response.data) : null;
      savedDelivery.error = axiosError.message;
      savedDelivery.completedAt = new Date();
      await this.webhookDeliveryRepository.save(savedDelivery);
    }
  }

  /**
   * Get webhook deliveries with filters
   */
  async getWebhookDeliveries(
    orgId: string,
    params: {
      webhookId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      eventType?: string;
      endpoint?: string;
      minLatency?: number;
      maxLatency?: number;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{
    deliveries: Array<{
      id: string;
      webhookId: string;
      webhookName?: string;
      eventType: string;
      endpoint: string;
      status: 'success' | 'failed' | 'pending' | 'retrying';
      statusCode: number | null;
      latency: number | null;
      attempts: number;
      attemptedAt: string;
      completedAt: string | null;
      payload: string;
      response: string | null;
      error: string | null;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = Math.min(params.limit || 50, 100);
    const offset = params.offset || 0;

    // Build query - use inner join since webhook is required (nullable: false)
    const queryBuilder = this.webhookDeliveryRepository
      .createQueryBuilder('delivery')
      .innerJoinAndSelect('delivery.webhook', 'webhook')
      .where('webhook.orgId = :orgId', { orgId });

    // Filter by webhook ID
    if (params.webhookId) {
      queryBuilder.andWhere('delivery.webhookId = :webhookId', { webhookId: params.webhookId });
    }

    // Filter by status
    if (params.status) {
      queryBuilder.andWhere('delivery.status = :status', { status: params.status });
    }

    // Filter by date range
    if (params.startDate) {
      queryBuilder.andWhere('delivery.attemptedAt >= :startDate', {
        startDate: new Date(params.startDate),
      });
    }
    if (params.endDate) {
      queryBuilder.andWhere('delivery.attemptedAt <= :endDate', {
        endDate: new Date(params.endDate),
      });
    }

    // Apply pagination
    queryBuilder.orderBy('delivery.attemptedAt', 'DESC').skip(offset).take(limit);

    // Execute query
    const deliveries = await queryBuilder.getMany();

    // Map to DTO format
    const deliveryDtos = deliveries.map((delivery) => {
      // Parse payload to extract event type
      let eventType = 'unknown';
      try {
        const payload = JSON.parse(delivery.payload);
        eventType = payload.event || 'unknown';
      } catch {
        // If payload is not valid JSON, use 'unknown'
      }

      // Calculate latency (in milliseconds)
      let latency: number | null = null;
      if (delivery.completedAt && delivery.attemptedAt) {
        latency = delivery.completedAt.getTime() - delivery.attemptedAt.getTime();
      }

      // Get webhook info
      const webhook = delivery.webhook;
      const endpoint = webhook?.url || 'unknown';

      // Map status
      let mappedStatus: 'success' | 'failed' | 'pending' | 'retrying' = 'pending';
      if (delivery.status === 'success') {
        mappedStatus = 'success';
      } else if (delivery.status === 'failed') {
        mappedStatus = 'failed';
      } else if (delivery.status === 'retrying' || delivery.nextRetryAt) {
        mappedStatus = 'retrying';
      }

      return {
        id: delivery.id,
        webhookId: delivery.webhookId,
        webhookName: webhook?.name,
        eventType,
        endpoint,
        status: mappedStatus,
        statusCode: delivery.statusCode,
        latency,
        attempts: delivery.attempts,
        attemptedAt: delivery.attemptedAt.toISOString(),
        completedAt: delivery.completedAt?.toISOString() || null,
        payload: delivery.payload,
        response: delivery.response,
        error: delivery.error,
      };
    });

    // Apply additional filters that require payload parsing
    let filteredDeliveries = deliveryDtos;

    if (params.eventType) {
      filteredDeliveries = filteredDeliveries.filter((d) =>
        d.eventType.toLowerCase().includes(params.eventType!.toLowerCase()),
      );
    }

    if (params.endpoint) {
      filteredDeliveries = filteredDeliveries.filter((d) =>
        d.endpoint.toLowerCase().includes(params.endpoint!.toLowerCase()),
      );
    }

    if (params.minLatency !== undefined) {
      filteredDeliveries = filteredDeliveries.filter(
        (d) => d.latency !== null && d.latency >= params.minLatency!,
      );
    }

    if (params.maxLatency !== undefined) {
      filteredDeliveries = filteredDeliveries.filter(
        (d) => d.latency !== null && d.latency <= params.maxLatency!,
      );
    }

    // Calculate total count after all filtering (including in-memory filters)
    // Note: This represents the total matching records after all filters are applied
    const total = filteredDeliveries.length;

    return {
      deliveries: filteredDeliveries,
      total,
      limit,
      offset,
    };
  }

  /**
   * Map entity to DTO format
   */
  toDto(webhook: WebhookEntity): {
    id: string;
    orgId: string;
    name: string;
    url: string;
    eventTypes: string[];
    secret: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: webhook.id,
      orgId: webhook.orgId,
      name: webhook.name,
      url: webhook.url,
      eventTypes: webhook.events || [],
      secret: this.maskSecret(webhook.secret),
      active: webhook.status === 'active',
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    };
  }
}

