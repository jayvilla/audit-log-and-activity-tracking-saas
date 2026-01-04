/**
 * Standalone script to start the test API server
 * 
 * This script is run as a separate Node process to avoid
 * decorator/metadata issues with Playwright's module system.
 */

// Import reflect-metadata first (must be before any other imports)
import 'reflect-metadata';

import { createTestApp, closeTestApp } from './test-app-factory-e2e';
import * as net from 'net';

const PORT = parseInt(process.env.TEST_API_PORT || '8001', 10);

let app: any = null;

/**
 * Check if a port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * Find and kill process using a port (Windows)
 */
async function killProcessOnPort(port: number): Promise<void> {
  if (process.platform !== 'win32') {
    return; // Only handle Windows for now
  }

  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Find process using the port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const lines = stdout.trim().split('\n');
    
    for (const line of lines) {
      const match = line.match(/\s+(\d+)\s*$/);
      if (match) {
        const pid = match[1];
        try {
          await execAsync(`taskkill /F /PID ${pid}`);
          console.log(`Killed process ${pid} using port ${port}`);
          // Wait a bit for port to be released
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          // Process might already be gone, ignore
        }
      }
    }
  } catch (error) {
    // No process found or error, that's ok
  }
}

async function startServer() {
  try {
    // Check if port is available, if not try to free it
    const portAvailable = await isPortAvailable(PORT);
    if (!portAvailable) {
      console.log(`Port ${PORT} is in use, attempting to free it...`);
      await killProcessOnPort(PORT);
      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 2000));
      const stillInUse = !(await isPortAvailable(PORT));
      if (stillInUse) {
        throw new Error(`Port ${PORT} is still in use after cleanup attempt. Please manually stop the process using that port.`);
      }
    }

    app = await createTestApp();
    await app.listen(PORT);
    console.log(`✅ Test API server started on http://localhost:${PORT}/api`);
    
    // Keep process alive
    process.on('SIGTERM', async () => {
      if (app) {
        await closeTestApp(app);
      }
      process.exit(0);
    });
    process.on('SIGINT', async () => {
      if (app) {
        await closeTestApp(app);
      }
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start test API server:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

startServer();

