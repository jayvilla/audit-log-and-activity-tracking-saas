/**
 * Authentication DTOs
 * No NestJS decorators - pure TypeScript types for sharing between frontend and backend
 */

export interface LoginRequest {
  email: string;
  password: string;
}

import type { UserDto, UserRole } from './user.dto';

export interface LoginResponse {
  user: UserDto;
  sessionToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  user: UserDto;
  sessionToken: string;
}

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  orgId: string;
  role: UserRole;
}

