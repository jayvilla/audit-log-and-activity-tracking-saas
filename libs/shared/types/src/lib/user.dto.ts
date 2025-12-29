/**
 * User DTOs
 */

export type UserRole = 'admin' | 'member' | 'viewer';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// UserRole imported from auth.dto

