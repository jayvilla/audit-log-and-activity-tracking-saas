/**
 * Phase 0 HTTP Test Helpers
 * 
 * Provides utilities for making HTTP requests in tests:
 * - requestWithAgent: Supertest agent with cookie persistence
 * - requestWithCsrf: Fetches CSRF token and attaches to requests
 */

import { INestApplication } from '@nestjs/common';
import { SuperTest, Test } from 'supertest';
import { getTestAgent } from './test-app.factory';

/**
 * Get a Supertest agent with cookie persistence
 * 
 * Use this for requests that need to maintain session state.
 * 
 * @param app - NestJS application instance
 */
export function requestWithAgent(app: INestApplication): SuperTest<Test> {
  return getTestAgent(app) as unknown as SuperTest<Test>;
}

/**
 * Get CSRF token using a supertest agent
 */
export async function getCsrfToken(agent: SuperTest<Test>): Promise<string> {
  const response = await agent.get('/api/auth/csrf').expect(200);
  return response.body.token;
}

/**
 * Perform a mutating request with CSRF protection
 * 
 * Fetches CSRF token first, then performs the request with token + cookies.
 * Returns a Promise that resolves to a Test object. You must chain .expect() 
 * before awaiting the result.
 * 
 * Usage:
 *   const response = await requestWithCsrf(agent, 'post', '/api/auth/register', data)
 *     .then(test => test.expect(201));
 * 
 * @param agent - Supertest agent (from requestWithAgent)
 * @param method - HTTP method
 * @param path - Request path
 * @param data - Request body (optional)
 */
export function requestWithCsrf(
  agent: SuperTest<Test>,
  method: 'post' | 'patch' | 'put' | 'delete',
  path: string,
  data?: any,
): Promise<Test> {
  // Fetch CSRF token first, then return the Test object
  // We need to ensure the token is available before creating the Test
  const tokenPromise = getCsrfToken(agent);
  
  // Create a thenable that preserves the Test object's methods
  // This is necessary because Test extends Promise<Response>, and when wrapped
  // in a regular Promise, the Test methods are lost
  const thenable = {
    then: <TResult1 = Test, TResult2 = never>(
      onfulfilled?: ((value: Test) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> => {
      return tokenPromise.then((csrfToken) => {
        const req = agent[method](path).set('x-csrf-token', csrfToken);
        
        // If data is provided, call send() which returns a Test object (chainable, lazy)
        // Test extends Promise<Response> but also has .expect() method
        const testObj = data !== undefined && data !== null 
          ? req.send(data) 
          : req;
        
        // Call the onfulfilled callback with the Test object, preserving its methods
        if (onfulfilled) {
          return onfulfilled(testObj as Test);
        }
        return testObj as unknown as TResult1;
      }).catch(onrejected || undefined);
    },
  };
  
  return thenable as Promise<Test>;
}

/**
 * Re-export getTestAgent for convenience
 */
export { getTestAgent } from './test-app.factory';

