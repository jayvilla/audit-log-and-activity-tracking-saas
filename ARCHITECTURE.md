# Audit Log & Activity Tracking SaaS - MVP Architecture Spec

## Overview

MVP-focused audit logging platform with append-only logs, filtering, export, RBAC, and webhooks.

**Core Principles:**
- Append-only audit logs (immutable)
- Role-based access control (RBAC)
- Real-time webhook delivery
- Cookie-based session management
- CORS-enabled for localhost development

---

## Backend Architecture

### Module Structure

```
apps/api/src/
├── auth/          # Authentication & session management
├── orgs/          # Organization management
├── users/         # User management
├── api-keys/      # API key management
├── audit-events/  # Core audit logging (append-only)
└── webhooks/      # Webhook delivery system
```

### Shared Contracts

All DTOs/types live in `libs/shared/types` - **no NestJS decorators**, pure TypeScript for frontend/backend sharing.

**Key DTOs:**
- `auth.dto.ts` - Login, Register, Session, UserRole
- `org.dto.ts` - Org, OrgMember, InviteMember
- `user.dto.ts` - User, UpdateUser, ChangePassword
- `api-key.dto.ts` - ApiKey, CreateApiKey, UpdateApiKey
- `audit-event.dto.ts` - AuditEvent, Actor, Resource, Filters
- `webhook.dto.ts` - Webhook, WebhookDelivery
- `common.dto.ts` - PaginatedResponse, ErrorResponse

---

## API Routes

### Authentication (`/api/auth`)

| Method | Route | Request | Response | Auth |
|--------|-------|---------|----------|------|
| POST | `/api/auth/register` | `RegisterRequest` | `RegisterResponse` | None |
| POST | `/api/auth/login` | `LoginRequest` | `LoginResponse` | None |
| POST | `/api/auth/logout` | `{}` | `{ success: true }` | Session |
| GET | `/api/auth/me` | - | `UserDto` | Session |

**Request/Response Shapes:**

```typescript
// POST /api/auth/register
RegisterRequest {
  email: string;
  password: string;
  name: string;
}
→ RegisterResponse {
  user: UserDto;
  sessionToken: string; // Set as httpOnly cookie
}

// POST /api/auth/login
LoginRequest {
  email: string;
  password: string;
}
→ LoginResponse {
  user: UserDto;
  sessionToken: string; // Set as httpOnly cookie
}

// GET /api/auth/me
→ UserDto {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: 'admin' | 'member' | 'viewer';
  createdAt: string;
  updatedAt: string;
}
```

### Organizations (`/api/orgs`)

| Method | Route | Request | Response | Auth | RBAC |
|--------|-------|---------|----------|------|------|
| GET | `/api/orgs` | - | `OrgDto` | Session | Any |
| POST | `/api/orgs` | `CreateOrgRequest` | `OrgDto` | Session | Any |
| PATCH | `/api/orgs/:id` | `UpdateOrgRequest` | `OrgDto` | Session | Admin |
| GET | `/api/orgs/:id/members` | - | `OrgMemberDto[]` | Session | Any |
| POST | `/api/orgs/:id/members/invite` | `InviteMemberRequest` | `OrgMemberDto` | Session | Admin |
| PATCH | `/api/orgs/:id/members/:memberId` | `UpdateMemberRoleRequest` | `OrgMemberDto` | Session | Admin |
| DELETE | `/api/orgs/:id/members/:memberId` | - | `{ success: true }` | Session | Admin |

**Request/Response Shapes:**

```typescript
// POST /api/orgs
CreateOrgRequest {
  name: string;
  slug: string;
}
→ OrgDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

// POST /api/orgs/:id/members/invite
InviteMemberRequest {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}
→ OrgMemberDto {
  id: string;
  userId: string;
  orgId: string;
  role: UserRole;
  user: { id, email, name };
  createdAt: string;
}
```

### Users (`/api/users`)

| Method | Route | Request | Response | Auth | RBAC |
|--------|-------|---------|----------|------|------|
| GET | `/api/users/me` | - | `UserDto` | Session | Any |
| PATCH | `/api/users/me` | `UpdateUserRequest` | `UserDto` | Session | Any |
| POST | `/api/users/me/change-password` | `ChangePasswordRequest` | `{ success: true }` | Session | Any |

**Request/Response Shapes:**

```typescript
// PATCH /api/users/me
UpdateUserRequest {
  name?: string;
  email?: string;
}
→ UserDto

// POST /api/users/me/change-password
ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
→ { success: true }
```

### API Keys (`/api/api-keys`)

| Method | Route | Request | Response | Auth | RBAC |
|--------|-------|---------|----------|------|------|
| GET | `/api/api-keys` | - | `ApiKeyDto[]` | Session | Member+ |
| POST | `/api/api-keys` | `CreateApiKeyRequest` | `CreateApiKeyResponse` | Session | Member+ |
| PATCH | `/api/api-keys/:id` | `UpdateApiKeyRequest` | `ApiKeyDto` | Session | Member+ |
| DELETE | `/api/api-keys/:id` | - | `{ success: true }` | Session | Member+ |

**Request/Response Shapes:**

```typescript
// POST /api/api-keys
CreateApiKeyRequest {
  name: string;
  expiresInDays?: number;
}
→ CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // Full key - shown only once
  keyPrefix: string;
  expiresAt: string | null;
  createdAt: string;
}

// GET /api/api-keys
→ ApiKeyDto[] {
  id: string;
  name: string;
  keyPrefix: string; // Masked
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
}
```

### Audit Events (`/api/audit-events`) - **Core Module**

| Method | Route | Request | Response | Auth | RBAC |
|--------|-------|---------|----------|------|------|
| POST | `/api/audit-events` | `CreateAuditEventRequest` | `AuditEventDto` | API Key | Any |
| GET | `/api/audit-events` | `AuditEventFilter` (query) | `AuditEventListResponse` | Session | Any |
| GET | `/api/audit-events/:id` | - | `AuditEventDto` | Session | Any |
| POST | `/api/audit-events/export` | `AuditEventExportRequest` | File (JSON/CSV) | Session | Any |

**Request/Response Shapes:**

```typescript
// POST /api/audit-events (API Key auth)
CreateAuditEventRequest {
  eventType: string;
  actor: {
    type: 'user' | 'api-key' | 'system';
    id: string;
    name?: string;
    email?: string;
  };
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string; // Optional, defaults to now
}
→ AuditEventDto {
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

// GET /api/audit-events?eventType=user.login&startDate=2024-01-01&limit=50
AuditEventFilter {
  eventType?: string[];
  actorType?: ('user' | 'api-key' | 'system')[];
  actorId?: string;
  resourceType?: string[];
  resourceId?: string;
  action?: string[];
  startDate?: string;
  endDate?: string;
  search?: string; // Full-text search in metadata
  limit?: number; // Default: 50
  offset?: number; // Default: 0
  sortBy?: 'timestamp' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
→ AuditEventListResponse {
  events: AuditEventDto[];
  total: number;
  limit: number;
  offset: number;
}

// POST /api/audit-events/export
AuditEventExportRequest {
  format: 'json' | 'csv';
  filter: AuditEventFilter;
}
→ File download (application/json or text/csv)
```

**Key Constraints:**
- **Append-only**: Events are immutable once created
- **Org-scoped**: All queries filtered by user's orgId
- **No updates/deletes**: Only create and read operations

### Webhooks (`/api/webhooks`)

| Method | Route | Request | Response | Auth | RBAC |
|--------|-------|---------|----------|------|------|
| GET | `/api/webhooks` | - | `WebhookDto[]` | Session | Member+ |
| POST | `/api/webhooks` | `CreateWebhookRequest` | `WebhookDto` | Session | Member+ |
| PATCH | `/api/webhooks/:id` | `UpdateWebhookRequest` | `WebhookDto` | Session | Member+ |
| DELETE | `/api/webhooks/:id` | - | `{ success: true }` | Session | Member+ |
| GET | `/api/webhooks/:id/deliveries` | - | `WebhookDeliveryListResponse` | Session | Member+ |
| POST | `/api/webhooks/:id/test` | - | `{ success: true }` | Session | Member+ |

**Request/Response Shapes:**

```typescript
// POST /api/webhooks
CreateWebhookRequest {
  name: string;
  url: string;
  eventTypes: string[]; // e.g., ['user.login', 'user.logout']
  secret?: string; // Optional custom secret for HMAC
}
→ WebhookDto {
  id: string;
  orgId: string;
  name: string;
  url: string;
  eventTypes: string[];
  secret: string; // Masked (only last 4 chars shown)
  active: boolean;
  lastTriggeredAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

// GET /api/webhooks/:id/deliveries
→ WebhookDeliveryListResponse {
  deliveries: WebhookDeliveryDto[];
  total: number;
  limit: number;
  offset: number;
}
```

**Webhook Delivery:**
- Triggers on matching `eventType` in audit events
- POST to webhook URL with HMAC signature
- Retry logic: 3 attempts with exponential backoff
- Delivery status tracked per webhook

---

## Web Routes & Components

### Route Structure

```
apps/web/src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx          # LoginForm component
│   └── register/
│       └── page.tsx           # RegisterForm component
├── (dashboard)/
│   ├── layout.tsx             # DashboardLayout (sidebar, header)
│   ├── page.tsx               # DashboardHome (overview stats)
│   ├── audit-logs/
│   │   ├── page.tsx           # AuditLogList (filterable table)
│   │   └── [id]/
│   │       └── page.tsx       # AuditLogDetail (single event view)
│   ├── webhooks/
│   │   ├── page.tsx           # WebhookList (manage webhooks)
│   │   └── [id]/
│   │       ├── page.tsx       # WebhookDetail (edit + deliveries)
│   │       └── deliveries/
│   │           └── page.tsx   # WebhookDeliveryList
│   ├── api-keys/
│   │   ├── page.tsx           # ApiKeyList (manage API keys)
│   │   └── create/
│   │       └── page.tsx       # CreateApiKeyForm
│   ├── settings/
│   │   ├── page.tsx           # SettingsHome
│   │   ├── org/
│   │   │   └── page.tsx       # OrgSettings (name, slug, members)
│   │   └── profile/
│   │       └── page.tsx       # UserProfile (name, email, password)
│   └── members/
│       └── page.tsx           # MemberList (invite, manage roles)
└── api/
    └── auth/
        └── route.ts           # Next.js API route for auth proxy
```

### Component List

**Layout Components:**
- `DashboardLayout` - Sidebar navigation, header with user menu
- `AuthLayout` - Centered auth forms

**Auth Components:**
- `LoginForm` - Email/password login
- `RegisterForm` - Registration with org creation
- `ProtectedRoute` - HOC/wrapper for auth checks

**Audit Log Components:**
- `AuditLogList` - Filterable table with pagination
  - `AuditLogFilters` - Event type, date range, actor, resource
  - `AuditLogTable` - Sortable columns, row expansion
  - `AuditLogExportButton` - Export to JSON/CSV
- `AuditLogDetail` - Full event view with metadata JSON viewer
- `AuditLogStats` - Overview cards (total events, by type, recent activity)

**Webhook Components:**
- `WebhookList` - Table of webhooks with status indicators
- `WebhookForm` - Create/edit webhook (name, URL, event types)
- `WebhookDetail` - Edit webhook + delivery history
- `WebhookDeliveryList` - Delivery attempts with status codes
- `WebhookTestButton` - Trigger test delivery

**API Key Components:**
- `ApiKeyList` - Table with masked keys, last used, expiration
- `CreateApiKeyForm` - Name, expiration, generate key
- `ApiKeyDisplay` - Show full key once (copy button)
- `ApiKeyDeleteButton` - Confirm before delete

**Settings Components:**
- `OrgSettings` - Org name, slug, member management
- `UserProfile` - Name, email, change password
- `MemberList` - Invite members, role management
- `RoleBadge` - Visual role indicator (admin/member/viewer)

**Shared Components:**
- `DataTable` - Reusable table with sorting, pagination
- `FilterBar` - Reusable filter UI
- `ExportButton` - Generic export trigger
- `LoadingSpinner` - Loading states
- `ErrorBoundary` - Error handling
- `Toast` - Success/error notifications

---

## Cookie Session & CORS Plan

### Session Management

**Cookie Configuration:**
```typescript
// Backend (NestJS)
{
  name: 'session',
  httpOnly: true,        // Prevent XSS
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'lax',       // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  domain: undefined,     // Current domain only
  path: '/',
}
```

**Session Storage:**
- Store session tokens in database (sessions table)
- Session includes: `userId`, `orgId`, `role`, `expiresAt`
- Validate on each request via middleware/guard

### CORS Configuration

**Development (localhost):**
```typescript
// Backend CORS config
{
  origin: [
    'http://localhost:3000',  // Next.js default
    'http://localhost:3001',  // Alternative port
  ],
  credentials: true,          // Allow cookies
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'], // For pagination
}
```

**Production:**
```typescript
{
  origin: process.env.FRONTEND_URL, // Single origin
  credentials: true,
  // ... same as dev
}
```

### API Key Authentication

**Header Format:**
```
Authorization: Bearer <api-key>
```

**Validation:**
- Lookup API key in database
- Verify `orgId` matches request context
- Check expiration
- Update `lastUsedAt` timestamp

### Request Flow

1. **Browser Request (Session):**
   - Cookie sent automatically
   - Backend validates session token
   - Extract `userId`, `orgId`, `role` from session
   - Apply RBAC checks

2. **API Key Request:**
   - Extract `Authorization` header
   - Validate API key
   - Extract `orgId` from API key
   - No RBAC (API keys have full org access)

3. **CORS Preflight:**
   - OPTIONS request handled automatically
   - Returns allowed origins, methods, headers

---

## RBAC Matrix

| Resource | Viewer | Member | Admin |
|----------|--------|--------|-------|
| View audit logs | ✅ | ✅ | ✅ |
| Export audit logs | ✅ | ✅ | ✅ |
| Create audit events (API) | ✅ | ✅ | ✅ |
| View webhooks | ❌ | ✅ | ✅ |
| Create/edit webhooks | ❌ | ✅ | ✅ |
| View API keys | ❌ | ✅ | ✅ |
| Create/delete API keys | ❌ | ✅ | ✅ |
| View org settings | ❌ | ❌ | ✅ |
| Edit org settings | ❌ | ❌ | ✅ |
| Invite members | ❌ | ❌ | ✅ |
| Manage member roles | ❌ | ❌ | ✅ |

---

## Database Schema (MVP)

**Core Tables:**
- `users` - User accounts
- `orgs` - Organizations
- `org_members` - User-org relationships with roles
- `sessions` - Active user sessions
- `api_keys` - API key credentials
- `audit_events` - Append-only audit log (indexed by orgId, timestamp, eventType)
- `webhooks` - Webhook configurations
- `webhook_deliveries` - Delivery attempt history

**Key Indexes:**
- `audit_events(orgId, timestamp DESC)` - Fast filtering
- `audit_events(orgId, eventType, timestamp DESC)` - Event type queries
- `api_keys(keyHash)` - Fast key lookup
- `sessions(tokenHash, expiresAt)` - Session validation

---

## MVP Scope Boundaries

**In Scope:**
- ✅ Append-only audit event creation
- ✅ Filtering by type, actor, resource, date range
- ✅ Export to JSON/CSV
- ✅ RBAC (viewer/member/admin)
- ✅ Webhook delivery with retries
- ✅ API key authentication
- ✅ Cookie-based sessions
- ✅ CORS for localhost

**Out of Scope (Future):**
- ❌ Real-time event streaming (SSE/WebSocket)
- ❌ Advanced analytics/dashboards
- ❌ Custom event schemas/validation
- ❌ Event retention policies
- ❌ Multi-tenant isolation (beyond orgId)
- ❌ Audit log archiving

---

## Next Steps

1. Generate NestJS modules for each domain
2. Set up TypeORM entities matching DTOs
3. Implement authentication guards and RBAC decorators
4. Create Next.js pages and components
5. Set up database migrations
6. Configure CORS and session middleware
7. Implement webhook delivery queue/worker

