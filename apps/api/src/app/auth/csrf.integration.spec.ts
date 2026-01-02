/**
 * Phase 1 CSRF Integration Tests
 * 
 * Tests CSRF protection:
 * - Mutating request without CSRF returns 403
 * - Same request with requestWithCsrf helper succeeds
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from '../../test/test-app.factory';
import { requestWithAgent, requestWithCsrf } from '../../test/http-helpers';

describe('CSRF Protection', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('POST requests', () => {
    it('should reject POST without CSRF token', async () => {
      const agent = requestWithAgent(app);

      // Try to register without CSRF token
      const registerData = {
        email: 'nocsrf@example.com',
        password: 'password123',
        name: 'No CSRF User',
      };

      await agent.post('/api/auth/register').send(registerData).expect(403);
    });

    it('should accept POST with CSRF token via requestWithCsrf', async () => {
      const agent = requestWithAgent(app);

      const registerData = {
        email: 'withcsrf@example.com',
        password: 'password123',
        name: 'With CSRF User',
      };

      // Using requestWithCsrf helper should succeed
      const response = await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      expect(response.body.user.email).toBe('withcsrf@example.com');
    });
  });

  describe('PATCH requests', () => {
    it('should reject PATCH without CSRF token', async () => {
      const agent = requestWithAgent(app);

      // Register and login first
      const registerData = {
        email: 'patchtest@example.com',
        password: 'password123',
        name: 'Patch Test User',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // Try to update without CSRF token
      const updateData = {
        name: 'Updated Name',
      };

      await agent.patch('/api/users/me').send(updateData).expect(403);
    });

    it('should accept PATCH with CSRF token via requestWithCsrf', async () => {
      const agent = requestWithAgent(app);

      // Register and login first
      const registerData = {
        email: 'patchcsrf@example.com',
        password: 'password123',
        name: 'Patch CSRF User',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // Update with CSRF token should succeed
      const updateData = {
        name: 'Updated Name',
      };

      const response = await requestWithCsrf(agent, 'patch', '/api/users/me', updateData)
        .then(test => test.expect(200));

      expect(response.body.user.name).toBe('Updated Name');
    });
  });

  describe('DELETE requests', () => {
    it('should reject DELETE without CSRF token', async () => {
      const agent = requestWithAgent(app);

      // Register and login first
      const registerData = {
        email: 'deletetest@example.com',
        password: 'password123',
        name: 'Delete Test User',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // Try to logout (DELETE-like operation) without CSRF token
      await agent.post('/api/auth/logout').expect(403);
    });

    it('should accept DELETE-like operations with CSRF token', async () => {
      const agent = requestWithAgent(app);

      // Register and login first
      const registerData = {
        email: 'deletecsrf@example.com',
        password: 'password123',
        name: 'Delete CSRF User',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // Logout with CSRF token should succeed
      await requestWithCsrf(agent, 'post', '/api/auth/logout')
        .then(test => test.expect(200));
    });
  });

  describe('GET requests', () => {
    it('should allow GET requests without CSRF token', async () => {
      const agent = requestWithAgent(app);

      // Register first
      const registerData = {
        email: 'gettest@example.com',
        password: 'password123',
        name: 'Get Test User',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // GET requests should work without CSRF
      const response = await agent.get('/api/auth/me').expect(200);
      expect(response.body.user.email).toBe('gettest@example.com');
    });
  });
});

