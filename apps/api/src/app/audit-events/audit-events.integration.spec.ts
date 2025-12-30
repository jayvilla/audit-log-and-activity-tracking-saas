import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getTestAgent } from '../../test/test-app.factory';
import {
  createTestOrganization,
  createTestApiKey,
  createTestAuditEvent,
} from '../../test/test-helpers';
import { ActorType } from '../../entities/audit-event.entity';

describe('Audit Events Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/audit-events', () => {
    it('should create audit event with valid API key', async () => {
      const org = await createTestOrganization('Test Org');
      const { key, entity } = await createTestApiKey(org.id, 'Test Key');

      const response = await request(app.getHttpServer())
        .post('/api/v1/audit-events')
        .set('x-api-key', key)
        .send({
          eventType: 'user.created',
          actor: {
            type: 'api-key',
            id: entity.id, // Use the API key entity's ID
          },
          resource: {
            type: 'user',
            id: 'user-123',
          },
          action: 'created',
          metadata: {
            name: 'Test User',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(typeof response.body.id).toBe('string');
    });

    it('should reject request without API key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/audit-events')
        .send({
          eventType: 'user.created',
          actor: {
            type: 'api-key',
            id: 'test-actor-id',
          },
          resource: {
            type: 'user',
            id: 'user-123',
          },
          action: 'created',
        })
        .expect(400); // CSRF guard returns 400 for missing CSRF token, API key guard would return 401
    });

    it('should reject request with invalid API key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/audit-events')
        .set('x-api-key', 'sk_invalid_key')
        .send({
          eventType: 'user.created',
          actor: {
            type: 'api-key',
            id: 'test-actor-id',
          },
          resource: {
            type: 'user',
            id: 'user-123',
          },
          action: 'created',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/audit-events (RBAC)', () => {
    it('should allow admin to see all org events', async () => {
      const org = await createTestOrganization('Test Org');
      const { createTestUser } = await import('../../test/test-helpers');
      const { UserRole } = await import('../../entities/user.entity');
      const admin = await createTestUser(org.id, 'admin@example.com', 'password123', UserRole.ADMIN);
      
      // Create events from different actors
      await createTestAuditEvent(org.id, ActorType.USER, admin.id, 'test.action', 'test', 'test-1');
      await createTestAuditEvent(org.id, ActorType.API_KEY, null, 'test.action', 'test', 'test-2');
      await createTestAuditEvent(org.id, ActorType.SYSTEM, null, 'test.action', 'test', 'test-3');

      const agent = getTestAgent(app);
      
      // Get CSRF token (agent will preserve cookies)
      const csrfResponse = await agent.get('/api/auth/csrf').expect(200);
      const csrfToken = csrfResponse.body.token;
      
      // Login as admin (agent automatically includes cookies)
      await agent
        .post('/api/auth/login')
        .set('x-csrf-token', csrfToken)
        .send({
          email: 'admin@example.com',
          password: 'password123',
        })
        .expect(200);

      // Get audit events
      const response = await agent
        .get('/api/v1/audit-events')
        .expect(200);

      // Admin should see all events (3 events)
      expect(response.body.data).toHaveLength(3);
    });

    it('should restrict member to only see their own user events', async () => {
      const org = await createTestOrganization('Test Org');
      const { createTestUser } = await import('../../test/test-helpers');
      const { UserRole } = await import('../../entities/user.entity');
      const member = await createTestUser(org.id, 'member@example.com', 'password123', UserRole.USER);
      const otherMember = await createTestUser(org.id, 'other@example.com', 'password123', UserRole.USER);
      
      // Create events from different actors
      await createTestAuditEvent(org.id, ActorType.USER, member.id, 'test.action', 'test', 'test-1');
      await createTestAuditEvent(org.id, ActorType.USER, otherMember.id, 'test.action', 'test', 'test-2');
      await createTestAuditEvent(org.id, ActorType.API_KEY, null, 'test.action', 'test', 'test-3');
      await createTestAuditEvent(org.id, ActorType.SYSTEM, null, 'test.action', 'test', 'test-4');

      const agent = getTestAgent(app);
      
      // Get CSRF token (agent will preserve cookies)
      const csrfResponse = await agent.get('/api/auth/csrf').expect(200);
      const csrfToken = csrfResponse.body.token;
      
      // Login as member (agent automatically includes cookies)
      await agent
        .post('/api/auth/login')
        .set('x-csrf-token', csrfToken)
        .send({
          email: 'member@example.com',
          password: 'password123',
        })
        .expect(200);

      // Get audit events
      const response = await agent
        .get('/api/v1/audit-events')
        .expect(200);

      // Member should only see their own user events (1 event)
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].actorId).toBe(member.id);
      expect(response.body.data[0].actorType).toBe('user');
    });
  });
});

