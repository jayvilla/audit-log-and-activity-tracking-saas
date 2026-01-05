/**
 * API client utilities for authentication and API calls
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Get CSRF token from the API
 * This should be called before any POST/PUT/DELETE requests
 */
export async function getCsrfToken(): Promise<string> {
  const response = await fetch(`${API_URL}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token');
  }

  const data = await response.json();
  return data.token;
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<{ user: any }> {
  // First, get CSRF token
  const csrfToken = await getCsrfToken();

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
}

/**
 * Get current user (verify authentication)
 * Client-side version - uses cookies automatically via credentials: 'include'
 */
export async function getMe(): Promise<{ user: any } | null> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store', // Ensure fresh data
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Get current user (server-side version)
 * For use in Server Components - passes cookies from the request
 */
export async function getMeServer(cookieHeader?: string): Promise<{ user: any } | null> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Pass cookies from the request if provided
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers,
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Register a new user
 */
export async function register(
  email: string,
  password: string,
  name: string
): Promise<{ user: any; sessionToken: string }> {
  // First, get CSRF token
  const csrfToken = await getCsrfToken();

  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Registration failed' }));
    throw new Error(error.message || 'Registration failed');
  }

  return response.json();
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  const csrfToken = await getCsrfToken();

  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
  });
}

export interface GetAuditEventsParams {
  cursor?: string;
  startDate?: string;
  endDate?: string;
  action?: string | string[];
  actorType?: 'user' | 'api-key' | 'system';
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  status?: string | string[];
  ipAddress?: string;
  metadataText?: string;
  limit?: number;
}

export interface AuditEvent {
  id: string;
  orgId: string;
  actorType: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface GetAuditEventsResponse {
  data: AuditEvent[];
  pageInfo: {
    nextCursor: string | null;
  };
}

/**
 * Get audit events with filters and pagination
 */
export async function getAuditEvents(
  params: GetAuditEventsParams = {},
): Promise<GetAuditEventsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.cursor) queryParams.append('cursor', params.cursor);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  
  // Handle action(s) - can be string or array
  if (params.action) {
    if (Array.isArray(params.action)) {
      queryParams.append('action', params.action.join(','));
    } else {
      queryParams.append('action', params.action);
    }
  }
  
  if (params.actorType) queryParams.append('actorType', params.actorType);
  if (params.actorId) queryParams.append('actorId', params.actorId);
  if (params.resourceType) queryParams.append('resourceType', params.resourceType);
  if (params.resourceId) queryParams.append('resourceId', params.resourceId);
  
  // Handle status(es) - can be string or array
  if (params.status) {
    if (Array.isArray(params.status)) {
      queryParams.append('status', params.status.join(','));
    } else {
      queryParams.append('status', params.status);
    }
  }
  
  if (params.ipAddress) queryParams.append('ipAddress', params.ipAddress);
  if (params.metadataText) queryParams.append('metadataText', params.metadataText);
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const response = await fetch(`${API_URL}/v1/audit-events?${queryParams.toString()}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch audit events');
  }

  return response.json();
}

/**
 * Export audit events as JSON
 */
export async function exportAuditEventsAsJson(
  params: GetAuditEventsParams = {},
): Promise<AuditEvent[]> {
  const queryParams = new URLSearchParams();
  
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  
  // Handle action(s) - can be string or array
  if (params.action) {
    if (Array.isArray(params.action)) {
      queryParams.append('action', params.action.join(','));
    } else {
      queryParams.append('action', params.action);
    }
  }
  
  if (params.actorType) queryParams.append('actorType', params.actorType);
  if (params.actorId) queryParams.append('actorId', params.actorId);
  if (params.resourceType) queryParams.append('resourceType', params.resourceType);
  if (params.resourceId) queryParams.append('resourceId', params.resourceId);
  
  // Handle status(es) - can be string or array
  if (params.status) {
    if (Array.isArray(params.status)) {
      queryParams.append('status', params.status.join(','));
    } else {
      queryParams.append('status', params.status);
    }
  }
  
  if (params.ipAddress) queryParams.append('ipAddress', params.ipAddress);
  if (params.metadataText) queryParams.append('metadataText', params.metadataText);

  const response = await fetch(`${API_URL}/v1/audit-events/export.json?${queryParams.toString()}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error('Failed to export audit events');
  }

  return response.json();
}

/**
 * Export audit events as CSV (returns blob)
 */
export async function exportAuditEventsAsCsv(
  params: GetAuditEventsParams = {},
): Promise<Blob> {
  const queryParams = new URLSearchParams();
  
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  
  // Handle action(s) - can be string or array
  if (params.action) {
    if (Array.isArray(params.action)) {
      queryParams.append('action', params.action.join(','));
    } else {
      queryParams.append('action', params.action);
    }
  }
  
  if (params.actorType) queryParams.append('actorType', params.actorType);
  if (params.actorId) queryParams.append('actorId', params.actorId);
  if (params.resourceType) queryParams.append('resourceType', params.resourceType);
  if (params.resourceId) queryParams.append('resourceId', params.resourceId);
  
  // Handle status(es) - can be string or array
  if (params.status) {
    if (Array.isArray(params.status)) {
      queryParams.append('status', params.status.join(','));
    } else {
      queryParams.append('status', params.status);
    }
  }
  
  if (params.ipAddress) queryParams.append('ipAddress', params.ipAddress);
  if (params.metadataText) queryParams.append('metadataText', params.metadataText);

  const response = await fetch(`${API_URL}/v1/audit-events/export.csv?${queryParams.toString()}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error('Failed to export audit events');
  }

  return response.blob();
}

/**
 * API Key types and functions
 */
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
}

export interface CreateApiKeyRequest {
  name: string;
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // Full key shown only once
  keyPrefix: string;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * Get all API keys for the current organization
 */
export async function getApiKeys(): Promise<ApiKey[]> {
  const response = await fetch(`${API_URL}/api-keys`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch API keys');
  }

  return response.json();
}

/**
 * Create a new API key
 */
export async function createApiKey(
  request: CreateApiKeyRequest,
): Promise<CreateApiKeyResponse> {
  const csrfToken = await getCsrfToken();

  const response = await fetch(`${API_URL}/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create API key' }));
    throw new Error(error.message || 'Failed to create API key');
  }

  return response.json();
}

/**
 * Revoke (delete) an API key
 */
export async function revokeApiKey(id: string): Promise<void> {
  const csrfToken = await getCsrfToken();

  const response = await fetch(`${API_URL}/api-keys/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to revoke API key' }));
    throw new Error(error.message || 'Failed to revoke API key');
  }
}

/**
 * Overview metrics types
 */
export interface OverviewMetrics {
  eventsToday: number;
  eventsTodayChange: number;
  activeUsers: number;
  activeUsersChange: number;
  successRate: number;
  avgResponseTime: number;
  eventActivityLast7Days: Array<{ date: string; events: number }>;
  topActions: Array<{ action: string; count: number }>;
  recentActivity: Array<{
    id: string;
    actor: string | null;
    action: string;
    resourceType: string;
    createdAt: string;
    status: 'success' | 'failure';
  }>;
}

/**
 * Get overview metrics for the dashboard
 */
export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const response = await fetch(`${API_URL}/v1/audit-events/overview`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch overview metrics');
  }

  return response.json();
}

/**
 * Webhook types and functions
 */
export interface Webhook {
  id: string;
  orgId: string;
  name: string;
  url: string;
  eventTypes: string[];
  secret: string; // Masked secret
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  eventTypes: string[];
  secret?: string;
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  eventTypes?: string[];
  active?: boolean;
  secret?: string;
}

/**
 * Get all webhooks for the current organization
 */
export async function getWebhooks(): Promise<Webhook[]> {
  const response = await fetch(`${API_URL}/v1/webhooks`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error('Failed to fetch webhooks');
  }

  return response.json();
}

/**
 * Get a webhook by ID
 */
export async function getWebhook(id: string): Promise<Webhook> {
  const response = await fetch(`${API_URL}/v1/webhooks/${id}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Webhook not found');
    }
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error('Failed to fetch webhook');
  }

  return response.json();
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  request: CreateWebhookRequest,
): Promise<Webhook> {
  const csrfToken = await getCsrfToken();

  const response = await fetch(`${API_URL}/v1/webhooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create webhook' }));
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error(error.message || 'Failed to create webhook');
  }

  return response.json();
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  id: string,
  request: UpdateWebhookRequest,
): Promise<Webhook> {
  const csrfToken = await getCsrfToken();

  const response = await fetch(`${API_URL}/v1/webhooks/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update webhook' }));
    if (response.status === 404) {
      throw new Error('Webhook not found');
    }
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error(error.message || 'Failed to update webhook');
  }

  return response.json();
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(id: string): Promise<void> {
  const csrfToken = await getCsrfToken();

  const response = await fetch(`${API_URL}/v1/webhooks/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete webhook' }));
    if (response.status === 404) {
      throw new Error('Webhook not found');
    }
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error(error.message || 'Failed to delete webhook');
  }
}

/**
 * Webhook Delivery types and functions
 */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  webhookName?: string;
  eventType: string;
  endpoint: string;
  status: 'success' | 'failed' | 'pending' | 'retrying';
  statusCode: number | null;
  latency: number | null; // in milliseconds
  attempts: number;
  attemptedAt: string;
  completedAt: string | null;
  payload: string;
  response: string | null;
  error: string | null;
}

export interface GetWebhookDeliveriesParams {
  webhookId?: string;
  status?: 'success' | 'failed' | 'pending' | 'retrying';
  startDate?: string;
  endDate?: string;
  eventType?: string;
  endpoint?: string;
  minLatency?: number;
  maxLatency?: number;
  limit?: number;
  offset?: number;
}

export interface WebhookDeliveriesResponse {
  deliveries: WebhookDelivery[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get webhook deliveries with filters
 * TODO: Implement backend endpoint if not available
 */
export async function getWebhookDeliveries(
  params: GetWebhookDeliveriesParams = {},
): Promise<WebhookDeliveriesResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.webhookId) queryParams.append('webhookId', params.webhookId);
  if (params.status) queryParams.append('status', params.status);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.eventType) queryParams.append('eventType', params.eventType);
  if (params.endpoint) queryParams.append('endpoint', params.endpoint);
  if (params.minLatency !== undefined) queryParams.append('minLatency', params.minLatency.toString());
  if (params.maxLatency !== undefined) queryParams.append('maxLatency', params.maxLatency.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());

  const response = await fetch(`${API_URL}/v1/webhooks/deliveries?${queryParams.toString()}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    // If endpoint doesn't exist yet, return empty response
    if (response.status === 404) {
      return {
        deliveries: [],
        total: 0,
        limit: params.limit || 50,
        offset: params.offset || 0,
      };
    }
    throw new Error('Failed to fetch webhook deliveries');
  }

  return response.json();
}

/**
 * Get a single webhook delivery by ID
 * TODO: Implement backend endpoint if not available
 */
export async function getWebhookDelivery(id: string): Promise<WebhookDelivery> {
  const response = await fetch(`${API_URL}/v1/webhooks/deliveries/${id}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Webhook delivery not found');
    }
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error('Failed to fetch webhook delivery');
  }

  return response.json();
}

/**
 * Replay a failed webhook delivery
 * TODO: Implement backend endpoint if not available
 */
export async function replayWebhookDelivery(id: string): Promise<{ success: boolean; deliveryId: string }> {
  const csrfToken = await getCsrfToken();

  const response = await fetch(`${API_URL}/v1/webhooks/deliveries/${id}/replay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to replay webhook delivery' }));
    if (response.status === 404) {
      throw new Error('Webhook delivery not found');
    }
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 403) {
      throw new Error('Forbidden: Admin role required');
    }
    throw new Error(error.message || 'Failed to replay webhook delivery');
  }

  return response.json();
}

/**
 * Organization types and functions
 */
export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get current user's organization
 */
export async function getOrganization(): Promise<Organization> {
  const response = await fetch(`${API_URL}/orgs`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    if (response.status === 404) {
      throw new Error('Organization not found');
    }
    throw new Error('Failed to fetch organization');
  }

  return response.json();
}

