import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';
import { createHash, randomBytes } from 'crypto';

// Load .env from root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Script to add sample audit events to existing organization and user
 * Run with: pnpm exec tsx apps/api/src/add-audit-events.ts
 */
async function addAuditEvents() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find the default organization
    const orgResult = await client.query(
      `SELECT id, name, slug FROM organizations WHERE slug = $1`,
      ['default-org']
    );

    if (orgResult.rows.length === 0) {
      console.log('❌ Organization "default-org" not found.');
      console.log('💡 Run the seed script first: pnpm nx seed api');
      return;
    }

    const org = orgResult.rows[0];
    console.log(`✅ Found organization: ${org.name} (${org.id})\n`);

    // Find the admin user
    const userResult = await client.query(
      `SELECT id, email FROM users WHERE email = $1 AND org_id = $2`,
      ['admin@example.com', org.id]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ Admin user not found in this organization.');
      return;
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.email} (${user.id})\n`);

    // Find an API key for this org
    const apiKeyResult = await client.query(
      `SELECT id, name FROM api_keys WHERE org_id = $1 LIMIT 1`,
      [org.id]
    );
    const apiKey = apiKeyResult.rows.length > 0 ? apiKeyResult.rows[0] : null;
    if (apiKey) {
      console.log(`✅ Found API key: ${apiKey.name} (${apiKey.id})\n`);
    }

    // Check if audit events already exist
    const existingEventsResult = await client.query(
      `SELECT COUNT(*) as count FROM audit_events WHERE org_id = $1`,
      [org.id]
    );
    const existingCount = parseInt(existingEventsResult.rows[0].count, 10);

    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing audit events for this organization.`);
      console.log('   Adding more sample events...\n');
    }

    // Create sample audit events
    console.log('📊 Creating sample audit events...');
    const now = new Date();
    const events = [
      {
        orgId: org.id,
        actorType: 'user',
        actorId: user.id,
        action: 'created',
        resourceType: 'organization',
        resourceId: org.id,
        metadata: JSON.stringify({ name: org.name, slug: org.slug }),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      {
        orgId: org.id,
        actorType: 'user',
        actorId: user.id,
        action: 'created',
        resourceType: 'user',
        resourceId: user.id,
        metadata: JSON.stringify({ email: user.email, role: 'admin', name: 'Admin User' }),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      },
      ...(apiKey ? [{
        orgId: org.id,
        actorType: 'user',
        actorId: user.id,
        action: 'created',
        resourceType: 'api-key',
        resourceId: apiKey.id,
        metadata: JSON.stringify({ name: apiKey.name }),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      }] : []),
      {
        orgId: org.id,
        actorType: 'user',
        actorId: user.id,
        action: 'login',
        resourceType: 'session',
        resourceId: `session-${randomBytes(16).toString('hex')}`,
        metadata: JSON.stringify({ method: 'password', success: true }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      },
      {
        orgId: org.id,
        actorType: 'user',
        actorId: user.id,
        action: 'viewed',
        resourceType: 'audit-log',
        resourceId: 'audit-logs-page',
        metadata: JSON.stringify({ filters: { limit: 50 } }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      ...(apiKey ? [{
        orgId: org.id,
        actorType: 'api_key',
        actorId: apiKey.id,
        action: 'created',
        resourceType: 'audit-event',
        resourceId: `event-${randomBytes(16).toString('hex')}`,
        metadata: JSON.stringify({
          eventType: 'user.action',
          source: 'external-api',
          clientVersion: '1.0.0',
        }),
        ipAddress: '203.0.113.42',
        userAgent: 'MyApp/1.0.0',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      }] : []),
      {
        orgId: org.id,
        actorType: 'user',
        actorId: user.id,
        action: 'updated',
        resourceType: 'user',
        resourceId: user.id,
        metadata: JSON.stringify({ field: 'name', oldValue: 'Admin', newValue: 'Admin User' }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        orgId: org.id,
        actorType: 'user',
        actorId: user.id,
        action: 'exported',
        resourceType: 'audit-log',
        resourceId: `export-${randomBytes(16).toString('hex')}`,
        metadata: JSON.stringify({ format: 'csv', recordCount: 7, dateRange: 'last-7-days' }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
      },
      {
        orgId: org.id,
        actorType: 'system',
        actorId: null,
        action: 'started',
        resourceType: 'system',
        resourceId: 'webhook-worker',
        metadata: JSON.stringify({ version: '1.0.0', environment: 'development' }),
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      },
      {
        orgId: org.id,
        actorType: 'user',
        actorId: user.id,
        action: 'login',
        resourceType: 'session',
        resourceId: `session-${randomBytes(16).toString('hex')}`,
        metadata: JSON.stringify({ method: 'password', success: true }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
    ];

    let createdCount = 0;
    for (const event of events) {
      try {
        await client.query(
          `INSERT INTO audit_events (org_id, actor_type, actor_id, action, resource_type, resource_id, metadata, ip_address, user_agent, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            event.orgId,
            event.actorType,
            event.actorId,
            event.action,
            event.resourceType,
            event.resourceId,
            event.metadata,
            event.ipAddress,
            event.userAgent,
            event.createdAt,
          ]
        );
        createdCount++;
      } catch (error) {
        console.error(`Failed to create event: ${event.action} on ${event.resourceType}`, error);
      }
    }

    console.log(`✅ Created ${createdCount} audit events`);

    // Verify the events were created
    const verifyResult = await client.query(
      `SELECT COUNT(*) as count FROM audit_events WHERE org_id = $1`,
      [org.id]
    );
    const totalCount = parseInt(verifyResult.rows[0].count, 10);
    console.log(`\n📊 Total audit events for organization: ${totalCount}`);

    console.log('\n✅ Done! You should now see audit events when you refresh the audit logs page.');
  } catch (error) {
    console.error('❌ Error adding audit events:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

addAuditEvents();

