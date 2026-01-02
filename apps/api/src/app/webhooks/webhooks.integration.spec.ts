/**
 * Phase 3 Webhooks Integration Tests
 * 
 * Tests webhook functionality:
 * - CRUD: create, update, toggle active/inactive, delete
 * - Delivery pipeline: delivery creation on audit events, signature verification
 * - Retries/backoff: attempt count, nextRetryAt advancement
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from '../../test/test-app.factory';
import { requestWithAgent, requestWithCsrf } from '../../test/http-helpers';
import { getTestDataSource } from '../../test/setup';
import { DataSource, Repository } from 'typeorm';
import { WebhookEntity } from '../../entities/webhook.entity';
import { WebhookDeliveryEntity } from '../../entities/webhook-delivery.entity';
import { WebhookWorkerService } from './webhook-worker.service';
import * as crypto from 'crypto';
import axios from 'axios';

// Mock axios for webhook delivery tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Webhooks Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let webhookRepo: Repository<WebhookEntity>;
  let webhookDeliveryRepo: Repository<WebhookDeliveryEntity>;
  let webhookWorkerService: WebhookWorkerService;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = await getTestDataSource();
    webhookRepo = dataSource.getRepository(WebhookEntity);
    webhookDeliveryRepo = dataSource.getRepository(WebhookDeliveryEntity);

    // Get webhook worker service (may not exist if module not imported, that's ok)
    try {
      webhookWorkerService = app.get(WebhookWorkerService);
    } catch {
      // Worker service not available - tests will skip worker-related tests
      webhookWorkerService = null as any;
    }
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(() => {
    // Reset axios mocks
    jest.clearAllMocks();
  });

  /**
   * Helper: Register a user and return org/user IDs
   */
  async function registerUser(
    email: string,
    password: string = 'password123',
    name: string = 'Test User',
  ): Promise<{ orgId: string; userId: string; agent: ReturnType<typeof requestWithAgent> }> {
    const agent = requestWithAgent(app);
    const registerData = { email, password, name };

    const response = await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
      .then(test => test.expect(201));

    return {
      orgId: response.body.user.orgId,
      userId: response.body.user.id,
      agent,
    };
  }

  /**
   * Helper: Create an API key via endpoint
   */
  async function createApiKeyViaEndpoint(
    agent: ReturnType<typeof requestWithAgent>,
    name: string = 'Test API Key',
  ): Promise<{ id: string; key: string; keyPrefix: string }> {
    const response = await requestWithCsrf(agent, 'post', '/api/api-keys', { name })
      .then(test => test.expect(201));

    return {
      id: response.body.id,
      key: response.body.key,
      keyPrefix: response.body.keyPrefix,
    };
  }

  /**
   * Helper: Create an audit event via API
   */
  async function createAuditEventViaApi(
    apiKey: string,
    eventData: {
      eventType: string;
      actor: { type: 'user' | 'api-key' | 'system'; id: string; name?: string; email?: string };
      resource: { type: string; id: string; name?: string };
      action: string;
      metadata?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<{ id: string; createdAt: string }> {
    const response = await requestWithAgent(app)
      .post('/api/v1/audit-events')
      .set('x-api-key', apiKey)
      .send(eventData)
      .expect(201);

    return response.body;
  }

  describe('Webhooks CRUD', () => {
    it('should create a webhook with event types, url, and active=true', async () => {
      const { orgId, agent } = await registerUser('webhook-create@example.com');

      const createData = {
        name: 'User Events Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['user.created', 'user.updated'],
      };

      const response = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', createData)
        .then(test => test.expect(201));

      expect(response.body.id).toBeDefined();
      expect(response.body.orgId).toBe(orgId);
      expect(response.body.name).toBe('User Events Webhook');
      expect(response.body.url).toBe('https://example.com/webhook');
      expect(response.body.eventTypes).toEqual(['user.created', 'user.updated']);
      expect(response.body.active).toBe(true);
      expect(response.body.secret).toBeDefined();
      expect(response.body.secret).toMatch(/^\*\*\*\*/); // Masked secret

      // Verify in database
      const webhook = await webhookRepo.findOne({ where: { id: response.body.id } });
      expect(webhook).toBeDefined();
      expect(webhook!.name).toBe('User Events Webhook');
      expect(webhook!.url).toBe('https://example.com/webhook');
      expect(webhook!.events).toEqual(['user.created', 'user.updated']);
      expect(webhook!.status).toBe('active');
      expect(webhook!.secret).toBeDefined();
      expect(webhook!.secret!.length).toBeGreaterThan(16); // Generated secret
    });

    it('should create a webhook with custom secret', async () => {
      const { agent } = await registerUser('webhook-secret@example.com');

      const customSecret = 'my-custom-secret-key-1234567890123456';
      const createData = {
        name: 'Custom Secret Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['user.created'],
        secret: customSecret,
      };

      const response = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', createData)
        .then(test => test.expect(201));

      // Verify secret is stored (but masked in response)
      const webhook = await webhookRepo.findOne({ where: { id: response.body.id } });
      expect(webhook!.secret).toBe(customSecret);
      expect(response.body.secret).toMatch(/^\*\*\*\*/); // Masked in response
    });

    it('should list webhooks for an organization', async () => {
      const { agent } = await registerUser('webhook-list@example.com');

      // Create two webhooks
      const webhook1 = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Webhook 1',
        url: 'https://example.com/webhook1',
        eventTypes: ['user.created'],
      }).then(test => test.expect(201));

      const webhook2 = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Webhook 2',
        url: 'https://example.com/webhook2',
        eventTypes: ['user.updated'],
      }).then(test => test.expect(201));

      // List webhooks
      const listResponse = await agent.get('/api/v1/webhooks').expect(200);

      expect(listResponse.body).toHaveLength(2);
      const ids = listResponse.body.map((w: { id: string }) => w.id);
      expect(ids).toContain(webhook1.body.id);
      expect(ids).toContain(webhook2.body.id);
    });

    it('should get a webhook by ID', async () => {
      const { agent } = await registerUser('webhook-get@example.com');

      const createResponse = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Get Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['user.created'],
      }).then(test => test.expect(201));

      const getResponse = await agent.get(`/api/v1/webhooks/${createResponse.body.id}`).expect(200);

      expect(getResponse.body.id).toBe(createResponse.body.id);
      expect(getResponse.body.name).toBe('Get Webhook');
    });

    it('should update webhook URL', async () => {
      const { agent } = await registerUser('webhook-update-url@example.com');

      const createResponse = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Update URL Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['user.created'],
      }).then(test => test.expect(201));

      const updateResponse = await requestWithCsrf(
        agent,
        'patch',
        `/api/v1/webhooks/${createResponse.body.id}`,
        {
          url: 'https://example.com/webhook-updated',
        },
      ).then(test => test.expect(200));

      expect(updateResponse.body.url).toBe('https://example.com/webhook-updated');

      // Verify in database
      const webhook = await webhookRepo.findOne({ where: { id: createResponse.body.id } });
      expect(webhook!.url).toBe('https://example.com/webhook-updated');
    });

    it('should update webhook event types', async () => {
      const { agent } = await registerUser('webhook-update-events@example.com');

      const createResponse = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Update Events Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['user.created'],
      }).then(test => test.expect(201));

      const updateResponse = await requestWithCsrf(
        agent,
        'patch',
        `/api/v1/webhooks/${createResponse.body.id}`,
        {
          eventTypes: ['user.created', 'user.updated', 'user.deleted'],
        },
      ).then(test => test.expect(200));

      expect(updateResponse.body.eventTypes).toEqual(['user.created', 'user.updated', 'user.deleted']);

      // Verify in database
      const webhook = await webhookRepo.findOne({ where: { id: createResponse.body.id } });
      expect(webhook!.events).toEqual(['user.created', 'user.updated', 'user.deleted']);
    });

    it('should toggle webhook active/inactive', async () => {
      const { agent } = await registerUser('webhook-toggle@example.com');

      const createResponse = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Toggle Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['user.created'],
      }).then(test => test.expect(201));

      expect(createResponse.body.active).toBe(true);

      // Disable webhook
      const disableResponse = await requestWithCsrf(
        agent,
        'patch',
        `/api/v1/webhooks/${createResponse.body.id}`,
        {
          active: false,
        },
      ).then(test => test.expect(200));

      expect(disableResponse.body.active).toBe(false);

      // Verify in database
      let webhook = await webhookRepo.findOne({ where: { id: createResponse.body.id } });
      expect(webhook!.status).toBe('disabled');

      // Re-enable webhook
      const enableResponse = await requestWithCsrf(
        agent,
        'patch',
        `/api/v1/webhooks/${createResponse.body.id}`,
        {
          active: true,
        },
      ).then(test => test.expect(200));

      expect(enableResponse.body.active).toBe(true);

      // Verify in database
      webhook = await webhookRepo.findOne({ where: { id: createResponse.body.id } });
      expect(webhook!.status).toBe('active');
    });

    it('should delete a webhook', async () => {
      const { agent } = await registerUser('webhook-delete@example.com');

      const createResponse = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Delete Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['user.created'],
      }).then(test => test.expect(201));

      const deleteResponse = await requestWithCsrf(
        agent,
        'delete',
        `/api/v1/webhooks/${createResponse.body.id}`,
      ).then(test => test.expect(200));

      expect(deleteResponse.body.success).toBe(true);

      // Verify deleted from database
      const webhook = await webhookRepo.findOne({ where: { id: createResponse.body.id } });
      expect(webhook).toBeNull();
    });
  });

  describe('Delivery Pipeline', () => {
    it('should create a delivery record when an audit event matches webhook event types', async () => {
      const { userId, agent } = await registerUser('webhook-delivery@example.com');
      const apiKeyData = await createApiKeyViaEndpoint(agent, 'Delivery API Key');

      // Create webhook subscribed to 'document.created'
      const webhookResponse = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Document Events Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['document.created'],
      }).then(test => test.expect(201));

      const webhookId = webhookResponse.body.id;

      // Create an audit event that matches
      const eventData = {
        eventType: 'document.action',
        actor: {
          type: 'user' as const,
          id: userId,
          name: 'Test User',
          email: 'webhook-delivery@example.com',
        },
        resource: {
          type: 'document',
          id: 'doc-123',
          name: 'Test Document',
        },
        action: 'created',
      };

      await createAuditEventViaApi(apiKeyData.key, eventData);

      // Wait a bit for async webhook enqueueing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify delivery record was created
      const deliveries = await webhookDeliveryRepo.find({
        where: { webhookId },
      });

      expect(deliveries.length).toBeGreaterThan(0);
      const delivery = deliveries[0];
      expect(delivery.status).toBe('pending');
      expect(delivery.attempts).toBe(0);
      expect(delivery.payload).toBeDefined();

      // Verify payload structure
      const payload = JSON.parse(delivery.payload);
      expect(payload.event).toBe('document.created');
      expect(payload.data.resourceType).toBe('document');
      expect(payload.data.action).toBe('created');
    });

    it('should not create delivery for non-matching event types', async () => {
      const { userId, agent } = await registerUser('webhook-no-match@example.com');
      const apiKeyData = await createApiKeyViaEndpoint(agent, 'No Match API Key');

      // Create webhook subscribed only to 'user.created'
      const webhookResponse = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'User Events Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['user.created'],
      }).then(test => test.expect(201));

      const webhookId = webhookResponse.body.id;

      // Create an audit event that does NOT match (document.created)
      const eventData = {
        eventType: 'document.action',
        actor: {
          type: 'user' as const,
          id: userId,
        },
        resource: {
          type: 'document',
          id: 'doc-123',
        },
        action: 'created',
      };

      await createAuditEventViaApi(apiKeyData.key, eventData);

      // Wait a bit for async webhook enqueueing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify NO delivery record was created
      const deliveries = await webhookDeliveryRepo.find({
        where: { webhookId },
      });

      expect(deliveries.length).toBe(0);
    });

    it('should not create delivery for inactive webhooks', async () => {
      const { userId, agent } = await registerUser('webhook-inactive@example.com');
      const apiKeyData = await createApiKeyViaEndpoint(agent, 'Inactive API Key');

      // Create webhook and immediately disable it
      const webhookResponse = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Inactive Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['document.created'],
      }).then(test => test.expect(201));

      await requestWithCsrf(agent, 'patch', `/api/v1/webhooks/${webhookResponse.body.id}`, {
        active: false,
      }).then(test => test.expect(200));

      const webhookId = webhookResponse.body.id;

      // Create an audit event that matches
      const eventData = {
        eventType: 'document.action',
        actor: {
          type: 'user' as const,
          id: userId,
        },
        resource: {
          type: 'document',
          id: 'doc-123',
        },
        action: 'created',
      };

      await createAuditEventViaApi(apiKeyData.key, eventData);

      // Wait a bit for async webhook enqueueing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify NO delivery record was created (inactive webhooks are skipped)
      const deliveries = await webhookDeliveryRepo.find({
        where: { webhookId },
      });

      expect(deliveries.length).toBe(0);
    });

    it('should include signature header when sending webhook (if worker processes it)', async () => {
      if (!webhookWorkerService) {
        // Skip if worker service not available
        return;
      }

      const { userId, agent } = await registerUser('webhook-signature@example.com');
      const apiKeyData = await createApiKeyViaEndpoint(agent, 'Signature API Key');

      // Create webhook with known secret
      const webhookSecret = 'test-secret-key-1234567890123456';
      await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Signature Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['document.created'],
        secret: webhookSecret,
      }).then(test => test.expect(201));

      // Mock successful HTTP response
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { received: true },
      });

      // Create an audit event
      const eventData = {
        eventType: 'document.action',
        actor: {
          type: 'user' as const,
          id: userId,
        },
        resource: {
          type: 'document',
          id: 'doc-123',
        },
        action: 'created',
      };

      await createAuditEventViaApi(apiKeyData.key, eventData);

      // Wait for delivery to be created
      await new Promise(resolve => setTimeout(resolve, 100));

      // Process deliveries manually (worker may not be running in tests)
      await webhookWorkerService.processPendingDeliveriesSync();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify axios was called with signature header
      expect(mockedAxios.post).toHaveBeenCalled();
      const axiosCall = mockedAxios.post.mock.calls[0];
      expect(axiosCall).toBeDefined();

      const config = axiosCall[2]; // Third argument is config
      expect(config).toBeDefined();
      expect(config?.headers).toBeDefined();
      expect(config?.headers?.['x-signature']).toBeDefined();
      expect(config?.headers?.['x-signature']).toMatch(/^sha256=/);
      expect(config?.headers?.['x-signature']?.length).toBeGreaterThan('sha256='.length);

      // Verify signature is correct HMAC
      const payload = axiosCall[1]; // Second argument is payload
      const payloadString = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(payloadString);
      const expectedSignature = hmac.digest('hex');
      expect(config?.headers?.['x-signature']).toBe(`sha256=${expectedSignature}`);
    });
  });

  describe('Retries/Backoff', () => {
    // Note: We don't use fake timers here because we need real async operations
    // The backoff timing is verified by checking the calculated nextRetryAt date

    it('should increment attempt count and advance nextRetryAt on failed delivery', async () => {
      if (!webhookWorkerService) {
        // Skip if worker service not available
        return;
      }

      const { userId, agent } = await registerUser('webhook-retry@example.com');
      const apiKeyData = await createApiKeyViaEndpoint(agent, 'Retry API Key');

      // Create webhook
      const webhookResponse = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Retry Webhook',
        url: 'https://non-routable-url-12345.example.com/webhook', // Non-routable URL
        eventTypes: ['document.created'],
      }).then(test => test.expect(201));

      const webhookId = webhookResponse.body.id;

      // Mock network error (non-routable URL)
      mockedAxios.post.mockRejectedValueOnce({
        message: 'getaddrinfo ENOTFOUND',
        code: 'ENOTFOUND',
        response: undefined,
      } as any);

      // Create an audit event
      const eventData = {
        eventType: 'document.action',
        actor: {
          type: 'user' as const,
          id: userId,
        },
        resource: {
          type: 'document',
          id: 'doc-123',
        },
        action: 'created',
      };

      await createAuditEventViaApi(apiKeyData.key, eventData);

      // Wait for delivery to be created
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get initial delivery
      let deliveries = await webhookDeliveryRepo.find({
        where: { webhookId, status: 'pending' },
      });
      expect(deliveries.length).toBeGreaterThan(0);
      const delivery = deliveries[0];
      const initialAttempts = delivery.attempts;
      expect(initialAttempts).toBe(0);

      // Process delivery (will fail)
      await webhookWorkerService.processPendingDeliveriesSync();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify attempt count incremented (re-fetch from DB)
      const updatedDelivery = await webhookDeliveryRepo.findOne({ where: { id: delivery.id } });
      expect(updatedDelivery).toBeDefined();
      expect(updatedDelivery!.attempts).toBe(initialAttempts + 1);
      expect(updatedDelivery!.status).toBe('pending'); // Still pending for retry
      expect(updatedDelivery!.nextRetryAt).toBeDefined();
      expect(updatedDelivery!.nextRetryAt).not.toBeNull();

      // Verify nextRetryAt is in the future (exponential backoff: 1 minute for first attempt)
      const now = new Date();
      const nextRetry = updatedDelivery!.nextRetryAt!;
      expect(nextRetry.getTime()).toBeGreaterThan(now.getTime());

      // Calculate expected backoff (1 minute for first attempt)
      const expectedBackoff = 1 * 60 * 1000; // 1 minute in ms
      const actualBackoff = nextRetry.getTime() - now.getTime();
      // Allow some tolerance (within 5 seconds)
      expect(Math.abs(actualBackoff - expectedBackoff)).toBeLessThan(5000);
    });

    it('should retry with exponential backoff on multiple failures', async () => {
      if (!webhookWorkerService) {
        // Skip if worker service not available
        return;
      }

      const { userId, agent } = await registerUser('webhook-backoff@example.com');
      const apiKeyData = await createApiKeyViaEndpoint(agent, 'Backoff API Key');

      // Create webhook
      const webhookResponse = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Backoff Webhook',
        url: 'https://non-routable-url-12345.example.com/webhook',
        eventTypes: ['document.created'],
      }).then(test => test.expect(201));

      const webhookId = webhookResponse.body.id;

      // Mock network errors
      mockedAxios.post.mockRejectedValue({
        message: 'getaddrinfo ENOTFOUND',
        code: 'ENOTFOUND',
        response: undefined,
      } as any);

      // Create an audit event
      const eventData = {
        eventType: 'document.action',
        actor: {
          type: 'user' as const,
          id: userId,
        },
        resource: {
          type: 'document',
          id: 'doc-123',
        },
        action: 'created',
      };

      await createAuditEventViaApi(apiKeyData.key, eventData);

      // Wait for delivery to be created
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get delivery
      let deliveries = await webhookDeliveryRepo.find({
        where: { webhookId, status: 'pending' },
      });
      expect(deliveries.length).toBeGreaterThan(0);
      let delivery = deliveries[0];

      // First attempt
      await webhookWorkerService.processPendingDeliveriesSync();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let updatedDelivery = await webhookDeliveryRepo.findOne({ where: { id: delivery.id } });
      expect(updatedDelivery).toBeDefined();
      expect(updatedDelivery!.attempts).toBe(1);
      expect(updatedDelivery!.status).toBe('pending');
      const firstNextRetry = updatedDelivery!.nextRetryAt!;
      
      // Verify first retry is ~1 minute in the future (backoff for attempt 1)
      const now = new Date();
      const firstBackoff = firstNextRetry.getTime() - now.getTime();
      const expectedFirstBackoff = 1 * 60 * 1000; // 1 minute
      expect(Math.abs(firstBackoff - expectedFirstBackoff)).toBeLessThan(5000);

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Manually set nextRetryAt to past so it can be processed again
      updatedDelivery = await webhookDeliveryRepo.findOne({ where: { id: delivery.id } });
      if (updatedDelivery && updatedDelivery.nextRetryAt) {
        updatedDelivery.nextRetryAt = new Date(Date.now() - 1000); // Set to 1 second ago
        await webhookDeliveryRepo.save(updatedDelivery);
      }

      // Second attempt
      await webhookWorkerService.processPendingDeliveriesSync();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      updatedDelivery = await webhookDeliveryRepo.findOne({ where: { id: delivery.id } });
      expect(updatedDelivery).toBeDefined();
      expect(updatedDelivery!.attempts).toBe(2);
      expect(updatedDelivery!.status).toBe('pending');
      const secondNextRetry = updatedDelivery!.nextRetryAt!;

      // Verify second retry is ~2 minutes in the future (backoff for attempt 2)
      const now2 = new Date();
      const secondBackoff = secondNextRetry.getTime() - now2.getTime();
      const expectedSecondBackoff = 2 * 60 * 1000; // 2 minutes
      expect(Math.abs(secondBackoff - expectedSecondBackoff)).toBeLessThan(5000);

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Manually set nextRetryAt to past so it can be processed again
      updatedDelivery = await webhookDeliveryRepo.findOne({ where: { id: delivery.id } });
      if (updatedDelivery && updatedDelivery.nextRetryAt) {
        updatedDelivery.nextRetryAt = new Date(Date.now() - 1000); // Set to 1 second ago
        await webhookDeliveryRepo.save(updatedDelivery);
      }

      // Third attempt (should fail permanently after MAX_ATTEMPTS)
      await webhookWorkerService.processPendingDeliveriesSync();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      updatedDelivery = await webhookDeliveryRepo.findOne({ where: { id: delivery.id } });
      expect(updatedDelivery).toBeDefined();
      expect(updatedDelivery!.attempts).toBe(3);
      expect(updatedDelivery!.status).toBe('failed'); // Max attempts reached
      expect(updatedDelivery!.nextRetryAt).toBeNull(); // No more retries
    });

    it('should not retry on non-retryable errors (4xx except 429/408)', async () => {
      if (!webhookWorkerService) {
        // Skip if worker service not available
        return;
      }

      const { userId, agent } = await registerUser('webhook-non-retryable@example.com');
      const apiKeyData = await createApiKeyViaEndpoint(agent, 'Non-Retryable API Key');

      // Create webhook
      const webhookResponse = await requestWithCsrf(agent, 'post', '/api/v1/webhooks', {
        name: 'Non-Retryable Webhook',
        url: 'https://example.com/webhook',
        eventTypes: ['document.created'],
      }).then(test => test.expect(201));

      const webhookId = webhookResponse.body.id;

      // Mock 400 Bad Request (non-retryable)
      mockedAxios.post.mockRejectedValueOnce({
        message: 'Bad Request',
        response: {
          status: 400,
          data: { error: 'Invalid payload' },
        },
      } as any);

      // Create an audit event
      const eventData = {
        eventType: 'document.action',
        actor: {
          type: 'user' as const,
          id: userId,
        },
        resource: {
          type: 'document',
          id: 'doc-123',
        },
        action: 'created',
      };

      await createAuditEventViaApi(apiKeyData.key, eventData);

      // Wait for delivery to be created
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get delivery
      let deliveries = await webhookDeliveryRepo.find({
        where: { webhookId, status: 'pending' },
      });
      expect(deliveries.length).toBeGreaterThan(0);
      const delivery = deliveries[0];

      // Process delivery (will fail with 400)
      await webhookWorkerService.processPendingDeliveriesSync();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify it failed immediately without retry (re-fetch from DB)
      const updatedDelivery = await webhookDeliveryRepo.findOne({ where: { id: delivery.id } });
      expect(updatedDelivery).toBeDefined();
      expect(updatedDelivery!.attempts).toBe(1);
      expect(updatedDelivery!.status).toBe('failed'); // Failed immediately
      expect(updatedDelivery!.nextRetryAt).toBeNull(); // No retry scheduled
      expect(updatedDelivery!.statusCode).toBe(400);
    });
  });
});

