/**
 * Phase 1 Auth Integration Tests
 * 
 * Tests authentication endpoints:
 * - Register -> sets session cookie; returns user
 * - Login -> sets session cookie; /auth/me returns user after login
 * - Logout -> clears session; /auth/me returns 401 after logout
 * - /auth/me returns 401 when unauthenticated
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../test/test-app.factory';
import { requestWithAgent, requestWithCsrf } from '../../test/http-helpers';

describe('Auth Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user, set session cookie, and return user', async () => {
      const agent = requestWithAgent(app);

      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const response = await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // Verify response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin', // First user in org is admin
      });
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('orgId');
      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Verify session cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieArray = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
      expect(cookieArray.some((cookie: string) => cookie.includes('sessionId'))).toBe(true);

      // Verify /auth/me returns the user (session is active)
      const meResponse = await agent.get('/api/auth/me').expect(200);
      expect(meResponse.body.user.email).toBe('test@example.com');
      expect(meResponse.body.user.name).toBe('Test User');
    });

    it('should reject duplicate email registration', async () => {
      const agent = requestWithAgent(app);

      const registerData = {
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'First User',
      };

      // First registration should succeed
      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // Second registration with same email should fail
      const newAgent = requestWithAgent(app);
      await requestWithCsrf(newAgent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(409));
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user, set session cookie, and /auth/me returns user', async () => {
      const agent = requestWithAgent(app);

      // First register a user
      const registerData = {
        email: 'login@example.com',
        password: 'password123',
        name: 'Login User',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // Logout first (clear session)
      await requestWithCsrf(agent, 'post', '/api/auth/logout')
        .then(test => test.expect(200));

      // Verify logged out
      await agent.get('/api/auth/me').expect(401);

      // Now login
      const loginData = {
        email: 'login@example.com',
        password: 'password123',
      };

      const loginResponse = await requestWithCsrf(agent, 'post', '/api/auth/login', loginData)
        .then(test => test.expect(200));

      // Verify response structure
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body.user.email).toBe('login@example.com');
      expect(loginResponse.body.user.name).toBe('Login User');

      // Verify session cookie is set
      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieArray = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
      expect(cookieArray.some((cookie: string) => cookie.includes('sessionId'))).toBe(true);

      // Verify /auth/me returns the user after login
      const meResponse = await agent.get('/api/auth/me').expect(200);
      expect(meResponse.body.user.email).toBe('login@example.com');
      expect(meResponse.body.user.name).toBe('Login User');
    });

    it('should reject invalid credentials', async () => {
      const agent = requestWithAgent(app);

      // Register a user
      const registerData = {
        email: 'invalid@example.com',
        password: 'password123',
        name: 'Invalid User',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // Try to login with wrong password
      const loginData = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/login', loginData)
        .then(test => test.expect(401));
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear session and /auth/me returns 401 after logout', async () => {
      const agent = requestWithAgent(app);

      // Register and login
      const registerData = {
        email: 'logout@example.com',
        password: 'password123',
        name: 'Logout User',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // Verify authenticated
      await agent.get('/api/auth/me').expect(200);

      // Logout
      await requestWithCsrf(agent, 'post', '/api/auth/logout')
        .then(test => test.expect(200));

      // Verify /auth/me returns 401 after logout
      await agent.get('/api/auth/me').expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when unauthenticated', async () => {
      const agent = requestWithAgent(app);

      // No session, should return 401
      await agent.get('/api/auth/me').expect(401);
    });

    it('should return user when authenticated', async () => {
      const agent = requestWithAgent(app);

      // Register a user (creates session)
      const registerData = {
        email: 'me@example.com',
        password: 'password123',
        name: 'Me User',
      };

      await requestWithCsrf(agent, 'post', '/api/auth/register', registerData)
        .then(test => test.expect(201));

      // /auth/me should return user
      const response = await agent.get('/api/auth/me').expect(200);
      expect(response.body.user.email).toBe('me@example.com');
      expect(response.body.user.name).toBe('Me User');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('orgId');
      expect(response.body.user).toHaveProperty('role');
    });
  });
});

