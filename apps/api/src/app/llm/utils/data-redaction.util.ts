/**
 * Data Redaction Utilities
 * 
 * Removes sensitive information from audit events before sending to LLM.
 * Per LLM rules: Never send secrets, minimize data, prefer IDs + summaries.
 */

export interface RedactedAuditEvent {
  id: string;
  timestamp: string;
  actorType: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  status?: string;
  // Minimal metadata - no secrets, no full payloads
  metadataSummary?: string;
}

/**
 * Redact sensitive information from audit events
 */
export function redactAuditEvents(events: Array<{
  id: string;
  createdAt: Date;
  actorType: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown> | null;
}>): RedactedAuditEvent[] {
  return events.map((event) => {
    const redacted: RedactedAuditEvent = {
      id: event.id,
      timestamp: event.createdAt.toISOString(),
      actorType: event.actorType,
      actorId: event.actorId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
    };

    // Extract status if present (safe to include)
    if (event.metadata && event.metadata.status) {
      redacted.status = String(event.metadata.status);
    }

    // Create minimal metadata summary (exclude secrets)
    if (event.metadata && typeof event.metadata === 'object') {
      const safeMetadata: Record<string, unknown> = {};
      const secretKeys = [
        'password',
        'secret',
        'token',
        'key',
        'apiKey',
        'api_key',
        'auth',
        'authorization',
        'cookie',
        'session',
        'credential',
      ];

      for (const [key, value] of Object.entries(event.metadata)) {
        const lowerKey = key.toLowerCase();
        const isSecret = secretKeys.some((secret) => lowerKey.includes(secret));
        
        if (!isSecret && value !== null && value !== undefined) {
          // Truncate long values
          const stringValue = String(value);
          safeMetadata[key] = stringValue.length > 100 
            ? stringValue.substring(0, 100) + '...' 
            : stringValue;
        }
      }

      if (Object.keys(safeMetadata).length > 0) {
        redacted.metadataSummary = JSON.stringify(safeMetadata);
      }
    }

    return redacted;
  });
}

/**
 * Format time range for display
 */
export function formatTimeRange(startDate?: Date, endDate?: Date): string {
  if (!startDate && !endDate) {
    return 'All time';
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  if (startDate) {
    return `Since ${formatDate(startDate)}`;
  }

  return `Until ${formatDate(endDate!)}`;
}

/**
 * Format filters for display
 */
export function formatFilters(filters: {
  actions?: string[];
  statuses?: string[];
  actor?: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  search?: string;
}): string[] {
  const formatted: string[] = [];

  if (filters.actions && filters.actions.length > 0) {
    formatted.push(`Actions: ${filters.actions.join(', ')}`);
  }

  if (filters.statuses && filters.statuses.length > 0) {
    formatted.push(`Status: ${filters.statuses.join(', ')}`);
  }

  if (filters.actor) {
    formatted.push(`Actor: ${filters.actor}`);
  }

  if (filters.resourceType) {
    formatted.push(`Resource: ${filters.resourceType}`);
  }

  if (filters.resourceId) {
    formatted.push(`Resource ID: ${filters.resourceId}`);
  }

  if (filters.ip) {
    formatted.push(`IP: ${filters.ip}`);
  }

  if (filters.search) {
    formatted.push(`Search: ${filters.search}`);
  }

  return formatted;
}

