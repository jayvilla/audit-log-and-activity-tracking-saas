# Audit Log & Activity Tracking SaaS

An MVP-focused audit logging platform with append-only logs, filtering, export capabilities, role-based access control (RBAC), and webhook delivery. Built for organizations that need to track and monitor user activities, API usage, and system events in a secure, immutable audit trail.

**Target Users:** Development teams, DevOps engineers, and organizations requiring compliance-ready audit logging with real-time webhook notifications.

**Primary Problem Solved:** Provides a centralized, append-only audit logging system with fine-grained access control, enabling teams to track all critical events while maintaining data integrity and security.

**Architecture:** Monorepo structure using Nx with a NestJS REST API backend and Next.js frontend, connected to PostgreSQL for persistent storage. Uses cookie-based sessions for web authentication and API keys for programmatic access.

---

## Tech Stack

**Languages & Runtimes:**
- TypeScript 5.9
- Node.js 22+

**Backend:**
- NestJS 11 (REST API)
- TypeORM 0.3 (PostgreSQL ORM)
- Express 5 (HTTP server)
- Express Session (cookie-based sessions)
- Swagger/OpenAPI (API documentation)

**Frontend:**
- Next.js 16 (React framework)
- React 19
- Tailwind CSS 3.4 (styling)
- Axios (HTTP client)

**Database:**
- PostgreSQL 16

**Infrastructure & Tools:**
- Nx 22.3 (monorepo management)
- pnpm 8+ (package manager)
- Docker & Docker Compose (containerization)
- Jest 30 (testing)
- Playwright (E2E testing)

**Shared Libraries:**
- `libs/shared/types` - Shared DTOs and types between frontend and backend

---

## Repository Structure

```
audit-log-and-activity-tracking-saas/
├── apps/
│   ├── api/              # NestJS backend application
│   │   ├── src/
│   │   │   ├── app/       # Feature modules (auth, audit-events, webhooks, etc.)
│   │   │   ├── entities/  # TypeORM entities
│   │   │   ├── migrations/# Database migrations
│   │   │   └── test/      # Test utilities and setup
│   │   └── Dockerfile     # Production Docker image
│   ├── web/              # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/       # Next.js app router pages
│   │   │   └── lib/       # Client utilities
│   │   └── Dockerfile     # Production Docker image
│   ├── api-e2e/          # API integration tests
│   └── web-e2e/          # Web E2E tests (Playwright)
├── libs/
│   └── shared/
│       └── types/         # Shared DTOs and TypeScript types
├── docker-compose.yml     # Full stack Docker Compose
├── docker-compose.local.yml # PostgreSQL only for local dev
└── .env.example           # Environment variable template
```

**Key Modules:**
- `apps/api/src/app/auth/` - Authentication and session management
- `apps/api/src/app/audit-events/` - Core audit logging (append-only)
- `apps/api/src/app/webhooks/` - Webhook delivery system
- `apps/api/src/app/api-key/` - API key management and authentication
- `apps/web/src/app/audit-logs/` - Audit log viewing interface
- `apps/web/src/app/login/` - Authentication UI

---

## Prerequisites

**Required Runtime:**
- Node.js 22 or later
- pnpm 8 or later

**Required Tools:**
- Docker Desktop (or Docker Engine + Docker Compose)
- Git

**System Dependencies:**
- PostgreSQL 16 (via Docker or local installation)

**Optional:**
- Nx Console (VS Code/IntelliJ extension) for enhanced developer experience

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
```

**Security Notes:**
- `SESSION_SECRET` must be a strong random string in production (use `openssl rand -base64 32`)
- Never commit `.env` files to version control
- `DB_PASSWORD` should be changed from defaults in production

### API-Specific `.env` (Optional)

If running the API independently, you can also create `apps/api/.env` with database configuration only.

---

## Installation

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
   
   Edit `.env` and ensure:
   - `DB_HOST=localhost` (when running API locally)
   - `DB_HOST=postgres` (when running API in Docker)
   - `WEB_ORIGIN` matches your web app URL
   - `SESSION_SECRET` is set (generate a random secret)

4. **Start PostgreSQL database:**
   ```bash
   pnpm docker:up
   ```
   
   This starts only the PostgreSQL container. Wait for it to be healthy before proceeding.

5. **Run database migrations:**
   ```bash
   pnpm nx migration:run api
   ```

6. **Seed the database (optional):**
   ```bash
   pnpm nx seed api
   ```

---

## Running the Project

### Local Development (Recommended)

**Start all services with hot reload:**
```bash
pnpm dev
```

This command runs:
- **API** on `http://localhost:8000` (NestJS with hot reload)
- **Web** on `http://localhost:3000` (Next.js with hot reload)

**Access Points:**
- Web Application: http://localhost:3000
- API Base URL: http://localhost:8000/api
- API Documentation (Swagger): http://localhost:8000/api/docs

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

**Note:** When running in Docker, ensure `DB_HOST=postgres` in your `.env` file.

### Docker Commands

**PostgreSQL only (for local development):**
- Start: `pnpm docker:up`
- Stop: `pnpm docker:down`
- View logs: `pnpm docker:logs`
- Reset database (⚠️ deletes all data): `pnpm docker:reset`

**Full stack:**
- Start all: `pnpm docker:all` or `docker-compose up -d`
- Stop all: `pnpm docker:all:down` or `docker-compose down`

---

## Testing

### Testing Strategy

The project uses a multi-layered testing approach:
- **Unit Tests:** Jest for individual components and services
- **Integration Tests:** Jest + Supertest for API endpoints with real database
- **E2E Tests:** Playwright for full user workflows

### Running Tests

**API Integration Tests:**
```bash
# Ensure PostgreSQL is running
pnpm docker:up

# Run all API tests
pnpm nx test api

# Run in watch mode
pnpm nx test api --watch

# Run with coverage
pnpm nx test api --coverage
```

**Web E2E Tests:**
```bash
pnpm nx e2e web-e2e
```

**All Tests:**
```bash
pnpm nx run-many --target=test --all
```

### Test Infrastructure

**Test Database:**
- Tests use a dedicated database (`audit_test` by default)
- Database is created automatically if missing
- Migrations run automatically before tests
- Database is truncated between tests for isolation

**Test Environment Variables:**
- Set `DB_DATABASE_TEST` to override default test database name
- Test database credentials use same `DB_USERNAME` and `DB_PASSWORD` as development

**Test Coverage:**
- ✅ Authentication and session management
- ✅ Audit event creation and retrieval
- ✅ API key authentication
- ✅ RBAC (role-based access control)
- ✅ Webhook delivery

---

## Build / Deployment

### Building for Production

**Build API:**
```bash
pnpm build:api
# or
pnpm nx build api
```

**Build Web:**
```bash
pnpm build:web
# or
pnpm nx build web
```

**Build all:**
```bash
pnpm nx run-many --target=build --all
```

### Docker Production Builds

**Build API image:**
```bash
docker build -f apps/api/Dockerfile -t audit-log-saas-api:latest .
```

**Build Web image:**
```bash
docker build -f apps/web/Dockerfile -t audit-log-saas-web:latest \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000/api .
```

**Dockerfile Features:**
- Multi-stage builds for minimal image size
- Non-root user execution for security
- Health checks included
- Optimized dependency installation

### Production Deployment

**Environment Variables for Production:**
- Set `NODE_ENV=production`
- Use strong `SESSION_SECRET` (generate with `openssl rand -base64 32`)
- Configure `WEB_ORIGIN` to your production frontend URL
- Set `DB_SSL=true` and configure SSL certificates for database
- Use secure database credentials

**Running Production Containers:**

API:
```bash
docker run -p 8000:8000 \
  -e DB_HOST=postgres \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=your-secure-password \
  -e DB_DATABASE=postgres \
  -e SESSION_SECRET=your-secret \
  -e WEB_ORIGIN=https://your-frontend-domain.com \
  -e NODE_ENV=production \
  audit-log-saas-api:latest
```

Web:
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://your-api-domain.com/api \
  -e NODE_ENV=production \
  audit-log-saas-web:latest
```

---

## Configuration & Security Notes

### Authentication

**Session-Based (Web):**
- Cookie-based sessions stored in PostgreSQL
- Cookies are `httpOnly`, `sameSite: 'lax'`, and `secure` in production
- Session duration: 30 days
- Session secret must be set via `SESSION_SECRET` environment variable

**API Key (Programmatic):**
- API keys use Bearer token format: `Authorization: Bearer <api-key>`
- Keys are hashed in the database (bcrypt)
- Keys can be scoped to organizations
- Last used timestamp tracked

### CORS Configuration

- CORS is enabled with `credentials: true` to support cookie sessions
- Origin is configured via `WEB_ORIGIN` environment variable
- Default development origin: `http://localhost:3000`
- Production must set `WEB_ORIGIN` to actual frontend domain

### Security Considerations

**Production Checklist:**
- ✅ Change default database passwords
- ✅ Generate strong `SESSION_SECRET`
- ✅ Enable `secure` cookies (automatic when `NODE_ENV=production`)
- ✅ Configure SSL for database connections (`DB_SSL=true`)
- ✅ Restrict CORS origins to known frontend domains
- ✅ Use environment variables for all secrets (never hardcode)
- ✅ Run containers as non-root users (Dockerfiles configured)

**CSRF Protection:**
- CSRF tokens required for state-changing operations
- Implemented via `x-csrf-token` header
- SameSite cookie policy provides additional protection

---

## Known Limitations / TODOs

### Current Limitations

**MVP Scope Boundaries:**
- ❌ Real-time event streaming (SSE/WebSocket) - not implemented
- ❌ Advanced analytics/dashboards - basic filtering only
- ❌ Custom event schemas/validation - flexible metadata only
- ❌ Event retention policies - no automatic cleanup
- ❌ Multi-tenant isolation beyond orgId - single org per user
- ❌ Audit log archiving - all events stored indefinitely

**Performance Considerations:**
- Large audit event queries may be slow without pagination
- No built-in rate limiting for audit event creation (API key rate limiting exists)
- Webhook delivery is synchronous (may block on slow endpoints)

### Planned Features (Future)

- Real-time event streaming via Server-Sent Events (SSE)
- Advanced filtering and search capabilities
- Event retention and archival policies
- Multi-organization support per user
- Webhook delivery queue with background workers
- Audit log analytics and reporting
- Custom event schema validation

### Known Issues

- None currently documented. Please report issues via GitHub Issues.

---

## Additional Resources

**Architecture Documentation:**
- See `ARCHITECTURE.md` for detailed API specifications, DTOs, and module structure

**Nx Workspace:**
- Run `npx nx graph` to visualize project dependencies
- Use `npx nx list` to see available generators
- Install [Nx Console](https://nx.dev/getting-started/editor-setup) for IDE integration

**API Documentation:**
- Swagger UI available at http://localhost:8000/api/docs when API is running

**Development Scripts:**
- `pnpm dev` - Start API + Web with hot reload
- `pnpm docker:up` - Start PostgreSQL only
- `pnpm docker:all` - Start all services in Docker
- `pnpm nx test api` - Run API tests
- `pnpm nx migration:run api` - Run database migrations
- `pnpm nx seed api` - Seed development database
