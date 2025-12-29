/**
 * API Key DTOs
 */

export interface ApiKeyDto {
  id: string;
  name: string;
  keyPrefix: string; // First 8 chars only for display
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
}

export interface CreateApiKeyRequest {
  name: string;
  expiresInDays?: number; // Optional expiration
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // Full key shown only once
  keyPrefix: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
}

