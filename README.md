# Audit Log & Activity Tracking SaaS

Developer-focused audit logging and activity tracking platform with immutable append-only logs, advanced filtering, API key authentication, webhook delivery, analytics dashboard, and AI-powered investigation tools. Built for organizations requiring compliance-ready audit trails with real-time notifications and intelligent event correlation.

---

## Key Capabilities

- **Audit Logs**: Immutable append-only event storage with cursor-based pagination, multi-dimensional filtering (date, action, actor, resource, status, IP), and JSON/CSV export
- **API Keys**: Full CRUD operations for programmatic access with rate limiting and usage tracking
- **Webhooks**: CRUD management, delivery tracking with retry logic, replay functionality (admin-only), and event type filtering
- **Analytics**: Database-backed overview dashboard with real-time metrics (events today, active users, success rate), activity charts, top actions, and recent activity
- **AI Investigation**: Read-only AI summary and investigation features with correlation analysis, timeline generation, grounded responses with provenance, and safe failure modes

---

## Monorepo Structure

```
apps/
├── api/          # NestJS REST API backend
├── web/          # Next.js dashboard (authenticated app)
├── marketing/    # Next.js marketing site (public, SEO)
└── *-e2e/        # E2E test projects

libs/shared/
├── types/         # Shared DTOs and TypeScript types (no framework deps)
├── ui/            # Reusable React components (Radix UI wrappers)
├── design-system/ # Tailwind tokens, CSS variables, theme config
└── motion/        # Animation utilities (Framer Motion helpers)
```

**Architecture Boundaries:**
- Apps → libs only (no cross-app imports)
- `apps/api` cannot import `apps/web` or `apps/marketing`
- `apps/web` cannot import `apps/api` or `apps/marketing`
- `apps/marketing` cannot import `apps/api` or `apps/web`
- Shared contracts via `libs/shared/types`

---

## Tech Stack

**Languages & Runtimes:**
- TypeScript 5.9
- Node.js 22+

**Backend:**
- NestJS 11 (REST API)
- TypeORM 0.3 (PostgreSQL ORM)
- Express 5 (HTTP server)
- Express Session (cookie-based sessions, PostgreSQL store)
- Scalar API Reference (OpenAPI documentation via `@nestjs/swagger`)

**Frontend:**
- Next.js 16 (App Router)
- React 19
- Tailwind CSS 3.4
- Axios (HTTP client)

**Database:**
- PostgreSQL 16

**Infrastructure & Tools:**
- Nx 22.3 (monorepo management)
- pnpm 8+ (package manager)
- Docker & Docker Compose (containerization)
- Jest 30 (testing)
- Playwright (E2E testing)
- Vitest (UI component testing)

**AI/LLM:**
- Vendor-portable LLM layer (`LLMService` + provider adapters)
- Ollama (local dev via Docker) with llama3 model
- Feature-gated (disabled by default, `LLM_ENABLED=true` to enable)

**Observability:**
- Sentry (error tracking with data scrubbing)

---

## Quickstart (Local Dev)

### Prerequisites

- Node.js 22 or later
- pnpm 8 or later
- Docker Desktop (or Docker Engine + Docker Compose)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd audit-log-and-activity-tracking-saas
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure required variables (see [Environment Setup](#environment-setup) below).

4. **Start PostgreSQL (Docker):**
   ```bash
   pnpm docker:up
   ```
   
   This starts only the PostgreSQL container. Wait for it to be healthy before proceeding.

5. **Run database migrations:**
   ```bash
   pnpm db:migrate
   ```

6. **Seed the database (optional):**
   ```bash
   pnpm db:seed
   ```
   
   **Note:** The seed script creates:
   - Organization: "Default Organization"
   - Admin user: `admin@example.com` / `admin123`
   - Sample audit events
   - **Webhooks are seeded ONLY for `admin@example.com`** (dev/test only, skipped in production)

7. **Start all applications:**
   ```bash
   pnpm dev
   ```
   
   This runs:
   - **API** on `http://localhost:8000` (NestJS with hot reload)
   - **Web** on `http://localhost:3000` (Next.js with hot reload)
   - **Marketing** on `http://localhost:3001` (Next.js with hot reload)

**Access Points:**
- Web Application: http://localhost:3000
- Marketing Site: http://localhost:3001
- API Base URL: http://localhost:8000/api
- API Documentation (Scalar): http://localhost:8000/api/docs
- OpenAPI JSON: http://localhost:8000/api/openapi.json

### Running Services Individually

**Start API only:**
```bash
pnpm serve:api
# or
pnpm nx serve api
```

**Start Web only:**
```bash
pnpm dev:web
# or
pnpm nx dev web
```

**Start Marketing only:**
```bash
pnpm dev:marketing
# or
pnpm nx dev marketing
```

### Docker Compose (Full Stack)

**Start all services in Docker:**
```bash
pnpm docker:all
# or
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- API on port 8000
- Web on port 3000
- Ollama on port 11434 (LLM service, dev only)

**Note:** When running in Docker, ensure `DB_HOST=postgres` in your `.env` file.

**Docker Commands:**
- Start PostgreSQL only: `pnpm docker:up`
- Stop PostgreSQL: `pnpm docker:down`
- View logs: `pnpm docker:logs`
- Reset database (⚠️ deletes all data): `pnpm docker:reset`
- Start all services: `pnpm docker:all` or `docker-compose up -d`
- Stop all services: `pnpm docker:all:down` or `docker-compose down`

### Ollama (LLM Service - DEV ONLY)

**⚠️ WARNING:** Ollama is for local development only. AI features are disabled by default (`LLM_ENABLED=false`) and must not be enabled in production without explicit configuration.

**Start Ollama service:**
```bash
docker compose up -d ollama
```

**Pull llama3 model:**
```bash
docker compose exec ollama ollama pull llama3
```

**Verify Ollama is running:**
```bash
curl http://localhost:11434/api/tags
```

**Environment Configuration:**

Add to your `.env` file:
```env
# Enable LLM features (dev only)
LLM_ENABLED=true

# For container-to-container communication (when API runs in Docker)
LLM_OLLAMA_BASE_URL=http://ollama:11434
# For local development (when API runs outside Docker)
# LLM_OLLAMA_BASE_URL=http://localhost:11434

LLM_DEFAULT_MODEL=llama3
```

**Notes:**
- Ollama service persists model data in a Docker volume (`ollama_data`)
- Model downloads can be large (several GB for llama3)
- AI features are feature-gated and disabled by default
- See `.cursor/rules/llm-ai.mdc` for LLM architecture and safety rules

---

## Environment Setup

### Root `.env` File

Create a `.env` file in the repository root by copying `.env.example`:

```bash
cp .env.example .env
```

**Purpose:** Configures both API and Web applications, plus Docker Compose services.

**Required Variables:**

```env
# PostgreSQL Docker Container Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
DB_PORT=5432

# Application Database Configuration
# Use 'postgres' when API runs in Docker, 'localhost' when running locally
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=postgres
DB_SSL=false

# Application Environment
NODE_ENV=development

# API Port (NestJS)
PORT=8000

# Web Port (Next.js)
WEB_PORT=3000

# Session Configuration (REQUIRED - generate a random secret for production)
SESSION_SECRET=change-this-to-a-random-secret-in-production

# CORS Configuration (must match web app URL for cookie sessions)
WEB_ORIGIN=http://localhost:3000

# Next.js Public API URL (used by web app to call API)
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Marketing App - Site URL for SEO metadata, canonical URLs, sitemap, and robots.txt
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Cross-App Linking
# Web app uses this to link back to marketing site (e.g., "Back to home" on login page)
NEXT_PUBLIC_MARKETING_URL=http://localhost:3001

# Marketing app uses this to link to web app (e.g., "Sign in / Sign up" buttons)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# LLM Configuration (DEV ONLY - optional, disabled by default)
LLM_ENABLED=false
LLM_OLLAMA_BASE_URL=http://localhost:11434
LLM_DEFAULT_MODEL=llama3

# API Documentation (optional, enabled by default)
DOCS_ENABLED=true
```

**Security Notes:**
- `SESSION_SECRET` must be a strong random string in production (use `openssl rand -base64 32`)
- Never commit `.env` files to version control
- `DB_PASSWORD` should be changed from defaults in production

### API-Specific Environment Variables

The API validates environment variables on startup using `apps/api/src/config/env.schema.ts`. See that file for the complete schema including optional rate limiting and Sentry configuration.

---

## Database & Migrations

This project uses TypeORM migrations to manage database schema changes. **Never enable `synchronize: true` in production** - migrations are the source of truth for all schema changes.

### Migration Commands

All migration commands are available via root-level pnpm scripts for convenience. You can also use Nx commands directly if preferred.

**Create a new empty migration:**
```bash
pnpm db:migrate:create --name=AddUsersTable
# or using Nx directly:
pnpm nx migration:create api --name=AddUsersTable
```

**Generate a migration from entity changes:**
```bash
pnpm db:migrate:generate --name=AddUsersTable
# or using Nx directly:
pnpm nx migration:generate api --name=AddUsersTable
```

**Run pending migrations:**
```bash
pnpm db:migrate
# or using Nx directly:
pnpm nx migration:run api
```

**Revert the last migration:**
```bash
pnpm db:migrate:revert
# or using Nx directly:
pnpm nx migration:revert api
```

### Migration Workflow

1. **After modifying entities**, generate a migration:
   ```bash
   pnpm db:migrate:generate --name=DescribeYourChange
   ```

2. **Review the generated migration** in `apps/api/src/migrations/` to ensure it's correct.

3. **Run migrations** on your development database:
   ```bash
   pnpm db:migrate
   ```

4. **Test your changes** before committing the migration file.

5. **If something goes wrong**, you can revert the last migration:
   ```bash
   pnpm db:migrate:revert
   ```

6. **Commit the migration file** - migrations are tracked in version control and should be reviewed like code.

### Important Notes

- **Migrations are timestamped** automatically (e.g., `1735506000000-InitialSchema.ts`)
- **Never edit existing migrations** that have been run in production - create new migrations instead
- **Always review generated migrations** before running them
- **Test migrations on development/staging** before applying to production
- **Backup your database** before running migrations in production
- **`synchronize: false`** is enforced in all environments - schema changes must go through migrations

### Migration Files Location

- Migrations are stored in: `apps/api/src/migrations/`
- DataSource configuration: `apps/api/src/config/data-source.ts`
- Entities are located in: `apps/api/src/entities/`

---

## Seeding

### Running Seeds

**Seed the database:**
```bash
pnpm db:seed
# or
pnpm nx seed api
```

**What the seed script does:**
- Creates organization: "Default Organization" (slug: `default-org`)
- Creates admin user: `admin@example.com` / `admin123`
- Creates a default API key (raw key is printed to console - save it securely)
- Creates sample audit events (10 events spanning the past week)
- **Webhooks are seeded ONLY for `admin@example.com`** (3 webhooks with sample deliveries)

**Important Notes:**
- The seed script is **idempotent** - it checks if data already exists and skips creation if found
- **Webhook seeding is scoped to `admin@example.com` only** - this is dev/test behavior
- Webhook seeding is **skipped in production** (`NODE_ENV=production`)
- The seed script does **not** automatically create users - only the admin user is created
- If you need to reset the database, use `pnpm docker:reset` (⚠️ deletes all data) then re-run migrations and seeds

---

## Testing

The project uses a multi-layered testing approach with standardized commands.

### Test Commands

**API Integration Tests:**
```bash
# Ensure PostgreSQL is running
pnpm docker:up

# Run all API integration tests
pnpm test:api:int
# or
pnpm nx test api

# Run in watch mode
pnpm nx test api --watch

# Run with coverage
pnpm nx test api --coverage
```

**UI Component Tests:**
```bash
# Run shared UI component tests
pnpm test:ui
# or
pnpm nx test ui

# Run in watch mode
cd libs/shared/ui && pnpm vitest
```

**Web E2E Tests:**
```bash
# Run Playwright E2E tests (starts API and web servers automatically)
pnpm test:e2e
# or
pnpm nx e2e web-e2e

# Run with UI mode
pnpm nx e2e web-e2e --ui
```

**Run All Tests:**
```bash
pnpm test:all
```

This runs all test suites in sequence: `test:api:int && test:ui && test:e2e`

### Test Infrastructure

**API Integration Tests:**
- Tests use a dedicated database (`audit_test` by default)
- Database is created automatically if missing
- Migrations run automatically before tests
- Database is truncated between tests for isolation
- Tests use real HTTP server and database (no mocks)
- Session cookies are preserved across requests using `supertest.agent()`

**UI Component Tests:**
- Uses Vitest + React Testing Library
- Tests are located in `libs/shared/ui/src/lib/*.test.tsx`
- Tests key components: Button, Input, Dialog, Table

**E2E Tests:**
- Uses Playwright
- Automatically starts API and web servers before tests
- Tests critical user journeys: signup, login, audit logs, API keys

### Test Coverage

**API Integration Tests:**
- ✅ Authentication (register, login, logout, /auth/me)
- ✅ CSRF protection
- ✅ User profile updates
- ✅ Audit event creation and retrieval
- ✅ Audit event filtering and pagination
- ✅ Audit event exports (JSON, CSV)
- ✅ API key authentication
- ✅ RBAC (role-based access control)
- ✅ Webhook CRUD operations

**UI Component Tests:**
- ✅ Button (disabled, loading, props forwarding)
- ✅ Input (rendering, aria props, error state)
- ✅ Dialog (open/close behavior)
- ✅ Table (rendering, empty state)

**E2E Tests:**
- ✅ Signup → redirect to overview
- ✅ Login → audit logs page → filter interaction
- ✅ Create API key → revoke API key

---

## API Documentation (Scalar)

The API documentation is served via Scalar API Reference, which uses OpenAPI specifications generated by `@nestjs/swagger`.

### Accessing API Docs

**When the API is running:**
- **Scalar UI**: http://localhost:8000/api/docs
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

### Configuration

API documentation can be disabled by setting `DOCS_ENABLED=false` in your `.env` file.

**OpenAPI Configuration:**
- Generated automatically from NestJS controllers and DTOs
- Uses `@ApiProperty()` decorators on DTOs for accurate schema generation
- Tagged endpoints: `auth`, `app`, `audit-events`, `webhooks`, `api-key`, `users`, `orgs`
- See `apps/api/src/main.ts` for Scalar setup

---

## AI / LLM (Vendor-Portable)

The platform includes a vendor-portable LLM layer for AI-powered investigation and summarization features.

### Architecture

**Provider Abstraction:**
- All LLM calls go through `LLMService` (single entry point)
- Provider adapters implement `LLMProvider` interface (e.g., `OllamaProvider`)
- Model registry routes requests to the appropriate provider based on model name
- No direct provider SDK imports in controllers, services, or UI components

**Current Providers:**
- **Ollama** (local dev): Supports llama3, llama2, and other Ollama models
- Provider adapters are located in `apps/api/src/app/llm/providers/`

### Local Development Setup

**1. Start Ollama service:**
```bash
docker compose up -d ollama
```

**2. Pull llama3 model:**
```bash
docker compose exec ollama ollama pull llama3
```

**3. Enable LLM features:**
```env
LLM_ENABLED=true
LLM_OLLAMA_BASE_URL=http://localhost:11434  # or http://ollama:11434 if API runs in Docker
LLM_DEFAULT_MODEL=llama3
```

### Trust & Safety Rules

**Read-Only by Default:**
- AI features are read-only and do not mutate data
- AI output is clearly labeled as "AI-generated"
- AI responses are grounded in real data with provenance (source record IDs, time ranges)

**Grounded & Provenance:**
- AI output cites specific records used (IDs, time ranges)
- If uncertain, AI explains why (missing data, ambiguous evidence)
- Never fabricates timestamps, actors, status codes, or event details

**Safe Failure:**
- All provider calls have timeouts (120s default)
- Retry only on transient network failures (bounded retries)
- If provider fails, returns safe error without blocking core workflows

**Feature Gating:**
- AI features are disabled by default (`LLM_ENABLED=false`)
- Must be explicitly enabled via environment variable
- Admin-only override available for `admin@example.com` in dev mode

**Data Privacy:**
- Never sends secrets (API keys, webhook secrets, passwords, auth headers)
- Minimizes data sent to models (IDs + summaries over full payloads)
- Redaction required for sensitive fields

See `.cursor/rules/llm-ai.mdc` for complete LLM architecture and safety rules.

---

## Repo Rules / Contribution Guidelines

### Cursor Rules

This repository uses Cursor rules (`.cursor/rules/*.mdc`) to enforce architectural boundaries and coding standards:

**Key Rules:**
- **`.cursor/rules/nx-pnpm.mdc`**: Nx workspace management, pnpm dependency rules, app scaffolding
- **`.cursor/rules/nestjs-backend.mdc`**: NestJS architecture, TypeORM integration, DTO validation, Swagger documentation
- **`.cursor/rules/nextjs-frontend.mdc`**: Next.js 15, TypeScript, Tailwind CSS standards
- **`.cursor/rules/typeorm-database.mdc`**: TypeORM, PostgreSQL entities, migration standards
- **`.cursor/rules/styling-ui.mdc`**: Design system rules for 3D modern UI, Tailwind tokens, responsive layouts
- **`.cursor/rules/llm-ai.mdc`**: LLM/AI engineering rules (vendor-portable, trust-first)
- **`.cursor/rules/figma-first.mdc`**: Figma-first enforcement for UI changes
- **`.cursor/rules/testing.mdc`**: Testing standards for Nx monorepo (NestJS API + Next.js UI)
- **`.cursor/rules/workspace-scripts.mdc`**: Standards for running dev servers, tests, and custom scripts

### Architecture Boundaries

**Enforced via ESLint:**
- Apps → libs only (no cross-app imports)
- `scope:web` cannot import `scope:api` or `scope:marketing`
- `scope:api` cannot import `scope:web` or `scope:marketing`
- `scope:marketing` cannot import `scope:api` or `scope:web`

**Nx Tags:**
- All projects have `type:app|lib|e2e` and `scope:api|web|marketing|shared` tags
- Boundary violations are caught at lint time

### Design System Rules

**Figma-First Enforcement:**
- Figma is the single source of truth for all UI and UX
- Cursor MUST NOT invent layouts, spacing, copy, or interaction patterns
- If a required UI element is missing from Figma, STOP implementation and flag the gap
- All colors, spacing, typography, and radii MUST come from `libs/shared/design-system`

**No Premature Abstraction:**
- Prefer concrete implementations over abstract patterns
- Only abstract when explicitly required and approved
- Reuse existing shared components where possible

### Code Style

- TypeScript strict mode enabled
- Prettier for code formatting
- ESLint for linting and boundary enforcement
- See `.cursor/rules/global.mdc` for TypeScript and code style standards

---

## Project Status

### MVP Complete ✅

All core MVP features are implemented and production-ready:
- ✅ Authentication (register, login, logout, session management)
- ✅ Protected routes (Next.js middleware with server-side auth)
- ✅ User profile management
- ✅ Audit Logs ingest (via API key)
- ✅ Audit Logs query (with filters, pagination, export)
- ✅ Audit Logs overview dashboard (real API data)
- ✅ API Key management (CRUD operations)
- ✅ Webhooks management (full CRUD UI)
- ✅ Settings page (user profile, organization info)
- ✅ RBAC (role-based access control)
- ✅ Rate limiting (production-safe defaults)
- ✅ Error tracking/monitoring (Sentry)
- ✅ Environment variable validation (fail fast)
- ✅ Design system & shared UI
- ✅ Docker infrastructure

See `MVP_READINESS_CHECKLIST.md` for complete MVP audit.

### Post-MVP Phases 1–5 Complete ✅

Post-MVP enhancements completed:
- ✅ Phase 1: Foundation (design tokens, structure)
- ✅ Phase 2: Component Primitives (UI library)
- ✅ Phase 3: Layout System (AppShell, navigation)
- ✅ Phase 4: Login Page Migration (design system integration)
- ✅ Phase 5: Audit Logs Page Migration (full design system migration)

### What's Next: Phase 6 Alerts & Automation

**Planned Features:**
- Alerts & Automation system
- Real-time event streaming (SSE/WebSocket)
- Advanced analytics and reporting
- Event retention and archival policies
- Multi-organization support per user
- Webhook delivery queue with background workers

---

## Additional Resources

**Architecture Documentation:**
- See `ARCHITECTURE.md` for detailed API specifications, DTOs, and module structure
- See `docs/standards/architecture.md` for architectural boundaries and layering rules

**Nx Workspace:**
- Run `npx nx graph` to visualize project dependencies
- Use `npx nx list` to see available generators
- Install [Nx Console](https://nx.dev/getting-started/editor-setup) for IDE integration

**Development Scripts:**
- `pnpm dev` - Start API + Web + Marketing with hot reload
- `pnpm docker:up` - Start PostgreSQL only
- `pnpm docker:all` - Start all services in Docker
- `pnpm nx test api` - Run API tests
- `pnpm db:migrate` - Run database migrations
- `pnpm db:migrate:generate --name=<Name>` - Generate migration from entity changes
- `pnpm db:migrate:create --name=<Name>` - Create empty migration
- `pnpm db:migrate:revert` - Revert last migration
- `pnpm db:seed` - Seed development database

---

**Last Updated:** 2025-01-01
