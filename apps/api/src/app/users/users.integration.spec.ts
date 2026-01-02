/**
 * Phase 1 Users Integration Tests
 * 
 * Tests user profile endpoints:
 * - PATCH /api/users/me updates name and validates non-empty name
 * - Assert an audit event row exists for this change (query DB directly)
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../test/test-app.factory';
import { requestWithAgent, requestWithCsrf } from '../../test/http-helpers';
import { getTestDataSource } from '../../test/setup';
import { AuditEventEntity } from '../../entities/audit-event.entity';
import { DataSource } from 'typeorm';

describe('Users Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = await getTestDataSource();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PATCH /api/users/me', () => {
    it('should update user name and validate non-empty name', async () => {
      const agent = requestWithAgent(app);

      // Register a user first
      const registerData = {
        email: 'update@example.com',
        password: 'password123',
        name: 'Original Name',
      };

      const registerResponse = await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      const userId = registerResponse.body.user.id;

      // Update name
      const updateData = {
        name: 'Updated Name',
      };

      const updateResponse = await requestWithCsrf(agent, 'patch', '/api/users/me', updateData)
        .then(test => test.expect(200));

      // Verify name was updated
      expect(updateResponse.body.user.name).toBe('Updated Name');
      expect(updateResponse.body.user.email).toBe('update@example.com');
      expect(updateResponse.body.user.id).toBe(userId);

      // Verify /auth/me also returns updated name
      const meResponse = await agent.get('/api/auth/me').expect(200);
      expect(meResponse.body.user.name).toBe('Updated Name');
    });

    it('should reject empty name', async () => {
      const agent = requestWithAgent(app);

      // Register a user first
      const registerData = {
        email: 'empty@example.com',
        password: 'password123',
        name: 'Original Name',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // Try to update with empty name
      const updateData = {
        name: '',
      };

      await requestWithCsrf(agent, 'patch', '/api/users/me', updateData)
        .then(test => test.expect(400));
    });

    it('should reject whitespace-only name', async () => {
      const agent = requestWithAgent(app);

      // Register a user first
      const registerData = {
        email: 'whitespace@example.com',
        password: 'password123',
        name: 'Original Name',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // Try to update with whitespace-only name
      const updateData = {
        name: '   ',
      };

      await requestWithCsrf(agent, 'patch', '/api/users/me', updateData)
        .then(test => test.expect(400));
    });

    it('should create audit event when updating user profile', async () => {
      const agent = requestWithAgent(app);

      // Register a user first
      const registerData = {
        email: 'audittest@example.com',
        password: 'password123',
        name: 'Audit Test User',
      };

      const registerResponse = await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      const userId = registerResponse.body.user.id;
      const orgId = registerResponse.body.user.orgId;

      // Count audit events before update
      const auditRepo = dataSource.getRepository(AuditEventEntity);
      const beforeCount = await auditRepo.count({
        where: { orgId, action: 'profile_updated' },
      });

      // Update name
      const updateData = {
        name: 'Updated Audit Name',
      };

      await requestWithCsrf(agent, 'patch', '/api/users/me', updateData)
        .then(test => test.expect(200));

      // Verify audit event was created
      const afterCount = await auditRepo.count({
        where: { orgId, action: 'profile_updated' },
      });

      expect(afterCount).toBe(beforeCount + 1);

      // Verify audit event details
      const auditEvents = await auditRepo.find({
        where: { orgId, action: 'profile_updated' },
        order: { createdAt: 'DESC' },
        take: 1,
      });

      expect(auditEvents.length).toBe(1);
      const auditEvent = auditEvents[0];

      expect(auditEvent.actorType).toBe('user');
      expect(auditEvent.actorId).toBe(userId);
      expect(auditEvent.resourceType).toBe('user');
      expect(auditEvent.resourceId).toBe(userId);
      expect(auditEvent.action).toBe('profile_updated');
      expect(auditEvent.metadata).toMatchObject({ field: 'name' });
      expect(auditEvent.orgId).toBe(orgId);
    });

    it('should require authentication', async () => {
      const agent = requestWithAgent(app);

      // Try to update without authentication
      const updateData = {
        name: 'Unauthorized Update',
      };

      await requestWithCsrf(agent, 'patch', '/api/users/me', updateData)
        .then(test => test.expect(401));
    });
  });
});

