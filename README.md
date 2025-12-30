# CursorRulesMonorepo

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/getting-started/intro#learn-nx?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Local Development Setup

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [pnpm](https://pnpm.io/installation) (v8 or later)
- Node.js 22 or later

### Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and ensure these values are set:
   - `DB_HOST=postgres` (when running in Docker) or `DB_HOST=localhost` (when running locally)
   - `WEB_ORIGIN=http://localhost:3000` (for CORS and cookie sessions)
   - `NEXT_PUBLIC_API_URL=http://localhost:8000/api` (for web app API calls)
   - `SESSION_SECRET` (generate a random secret for production)

3. **Start PostgreSQL database (Docker):**
   ```bash
   pnpm docker:up
   ```
   
   This starts **only** the PostgreSQL container with health checks. Wait for it to be healthy before proceeding.
   
   > **Note:** `pnpm docker:up` uses `docker-compose.local.yml` which only runs PostgreSQL. To run everything in Docker, use `pnpm docker:all` instead.

4. **Run database migrations:**
   ```bash
   pnpm nx migration:run api
   ```

5. **Seed the database (optional):**
   ```bash
   pnpm nx seed api
   ```

6. **Start all services (API + Web with hot reload):**
   ```bash
   pnpm dev
   ```
   
   This runs both the API (port 8000) and Web (port 3000) with hot reload via Nx.

### Alternative: Run Services in Docker

If you prefer to run API and Web in Docker containers with hot reload:

1. **Start all services (PostgreSQL + API + Web):**
   ```bash
   docker-compose up
   ```
   
   This will:
   - Start PostgreSQL with health checks
   - Start API service on port 8000 (with hot reload via Nx)
   - Start Web service on port 3000 (with hot reload via Nx)

2. **Run migrations:**
   ```bash
   pnpm nx migration:run api
   ```

3. **Access the applications:**
   - API: http://localhost:8000/api
   - API Docs: http://localhost:8000/api/docs
   - Web: http://localhost:3000

### Docker Commands

**For local development (PostgreSQL only):**
- **Start PostgreSQL:** `pnpm docker:up` (uses `docker-compose.local.yml`)
- **Stop PostgreSQL:** `pnpm docker:down`
- **View PostgreSQL logs:** `pnpm docker:logs`
- **Reset database:** `pnpm docker:reset` (⚠️ This deletes all data)

**For running everything in Docker:**
- **Start all services (PostgreSQL + API + Web):** `pnpm docker:all` or `docker-compose up -d`
- **Stop all services:** `pnpm docker:all:down` or `docker-compose down`

### Cookie Sessions & CORS Configuration

The API is configured to work with cookie-based sessions:

- **CORS** is enabled with `credentials: true` to allow cookies
- **Origin** is set via `WEB_ORIGIN` environment variable (default: `http://localhost:3000`)
- **Cookies** are configured with:
  - `httpOnly: true` (security)
  - `sameSite: 'lax'` (CSRF protection)
  - `secure: false` in development, `true` in production

Ensure your `.env` has:
```env
WEB_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Troubleshooting

**Port already in use (EADDRINUSE):**

If you see errors like `Error: listen EADDRINUSE: address already in use :::8000`:

1. **Check if Docker containers are running:**
   ```bash
   docker-compose ps
   ```

2. **If Docker containers are running and you want to run locally:**
   ```bash
   docker-compose down
   ```

3. **If you want to find and stop a specific process on Windows:**
   ```powershell
   # Find the process using port 8000
   Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
   
   # Find the process using port 3000
   Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
   ```

4. **Or change the ports in `.env`:**
   ```env
   PORT=8001
   WEB_PORT=3001
   NEXT_PUBLIC_API_URL=http://localhost:8001/api
   WEB_ORIGIN=http://localhost:3001
   ```

**Database connection issues:**
- Ensure PostgreSQL container is healthy: `docker-compose ps`
- Check database credentials in `.env` match docker-compose.yml
- When running locally (not in Docker), use `DB_HOST=localhost`
- When running in Docker, use `DB_HOST=postgres`

**Cookie sessions not working:**
- Verify `WEB_ORIGIN` matches your web app URL
- Ensure API CORS allows credentials
- Check browser console for CORS errors
- Ensure `NEXT_PUBLIC_API_URL` is set correctly in `.env`

## Production Docker Builds

### Building Production Images

**Build API image:**
```bash
docker build -f apps/api/Dockerfile -t cursor-rules-api:latest .
```

**Build Web image:**
```bash
docker build -f apps/web/Dockerfile -t cursor-rules-web:latest --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000/api .
```

### Dockerfile Features

Both Dockerfiles use **multi-stage builds** for minimal production images:

**API Dockerfile (`apps/api/Dockerfile`):**
- Stage 1: Base with pnpm setup
- Stage 2: Install dependencies
- Stage 3: Build NestJS app with Nx
- Stage 4: Production runtime with pruned dependencies
- Uses Nx's `prune-lockfile` and `copy-workspace-modules` for minimal deps
- Runs as non-root user for security
- Includes health checks

**Web Dockerfile (`apps/web/Dockerfile`):**
- Stage 1: Base with pnpm setup
- Stage 2: Install dependencies
- Stage 3: Build Next.js app with Nx
- Stage 4: Production runtime
- Supports both Next.js standalone and standard modes
- Runs as non-root user for security
- Includes health checks

### Running Production Containers

**API:**
```bash
docker run -p 8000:8000 \
  -e DB_HOST=postgres \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_DATABASE=postgres \
  -e SESSION_SECRET=your-secret \
  -e WEB_ORIGIN=http://localhost:3000 \
  cursor-rules-api:latest
```

**Web:**
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000/api \
  -e NODE_ENV=production \
  cursor-rules-web:latest
```

## Testing

### API Integration Tests

The API includes integration tests that use Jest + supertest to test the full HTTP stack with a real PostgreSQL database.

**Prerequisites:**
- PostgreSQL must be running (via Docker or locally)
- Test database will be created automatically if it doesn't exist

**Running Tests:**

1. **Ensure PostgreSQL is running:**
   ```bash
   pnpm docker:up
   ```

2. **Set test database environment variable (optional):**
   ```bash
   # Defaults to 'audit_test' if not set
   export DB_DATABASE_TEST=audit_test
   ```

3. **Run all integration tests:**
   ```bash
   pnpm nx test api
   ```

4. **Run tests in watch mode:**
   ```bash
   pnpm nx test api --watch
   ```

**Test Coverage:**

The integration tests cover:
- ✅ Login sets session cookie (httpOnly)
- ✅ `/auth/me` endpoint works with session cookie
- ✅ Audit event ingestion with API key authentication
- ✅ RBAC: Members can only see their own user events, admins see all org events

**Test Database:**

Tests use a dedicated test database (`audit_test` by default) that is:
- Created automatically if it doesn't exist
- Migrated automatically before tests run
- Truncated between tests to ensure isolation
- Never affects your development database

**Test Structure:**

- Tests are located in `apps/api/src/**/*.integration.spec.ts`
- Test utilities are in `apps/api/src/test/`
- Global setup/teardown handles database creation and migrations

## Run tasks

To run tasks with Nx use:

```sh
npx nx <target> <project-name>
```

For example:

```sh
npx nx build myproject
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

To install a new plugin you can use the `nx add` command. Here's an example of adding the React plugin:
```sh
npx nx add @nx/react
```

Use the plugin's generator to create new projects. For example, to create a new React app or library:

```sh
# Generate an app
npx nx g @nx/react:app demo

# Generate a library
npx nx g @nx/react:lib some-lib
```

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Set up CI!

### Step 1

To connect to Nx Cloud, run the following command:

```sh
npx nx connect
```

Connecting to Nx Cloud ensures a [fast and scalable CI](https://nx.dev/ci/intro/why-nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/ci/features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/ci/features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/ci/features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/ci/features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Step 2

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/getting-started/intro#learn-nx?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:
- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
