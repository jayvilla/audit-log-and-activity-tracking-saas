/**
 * Webhook DTOs
 */

export interface WebhookDto {
  id: string;
  orgId: string;
  name: string;
  url: string;
  eventTypes: string[];
  secret: string; // Masked in responses
  active: boolean;
  lastTriggeredAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  eventTypes: string[];
  secret?: string; // Optional custom secret
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  eventTypes?: string[];
  active?: boolean;
  secret?: string;
}

export interface WebhookDeliveryDto {
  id: string;
  webhookId: string;
  eventId: string;
  status: 'pending' | 'success' | 'failed';
  statusCode: number | null;
  responseBody: string | null;
  attemptedAt: string;
  completedAt: string | null;
  retryCount: number;
}

export interface WebhookDeliveryListResponse {
  deliveries: WebhookDeliveryDto[];
  total: number;
  limit: number;
  offset: number;
}

