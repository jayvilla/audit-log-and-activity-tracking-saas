import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getTestAgent } from '../../test/test-app.factory';
import { createTestOrganization, createTestUser } from '../../test/test-helpers';
import { UserRole } from '../../entities/user.entity';

describe('Auth Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('should set session cookie on successful login', async () => {
      const org = await createTestOrganization('Test Org');
      const user = await createTestUser(org.id, 'test@example.com', 'password123');

      const agent = getTestAgent(app);
      
      // First get CSRF token (agent will preserve cookies)
      const csrfResponse = await agent.get('/api/auth/csrf').expect(200);
      const csrfToken = csrfResponse.body.token;
      
      // Now login with CSRF token (agent automatically includes cookies)
      const response = await agent
        .post('/api/auth/login')
        .set('x-csrf-token', csrfToken)
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      // Check that response contains user data
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');

      // Check that session cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      // Handle both string and array cases
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      expect(cookieArray).toEqual(
        expect.arrayContaining([
          expect.stringContaining('sessionId='),
        ]),
      );
      
      // Verify cookie is httpOnly
      const sessionCookie = cookieArray.find((cookie: string) => cookie.startsWith('sessionId='));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
    });

    it('should reject invalid credentials', async () => {
      const org = await createTestOrganization('Test Org');
      await createTestUser(org.id, 'test@example.com', 'password123');

      const agent = getTestAgent(app);
      
      // Get CSRF token (agent will preserve cookies)
      const csrfResponse = await agent.get('/api/auth/csrf').expect(200);
      const csrfToken = csrfResponse.body.token;
      
      await agent
        .post('/api/auth/login')
        .set('x-csrf-token', csrfToken)
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const org = await createTestOrganization('Test Org');
      const user = await createTestUser(org.id, 'test@example.com', 'password123');

      const agent = getTestAgent(app);
      
      // Get CSRF token (agent will preserve cookies)
      const csrfResponse = await agent.get('/api/auth/csrf').expect(200);
      const csrfToken = csrfResponse.body.token;
      
      // Login to set session cookie (agent automatically includes cookies)
      await agent
        .post('/api/auth/login')
        .set('x-csrf-token', csrfToken)
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      // Then call /auth/me with the cookie
      const response = await agent
        .get('/api/auth/me')
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.orgId).toBe(org.id);
    });

    it('should return 401 when not authenticated', async () => {
      const agent = getTestAgent(app);
      await agent
        .get('/api/auth/me')
        .expect(401);
    });
  });
});

