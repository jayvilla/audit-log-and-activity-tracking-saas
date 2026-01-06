# Environment Variables

## Overview

This document lists all environment variables used across the monorepo, their purposes, and validation rules.

## Root `.env` File

The root `.env` file is used by Docker Compose and can be shared across apps. Create it from `.env.example`:

```bash
cp .env.example .env
```

## API Environment Variables

**Location:** `apps/api/.env` or root `.env`  
**Validation:** `apps/api/src/config/env.schema.ts`

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` or `postgres` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `your-secure-password` |
| `DB_DATABASE` | Database name | `postgres` |

### Optional (with defaults)

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `NODE_ENV` | Environment | `development` | `development`, `production`, `test` |
| `PORT` | API port | `8000` | |
| `SESSION_SECRET` | Session encryption secret | (warns if missing) | **Required in production (min 32 chars)** |
| `WEB_ORIGIN` | CORS origin | `http://localhost:3000` | |
| `DB_SSL` | Enable SSL | `false` | `true` or `false` |
| `SENTRY_DSN` | Sentry error tracking | (optional) | |
| `RATE_LIMIT_AUTH_MAX_REQUESTS` | Auth rate limit | `5` | Requests per window |
| `RATE_LIMIT_AUDIT_INGEST_MAX_REQUESTS` | Audit ingest limit | `300` | |
| `RATE_LIMIT_AUDIT_QUERY_MAX_REQUESTS` | Audit query limit | `60` | |
| `RATE_LIMIT_API_KEY_MANAGEMENT_MAX_REQUESTS` | API key mgmt limit | `10` | |
| `DOCS_ENABLED` | Enable API docs | `true` | `true` or `false` |
| `LLM_OLLAMA_BASE_URL` | Ollama API base URL | (optional) | **DEV ONLY** - `http://ollama:11434` (Docker) or `http://localhost:11434` (local) |
| `LLM_DEFAULT_MODEL` | Default LLM model name | `llama3` | **DEV ONLY** - Model to use for AI features |

### Production Requirements

- `SESSION_SECRET` must be at least 32 characters
- `DB_SSL` should be `true`
- `NODE_ENV` must be `production`
- `WEB_ORIGIN` must be your production frontend URL

## Web App Environment Variables

**Location:** `apps/web/.env` or root `.env`  
**Validation:** `apps/web/src/config/env.schema.ts`

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API base URL | `http://localhost:8000/api` |

### Optional

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (client) | (optional) |
| `SENTRY_DSN` | Sentry DSN (server) | (optional) |
| `SENTRY_ORG` | Sentry organization | (optional) |
| `SENTRY_PROJECT` | Sentry project | (optional) |
| `NODE_ENV` | Environment | `development` |

**Note:** `NEXT_PUBLIC_*` variables are exposed to the browser. Never put secrets here.

## Marketing App Environment Variables

**Location:** `apps/marketing/.env` or root `.env`  
**Validation:** (to be added)

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SITE_URL` | Marketing site URL | `http://localhost:3001` |
| `NEXT_PUBLIC_APP_URL` | Web app URL (for links) | `http://localhost:3000` |

### Optional

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |

## Docker Compose Variables

**Location:** Root `.env` (used by `docker-compose.yml`)

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL user | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgres` |
| `POSTGRES_DB` | PostgreSQL database | `postgres` |
| `DB_PORT` | Exposed DB port | `5432` |

## LLM Configuration (DEV ONLY)

**⚠️ WARNING:** LLM features are **DEV-ONLY** and must not be enabled in production unless explicitly configured.

**Location:** Root `.env` or `apps/api/.env`

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `LLM_OLLAMA_BASE_URL` | Ollama API base URL | `http://ollama:11434` | Use `http://ollama:11434` when API runs in Docker, `http://localhost:11434` when running locally |
| `LLM_DEFAULT_MODEL` | Default LLM model | `llama3` | Model name to use for AI features |

**Setup Instructions:**

1. Start Ollama service: `docker compose up -d ollama`
2. Pull llama3 model: `docker compose exec ollama ollama pull llama3`
3. Verify: `curl http://localhost:11434/api/tags` (should list available models)
4. Configure API: Set `LLM_OLLAMA_BASE_URL` and `LLM_DEFAULT_MODEL` in `.env`

**Production Safety:**
- AI features are feature-gated and disabled by default
- Never enable LLM in production without explicit configuration
- Always use secure, production-grade LLM providers in production

## Environment-Specific Files

### Development

- Use root `.env` or app-specific `.env`
- Defaults are permissive
- `SESSION_SECRET` can be weak (warns)

### Production

- **Never commit `.env` files**
- Use secrets management (AWS Secrets Manager, etc.)
- `SESSION_SECRET` must be strong (32+ chars)
- `DB_SSL=true`
- `NODE_ENV=production`

### Testing

- Use `apps/api/.env.test` (optional)
- Test database: `DB_DATABASE_TEST` (defaults to `audit_test`)

## Validation

### API Validation

Environment variables are validated at startup using Zod:

```typescript
// apps/api/src/config/env.schema.ts
import { validateEnv } from './config/env.schema';

// In main.ts
validateEnv(); // Throws if invalid
```

### Web Validation

```typescript
// apps/web/src/config/env.schema.ts
import { validateEnv } from './config/env.schema';

// In next.config.js or middleware
validateEnv();
```

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use strong secrets** - Generate with `openssl rand -base64 32`
3. **Rotate secrets regularly** - Especially `SESSION_SECRET`
4. **Use different secrets per environment** - Dev, staging, prod
5. **Limit `NEXT_PUBLIC_*` variables** - They're exposed to browser
6. **Validate at startup** - Fail fast if config is invalid

## Generating Secrets

```bash
# Generate SESSION_SECRET
openssl rand -base64 32

# Generate API key (for testing)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Troubleshooting

### "SESSION_SECRET is required"

- Set `SESSION_SECRET` in `.env`
- In production, ensure it's at least 32 characters

### "DB_HOST connection refused"

- Ensure PostgreSQL is running: `pnpm docker:up`
- Check `DB_HOST` matches your setup:
  - `localhost` if API runs locally
  - `postgres` if API runs in Docker

### "CORS error"

- Check `WEB_ORIGIN` matches your frontend URL
- Ensure `credentials: true` in API CORS config

### "Environment variable validation failed"

- Check error message for specific variable
- Ensure all required variables are set
- Check variable types (numbers, booleans, etc.)

---

**Last Updated:** 2026-01-01

