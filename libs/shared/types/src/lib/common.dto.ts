/**
 * Common DTOs and types
 */

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

