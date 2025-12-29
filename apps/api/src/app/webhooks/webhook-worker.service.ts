import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookDeliveryEntity } from '../../entities/webhook-delivery.entity';
import { WebhookEntity } from '../../entities/webhook.entity';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class WebhookWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookWorkerService.name);
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
  private readonly MAX_ATTEMPTS = 3;
  private readonly BATCH_SIZE = 10; // Process up to 10 deliveries per poll

  constructor(
    @InjectRepository(WebhookDeliveryEntity)
    private readonly webhookDeliveryRepository: Repository<WebhookDeliveryEntity>,
    @InjectRepository(WebhookEntity)
    private readonly webhookRepository: Repository<WebhookEntity>,
  ) {}

  onModuleInit() {
    this.logger.log('Starting webhook worker...');
    this.start();
  }

  onModuleDestroy() {
    this.logger.log('Stopping webhook worker...');
    this.stop();
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.log('Webhook worker started');

    // Start polling immediately, then at intervals
    this.processPendingDeliveries();
    this.pollInterval = setInterval(() => {
      this.processPendingDeliveries();
    }, this.POLL_INTERVAL_MS);
  }

  stop() {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.logger.log('Webhook worker stopped');
  }

  /**
   * Calculate next retry time using exponential backoff
   * Attempt 1: 1 minute
   * Attempt 2: 2 minutes
   * Attempt 3: 4 minutes
   */
  private calculateNextRetryAt(attempts: number): Date {
    const backoffMinutes = Math.pow(2, attempts - 1); // 1, 2, 4 minutes
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);
    return nextRetry;
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
   * Process a single webhook delivery
   */
  private async processDelivery(delivery: WebhookDeliveryEntity): Promise<void> {
    // Load webhook
    const webhook = await this.webhookRepository.findOne({
      where: { id: delivery.webhookId },
    });

    if (!webhook) {
      this.logger.warn(`Webhook not found for delivery ${delivery.id}`);
      delivery.status = 'failed';
      delivery.error = 'Webhook not found';
      delivery.completedAt = new Date();
      await this.webhookDeliveryRepository.save(delivery);
      return;
    }

    // Check if webhook is still active
    if (webhook.status !== 'active') {
      this.logger.debug(`Webhook ${webhook.id} is not active, skipping delivery ${delivery.id}`);
      delivery.status = 'failed';
      delivery.error = 'Webhook is not active';
      delivery.completedAt = new Date();
      await this.webhookDeliveryRepository.save(delivery);
      return;
    }

    // Increment attempts
    delivery.attempts += 1;
    delivery.attemptedAt = new Date();

    try {
      // Parse payload
      const payload = JSON.parse(delivery.payload);
      const payloadString = delivery.payload;

      // Sign payload
      const signature = this.signPayload(payloadString, webhook.secret || '');

      // Send webhook
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': `sha256=${signature}`,
        },
        timeout: 10000, // 10 second timeout
      });

      // Success
      delivery.status = 'success';
      delivery.statusCode = response.status;
      delivery.response = JSON.stringify(response.data);
      delivery.completedAt = new Date();
      delivery.nextRetryAt = null;
      await this.webhookDeliveryRepository.save(delivery);

      this.logger.log(`Successfully delivered webhook ${delivery.id} (attempt ${delivery.attempts})`);
    } catch (error) {
      const axiosError = error as AxiosError;
      const isRetryable = this.isRetryableError(axiosError);

      if (delivery.attempts >= this.MAX_ATTEMPTS || !isRetryable) {
        // Max attempts reached or non-retryable error - mark as failed
        delivery.status = 'failed';
        delivery.statusCode = axiosError.response?.status || null;
        delivery.response = axiosError.response?.data ? JSON.stringify(axiosError.response.data) : null;
        delivery.error = axiosError.message;
        delivery.completedAt = new Date();
        delivery.nextRetryAt = null;
        await this.webhookDeliveryRepository.save(delivery);

        this.logger.warn(
          `Failed to deliver webhook ${delivery.id} after ${delivery.attempts} attempts: ${axiosError.message}`,
        );
      } else {
        // Schedule retry
        delivery.status = 'pending';
        delivery.statusCode = axiosError.response?.status || null;
        delivery.response = axiosError.response?.data ? JSON.stringify(axiosError.response.data) : null;
        delivery.error = axiosError.message;
        delivery.nextRetryAt = this.calculateNextRetryAt(delivery.attempts);
        await this.webhookDeliveryRepository.save(delivery);

        this.logger.debug(
          `Scheduled retry for webhook ${delivery.id} (attempt ${delivery.attempts}/${this.MAX_ATTEMPTS}) at ${delivery.nextRetryAt.toISOString()}`,
        );
      }
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    // Network errors and 5xx server errors are retryable
    if (!error.response) {
      return true; // Network error
    }

    const status = error.response.status;
    // Retry on 5xx errors, rate limiting (429), and some 4xx errors
    return status >= 500 || status === 429 || status === 408; // Timeout
  }

  /**
   * Process pending webhook deliveries
   */
  private async processPendingDeliveries(): Promise<void> {
    try {
      const now = new Date();

      // Find pending deliveries that are ready to be processed
      // (status = 'pending' and (next_retry_at <= now or next_retry_at is null))
      const queryBuilder = this.webhookDeliveryRepository
        .createQueryBuilder('delivery')
        .where('delivery.status = :status', { status: 'pending' })
        .andWhere('(delivery.nextRetryAt IS NULL OR delivery.nextRetryAt <= :now)', { now })
        .orderBy('delivery.createdAt', 'ASC')
        .take(this.BATCH_SIZE);

      const pendingDeliveries = await queryBuilder.getMany();

      if (pendingDeliveries.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${pendingDeliveries.length} pending webhook deliveries`);

      // Process deliveries in parallel (with concurrency limit)
      const concurrency = 3; // Process up to 3 deliveries concurrently
      for (let i = 0; i < pendingDeliveries.length; i += concurrency) {
        const batch = pendingDeliveries.slice(i, i + concurrency);
        await Promise.all(batch.map((delivery) => this.processDelivery(delivery)));
      }
    } catch (error) {
      this.logger.error(`Error processing pending deliveries: ${error}`);
    }
  }
}

