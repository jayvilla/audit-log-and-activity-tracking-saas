# Audit Log & Activity Tracking SaaS - Architecture

## 1. Final Folder Structure & Nx Project Names

```
cursor-rules-monorepo/
├── apps/
│   ├── api/                    # NestJS API (Nx project: "api")
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   │   ├── typeorm.config.ts
│   │   │   │   └── session.config.ts
│   │   │   ├── common/
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── auth.guard.ts
│   │   │   │   │   └── org.guard.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   └── transform.interceptor.ts
│   │   │   │   └── decorators/
│   │   │   │       ├── current-user.decorator.ts
│   │   │   │       └── current-org.decorator.ts
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       ├── users/
│   │   │       ├── orgs/
│   │   │       ├── api-keys/
│   │   │       ├── audit-events/
│   │   │       └── webhooks/
│   │   ├── project.json
│   │   └── tsconfig.json
│   │
│   └── web/                    # Next.js App Router (Nx project: "web")
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── (auth)/
│       │   │   │   ├── login/
│       │   │   │   └── signup/
│       │   │   ├── (dashboard)/
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── dashboard/
│       │   │   │   ├── events/
│       │   │   │   ├── api-keys/
│       │   │   │   ├── webhooks/
│       │   │   │   └── settings/
│       │   │   └── api/
│       │   │       └── auth/
│       │   │           └── callback/
│       │   ├── components/
│       │   │   ├── ui/         # shadcn/ui components
│       │   │   ├── layout/
│       │   │   │   ├── Header.tsx
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   └── OrgSwitcher.tsx
│       │   │   ├── events/
│       │   │   │   ├── EventList.tsx
│       │   │   │   ├── EventCard.tsx
│       │   │   │   └── EventFilters.tsx
│       │   │   ├── api-keys/
│       │   │   │   ├── ApiKeyList.tsx
│       │   │   │   └── ApiKeyForm.tsx
│       │   │   └── webhooks/
│       │   │       ├── WebhookList.tsx
│       │   │       └── WebhookForm.tsx
│       │   ├── lib/
│       │   │   ├── api-client.ts
│       │   │   └── auth.ts
│       │   └── styles/
│       │       └── globals.css
│       ├── project.json
│       ├── next.config.js
│       ├── tailwind.config.js
│       └── tsconfig.json
│
├── libs/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── dto/            # Shared DTOs (Nx project: "shared-dto")
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── orgs/
│   │   │   │   ├── api-keys/
│   │   │   │   ├── audit-events/
│   │   │   │   └── webhooks/
│   │   │   └── types/          # Shared TypeScript types
│   │   │       └── index.ts
│   │   ├── project.json
│   │   └── tsconfig.json
│   │
│   └── data-access-db/         # TypeORM Entities (Nx project: "data-access-db")
│       ├── src/
│       │   ├── index.ts
│       │   ├── entities/
│       │   │   ├── base.entity.ts
│       │   │   ├── user.entity.ts
│       │   │   ├── org.entity.ts
│       │   │   ├── org-member.entity.ts
│       │   │   ├── api-key.entity.ts
│       │   │   ├── audit-event.entity.ts
│       │   │   └── webhook.entity.ts
│       │   └── migrations/
│       │       └── data-source.ts
│       ├── project.json
│       └── tsconfig.json
│
├── docker-compose.yml
├── .env.example
├── nx.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

### Nx Project Names
- `api` - NestJS backend application
- `web` - Next.js frontend application
- `shared-dto` - Shared DTOs library
- `data-access-db` - TypeORM entities and migrations

---

## 2. NestJS Module Boundaries

### Module Structure

#### **Auth Module** (`apps/api/src/modules/auth/`)
- **Purpose**: Authentication, session management, password reset
- **Components**:
  - `AuthController` - Login, logout, signup, password reset endpoints
  - `AuthService` - Password hashing, session creation, JWT-like token generation
  - `SessionStrategy` - Custom passport strategy for cookie-based sessions
- **Dependencies**: `UsersModule`, `OrgsModule`
- **Exports**: `AuthGuard`, `SessionStrategy`

#### **Users Module** (`apps/api/src/modules/users/`)
- **Purpose**: User CRUD, profile management
- **Components**:
  - `UsersController` - User profile endpoints
  - `UsersService` - User business logic
- **Dependencies**: `data-access-db` (UserEntity)
- **Exports**: `UsersService` (for Auth module)

#### **Orgs Module** (`apps/api/src/modules/orgs/`)
- **Purpose**: Organization management, member management
- **Components**:
  - `OrgsController` - Org CRUD, member management
  - `OrgsService` - Org business logic, member operations
- **Dependencies**: `data-access-db` (OrgEntity, OrgMemberEntity), `UsersModule`
- **Exports**: `OrgsService`, `OrgGuard`
- **Guards**: `@CurrentOrg()` decorator for org-scoped operations

#### **ApiKeys Module** (`apps/api/src/modules/api-keys/`)
- **Purpose**: API key generation, rotation, revocation
- **Components**:
  - `ApiKeysController` - CRUD for API keys
  - `ApiKeysService` - Key generation (prefix + secret), hashing, validation
- **Dependencies**: `data-access-db` (ApiKeyEntity), `OrgsModule`
- **Exports**: `ApiKeyGuard` (for API key authentication)

#### **AuditEvents Module** (`apps/api/src/modules/audit-events/`)
- **Purpose**: Event ingestion, querying, filtering
- **Components**:
  - `AuditEventsController` - Event creation, query endpoints
  - `AuditEventsService` - Event validation, storage, query logic
- **Dependencies**: `data-access-db` (AuditEventEntity), `OrgsModule`, `ApiKeysModule`
- **Exports**: `AuditEventsService`

#### **Webhooks Module** (`apps/api/src/modules/webhooks/`)
- **Purpose**: Webhook configuration, delivery, retry logic
- **Components**:
  - `WebhooksController` - Webhook CRUD, test endpoints
  - `WebhooksService` - Webhook delivery, retry queue, signature generation
  - `WebhookDeliveryService` - HTTP delivery with retry logic
- **Dependencies**: `data-access-db` (WebhookEntity), `OrgsModule`, `AuditEventsModule`
- **Exports**: `WebhooksService`

---

## 3. API Contract

### Base URL
- Development: `http://localhost:3001`
- Production: `https://api.yourdomain.com`

### Authentication
- **Cookie-based sessions**: `connect.sid` cookie (httpOnly, secure in production)
- **API Key authentication**: `X-API-Key` header (for programmatic access)

### Routes

#### **Auth Routes** (`/api/auth`)
```
POST   /api/auth/signup          # Create user + org
POST   /api/auth/login            # Login (email + password)
POST   /api/auth/logout           # Destroy session
GET    /api/auth/me               # Get current user
POST   /api/auth/password-reset   # Request password reset
POST   /api/auth/password-reset/confirm  # Confirm password reset
```

#### **Users Routes** (`/api/users`)
```
GET    /api/users/me              # Get current user profile
PATCH  /api/users/me              # Update current user profile
DELETE /api/users/me              # Delete current user account
```

#### **Orgs Routes** (`/api/orgs`)
```
GET    /api/orgs                  # List user's orgs
POST   /api/orgs                  # Create org
GET    /api/orgs/:id              # Get org details
PATCH  /api/orgs/:id              # Update org
DELETE /api/orgs/:id              # Delete org
GET    /api/orgs/:id/members      # List org members
POST   /api/orgs/:id/members      # Add member
DELETE /api/orgs/:id/members/:userId  # Remove member
PATCH  /api/orgs/:id/members/:userId  # Update member role
```

#### **API Keys Routes** (`/api/api-keys`)
```
GET    /api/api-keys              # List org's API keys
POST   /api/api-keys              # Create API key
DELETE /api/api-keys/:id          # Revoke API key
PATCH  /api/api-keys/:id          # Update API key (name, expiry)
```

#### **Audit Events Routes** (`/api/audit-events`)
```
POST   /api/audit-events          # Ingest event (requires API key or session)
GET    /api/audit-events          # Query events (filtering, pagination)
GET    /api/audit-events/:id      # Get single event
GET    /api/audit-events/stats    # Get event statistics
```

#### **Webhooks Routes** (`/api/webhooks`)
```
GET    /api/webhooks              # List org's webhooks
POST   /api/webhooks              # Create webhook
GET    /api/webhooks/:id          # Get webhook details
PATCH  /api/webhooks/:id          # Update webhook
DELETE /api/webhooks/:id          # Delete webhook
POST   /api/webhooks/:id/test     # Test webhook delivery
GET    /api/webhooks/:id/deliveries  # Get delivery history
```

### Request/Response Shapes

#### Auth DTOs
```typescript
// POST /api/auth/signup
SignupDto {
  email: string;
  password: string;
  name: string;
  orgName: string;
}

SignupResponse {
  user: UserDto;
  org: OrgDto;
  sessionId: string;
}

// POST /api/auth/login
LoginDto {
  email: string;
  password: string;
}

LoginResponse {
  user: UserDto;
  orgs: OrgDto[];
}

// GET /api/auth/me
UserDto {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Org DTOs
```typescript
// POST /api/orgs
CreateOrgDto {
  name: string;
  slug?: string;  // Auto-generated if not provided
}

// PATCH /api/orgs/:id
UpdateOrgDto {
  name?: string;
}

OrgDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

// POST /api/orgs/:id/members
AddMemberDto {
  email: string;
  role: 'owner' | 'admin' | 'member';
}

OrgMemberDto {
  id: string;
  userId: string;
  orgId: string;
  role: 'owner' | 'admin' | 'member';
  user: UserDto;
  createdAt: string;
}
```

#### API Key DTOs
```typescript
// POST /api/api-keys
CreateApiKeyDto {
  name: string;
  expiresAt?: string;  // ISO date string, optional
  permissions?: string[];  // Future: scoped permissions
}

ApiKeyDto {
  id: string;
  name: string;
  keyPrefix: string;  // e.g., "ak_live_abc123..."
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  // Note: Full key only returned on creation
}

CreateApiKeyResponse {
  id: string;
  name: string;
  key: string;  // Full key: "ak_live_abc123...secret"
  keyPrefix: string;
  expiresAt?: string;
  createdAt: string;
  warning: string;  // "Store this key securely..."
}
```

#### Audit Event DTOs
```typescript
// POST /api/audit-events
CreateAuditEventDto {
  action: string;  // e.g., "user.created", "payment.processed"
  actor?: {
    type: 'user' | 'api_key' | 'system';
    id?: string;
    name?: string;
  };
  target?: {
    type: string;
    id?: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;  // JSON object
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;  // ISO date, defaults to now
}

AuditEventDto {
  id: string;
  orgId: string;
  action: string;
  actor: {
    type: 'user' | 'api_key' | 'system';
    id?: string;
    name?: string;
  };
  target?: {
    type: string;
    id?: string;
    name?: string;
  };
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  createdAt: string;
}

// GET /api/audit-events?action=user.created&from=2024-01-01&to=2024-12-31&limit=50&offset=0
QueryAuditEventsDto {
  action?: string;
  actorType?: 'user' | 'api_key' | 'system';
  actorId?: string;
  targetType?: string;
  targetId?: string;
  from?: string;  // ISO date
  to?: string;    // ISO date
  limit?: number;  // Default: 50, Max: 500
  offset?: number; // Default: 0
}

QueryAuditEventsResponse {
  events: AuditEventDto[];
  total: number;
  limit: number;
  offset: number;
}

// GET /api/audit-events/stats?from=2024-01-01&to=2024-12-31
AuditEventStatsDto {
  from?: string;
  to?: string;
  groupBy?: 'day' | 'hour' | 'action';
}

AuditEventStatsResponse {
  total: number;
  byAction: Record<string, number>;
  byDay: Array<{ date: string; count: number }>;
}
```

#### Webhook DTOs
```typescript
// POST /api/webhooks
CreateWebhookDto {
  name: string;
  url: string;
  events: string[];  // e.g., ["audit_event.created", "audit_event.updated"]
  secret?: string;   // Auto-generated if not provided
  active?: boolean;   // Default: true
}

WebhookDto {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;  // Only returned on creation or explicit request
  active: boolean;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: number;
  createdAt: string;
  updatedAt: string;
}

// GET /api/webhooks/:id/deliveries
WebhookDeliveryDto {
  id: string;
  webhookId: string;
  eventId: string;
  status: number;
  statusText: string;
  attempts: number;
  deliveredAt?: string;
  error?: string;
  createdAt: string;
}
```

### Error Response Shape
```typescript
ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}
```

---

## 4. Web Routes & Key Components

### Next.js App Router Structure

#### **Public Routes**
```
/                    # Landing page (marketing)
/login               # Login page
/signup              # Signup page
```

#### **Protected Routes** (Require authentication)
```
/dashboard           # Dashboard overview (stats, recent events)
/events              # Event list with filters
/events/:id          # Event detail view
/api-keys            # API key management
/webhooks            # Webhook management
/settings            # User & org settings
  /settings/profile  # User profile
  /settings/org      # Org settings
  /settings/members  # Org members
```

### Key Components

#### **Layout Components**
- `Header` - Top navigation with user menu, org switcher
- `Sidebar` - Navigation sidebar (dashboard, events, api-keys, webhooks, settings)
- `OrgSwitcher` - Dropdown to switch between orgs (if user is in multiple)

#### **Event Components**
- `EventList` - Server component for event listing with pagination
- `EventCard` - Client component for individual event display
- `EventFilters` - Client component for filtering (action, date range, actor, target)
- `EventDetail` - Server component for single event view
- `EventStats` - Charts/visualizations for event statistics

#### **API Key Components**
- `ApiKeyList` - Server component listing all API keys
- `ApiKeyForm` - Client component for creating/editing API keys
- `ApiKeyCard` - Display API key with copy-to-clipboard, last used info
- `ApiKeyDeleteDialog` - Confirmation dialog for deletion

#### **Webhook Components**
- `WebhookList` - Server component listing webhooks
- `WebhookForm` - Client component for creating/editing webhooks
- `WebhookCard` - Display webhook with status, last delivery info
- `WebhookTestButton` - Client component to trigger test delivery
- `WebhookDeliveryHistory` - Table of delivery attempts

#### **Auth Components**
- `LoginForm` - Client component for login
- `SignupForm` - Client component for signup
- `PasswordResetForm` - Client component for password reset

#### **Settings Components**
- `ProfileSettings` - User profile form
- `OrgSettings` - Org details form
- `MemberList` - Org members table with role management
- `InviteMemberForm` - Form to invite new members

---

## 5. Migration Strategy & Seeding Strategy

### Migration Strategy

#### **Initial Migration**
1. Create base entities migration:
   - `BaseEntity` (id, createdAt, updatedAt)
   - `UserEntity` (email, passwordHash, name)
   - `OrgEntity` (name, slug)
   - `OrgMemberEntity` (userId, orgId, role)
   - `ApiKeyEntity` (orgId, name, keyHash, keyPrefix, expiresAt)
   - `AuditEventEntity` (orgId, action, actor, target, metadata, ipAddress, userAgent, timestamp)
   - `WebhookEntity` (orgId, name, url, events, secret, active)
   - `WebhookDeliveryEntity` (webhookId, eventId, status, attempts, error)

2. Create indexes:
   - `UserEntity.email` (unique)
   - `OrgEntity.slug` (unique)
   - `OrgMemberEntity.userId + orgId` (unique composite)
   - `ApiKeyEntity.keyPrefix` (index)
   - `AuditEventEntity.orgId + timestamp` (composite index)
   - `AuditEventEntity.action` (index)
   - `AuditEventEntity.actorId` (index)
   - `WebhookEntity.orgId` (index)

#### **Migration Commands**
```bash
# Generate migration
pnpm nx run api:typeorm-migration-generate --name=InitialSchema

# Run migrations
pnpm nx run api:typeorm-migration-run

# Revert migration
pnpm nx run api:typeorm-migration-revert
```

#### **Migration File Location**
- `libs/data-access-db/src/migrations/`
- Naming: `YYYYMMDDHHMMSS-<name>.ts`

### Seeding Strategy

#### **Seed Script** (`apps/api/src/scripts/seed.ts`)
```typescript
// Seed data:
// 1. Admin user + org
// 2. Test user + org
// 3. Sample API keys
// 4. Sample audit events
// 5. Sample webhooks
```

#### **Seed Commands**
```bash
# Run seed script
pnpm nx run api:seed

# Or via ts-node
pnpm tsx apps/api/src/scripts/seed.ts
```

#### **Seed Data**
- **Admin User**: `admin@example.com` / `admin123`
- **Test User**: `test@example.com` / `test123`
- **Test Org**: "Acme Corp" (slug: `acme-corp`)
- **Sample Events**: 100-500 events with various actions
- **Sample API Keys**: 2-3 API keys per org
- **Sample Webhooks**: 1-2 webhooks per org

---

## 6. Dev Environment Plan

### Ports
- **Next.js Web**: `3000` (http://localhost:3000)
- **NestJS API**: `3001` (http://localhost:3001)
- **PostgreSQL**: `5432` (internal Docker network)

### Environment Variables

#### **`.env` (root level)**
```env
# Database
POSTGRES_USER=auditlog
POSTGRES_PASSWORD=auditlog_dev_password
POSTGRES_DB=auditlog_dev
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Session
SESSION_SECRET=your-super-secret-session-key-change-in-production
SESSION_NAME=connect.sid

# API
API_PORT=3001
API_URL=http://localhost:3001
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:3000

# Optional: Email (for password reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

#### **`.env.example`**
Template file with all required variables (no secrets)

### CORS Configuration

#### **NestJS CORS** (`apps/api/src/main.ts`)
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
});
```

### Cookie Configuration

#### **Session Cookie** (`apps/api/src/config/session.config.ts`)
```typescript
{
  name: process.env.SESSION_NAME || 'connect.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    sameSite: 'lax',  // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  },
}
```

### Docker Compose Setup

#### **`docker-compose.yml`**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: auditlog-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-auditlog}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-auditlog_dev_password}
      POSTGRES_DB: ${POSTGRES_DB:-auditlog_dev}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-auditlog}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Development Workflow

#### **Start Services**
```bash
# Start PostgreSQL
docker-compose up -d

# Run migrations
pnpm nx run api:typeorm-migration-run

# Seed database (optional)
pnpm nx run api:seed

# Start API (dev mode)
pnpm nx serve api

# Start Web (dev mode, in another terminal)
pnpm nx serve web
```

#### **TypeScript Path Aliases** (`tsconfig.base.json`)
```json
{
  "compilerOptions": {
    "paths": {
      "@org/shared-dto": ["libs/shared/src/dto"],
      "@org/shared-types": ["libs/shared/src/types"],
      "@org/data-access-db": ["libs/data-access-db/src"]
    }
  }
}
```

### Health Checks

#### **API Health Endpoint**
```
GET /api/health
Response: { status: 'ok', database: 'connected', timestamp: '...' }
```

---

## 7. Production Considerations (MVP+)

### Security
- Rate limiting (per IP, per API key)
- Input validation on all DTOs
- SQL injection prevention (TypeORM parameterized queries)
- XSS prevention (sanitize user inputs)
- CSRF protection (sameSite cookies)
- API key rotation policy
- Webhook signature verification (HMAC-SHA256)

### Performance
- Database indexes on frequently queried fields
- Pagination on all list endpoints (max 500 per page)
- Event archiving strategy (older than 90 days → cold storage)
- Webhook delivery queue (background jobs)
- Caching for org/user lookups (Redis, future)

### Monitoring
- Structured logging (Winston/Pino)
- Error tracking (Sentry, future)
- Metrics (Prometheus, future)
- Webhook delivery monitoring (retry logic, dead letter queue)

### Scalability
- Database connection pooling
- Read replicas for event queries (future)
- Horizontal scaling for API (stateless sessions)
- CDN for static assets (Next.js)

---

## Summary

This architecture provides:
- ✅ Clear separation of concerns (modules, libraries)
- ✅ Type-safe API contracts (shared DTOs)
- ✅ Scalable database schema (indexed, normalized)
- ✅ Secure authentication (cookie sessions + API keys)
- ✅ Production-ready dev environment (Docker, env vars, CORS)
- ✅ MVP-focused but extensible design

Next steps:
1. Initialize Nx workspace with these projects
2. Set up TypeORM entities in `data-access-db`
3. Implement NestJS modules following the boundaries
4. Build Next.js pages and components
5. Create initial migration and seed script
6. Configure Docker Compose and environment variables

