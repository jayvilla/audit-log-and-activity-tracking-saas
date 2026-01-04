/**
 * E2E Test API Server
 * 
 * Manages the test API server process for E2E tests.
 * Uses a separate Node process to avoid decorator/metadata issues.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { workspaceRoot } from '@nx/devkit';

let serverProcess: ChildProcess | null = null;
const PORT = 8001;
const API_URL = `http://localhost:${PORT}/api`;

/**
 * Start the test API server as a separate process
 */
export async function startTestApiServer(): Promise<string> {
  if (serverProcess && !serverProcess.killed) {
    // Check if server is actually responding
    try {
      const response = await fetch(`${API_URL.replace('/api', '')}/api/health`);
      if (response.ok) {
        // Already started and running
        return API_URL;
      }
    } catch {
      // Server process exists but not responding, kill it
      serverProcess.kill('SIGKILL');
      serverProcess = null;
    }
  }
  
  // Clean up any previous process
  if (serverProcess) {
    serverProcess.kill('SIGKILL');
    serverProcess = null;
    // Wait a bit for port to be released
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Path to the start script (relative to workspace root)
  const scriptPath = path.join(workspaceRoot, 'apps', 'web-e2e', 'src', 'support', 'start-api-server.ts');
  const tsConfigPath = path.join(workspaceRoot, 'apps', 'web-e2e', 'tsconfig.server.json');
  
  console.log(`Starting test API server with ts-node: ${scriptPath}`);
  
  // Use ts-node with proper config to handle decorators
  serverProcess = spawn('pnpm', ['exec', 'ts-node', '--project', tsConfigPath, scriptPath], {
    cwd: workspaceRoot,
    stdio: 'pipe',
    env: {
      ...process.env,
      TEST_API_PORT: PORT.toString(),
    },
    shell: true,
  });

  // Log output
  serverProcess.stdout?.on('data', (data) => {
    console.log(`[API Server] ${data.toString().trim()}`);
  });
  
  serverProcess.stderr?.on('data', (data) => {
    console.error(`[API Server Error] ${data.toString().trim()}`);
  });

  // Wait for server to be ready
  await waitForServer(API_URL);

  return API_URL;
}

/**
 * Wait for the server to be ready
 */
async function waitForServer(url: string, maxAttempts = 60): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${url.replace('/api', '')}/api/health`);
      if (response.ok) {
        console.log('✅ Test API server is ready');
        return;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Server did not start within ${maxAttempts} seconds`);
}

/**
 * Stop the test API server
 */
export async function stopTestApiServer(): Promise<void> {
  if (serverProcess) {
    console.log('Stopping test API server...');
    serverProcess.kill('SIGTERM');
    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (serverProcess.killed === false) {
      serverProcess.kill('SIGKILL');
    }
    serverProcess = null;
    console.log('✅ Test API server stopped');
  }
}

/**
 * Get the current API URL
 */
export function getTestApiUrl(): string {
  return API_URL;
}

