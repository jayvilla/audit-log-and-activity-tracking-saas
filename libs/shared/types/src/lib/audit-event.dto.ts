/**
 * Audit Event DTOs
 * Core append-only log structure
 */

export interface AuditEventDto {
  id: string;
  orgId: string;
  eventType: string;
  actor: Actor;
  resource: Resource;
  action: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  createdAt: string;
}

export interface Actor {
  type: 'user' | 'api-key' | 'system';
  id: string;
  name?: string;
  email?: string;
}

export interface Resource {
  type: string;
  id: string;
  name?: string;
}

export interface CreateAuditEventRequest {
  eventType: string;
  actor: Actor;
  resource: Resource;
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string; // Optional, defaults to now
}

export interface AuditEventFilter {
  eventType?: string[];
  actorType?: ('user' | 'api-key' | 'system')[];
  actorId?: string;
  resourceType?: string[];
  resourceId?: string;
  action?: string[];
  startDate?: string;
  endDate?: string;
  search?: string; // Full-text search in metadata
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditEventListResponse {
  events: AuditEventDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditEventExportRequest {
  format: 'json' | 'csv';
  filter: AuditEventFilter;
}

