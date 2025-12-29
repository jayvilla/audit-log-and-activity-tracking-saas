/**
 * Organization DTOs
 */

import type { UserRole } from './user.dto';

export interface OrgDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrgRequest {
  name: string;
  slug: string;
}

export interface UpdateOrgRequest {
  name?: string;
  slug?: string;
}

export interface OrgMemberDto {
  id: string;
  userId: string;
  orgId: string;
  role: UserRole;
  user: {
    id: string;
    email: string;
    name: string;
  };
  createdAt: string;
}

export interface InviteMemberRequest {
  email: string;
  role: UserRole;
}

export interface UpdateMemberRoleRequest {
  role: UserRole;
}

// UserRole imported from auth.dto

