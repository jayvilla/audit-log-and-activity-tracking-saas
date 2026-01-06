import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';
import { createHash, randomBytes } from 'crypto';

// Load .env from root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function seed() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if seed data already exists
    const existingOrg = await client.query(
      `SELECT id FROM organizations WHERE slug = $1`,
      ['default-org']
    );

    let orgId: string;
    let userId: string;

    if (existingOrg.rows.length > 0) {
      console.log('⚠️  Seed data already exists. Skipping main seed.');
      orgId = existingOrg.rows[0].id;
      
      // Still try to seed webhooks for admin user if they don't exist
      const adminEmail = 'admin@example.com';
      const userResult = await client.query(
        `SELECT id FROM users WHERE email = $1 AND org_id = $2`,
        [adminEmail, orgId]
      );
      
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
        const webhookCount = await seedWebhooksForAdminOnly(client, orgId, adminEmail);
        if (webhookCount > 0) {
          console.log(`✅ Webhook seeding completed: ${webhookCount} webhooks`);
        } else {
          console.log(`ℹ️  Webhook seeding skipped (webhooks may already exist or user not found)`);
        }
      } else {
        console.log(`⚠️  ${adminEmail} not found — skipping webhook seed`);
      }
      return;
    }

    // 1. Create organization
    console.log('📦 Creating organization...');
    const orgResult = await client.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id, name`,
      ['Default Organization', 'default-org']
    );
    orgId = orgResult.rows[0].id;
    console.log(`✅ Created organization: ${orgResult.rows[0].name} (${orgId})`);

    // 2. Create admin user
    console.log('👤 Creating admin user...');
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123'; // In production, use a strong password!
    const passwordHash = createHash('sha256').update(adminPassword).digest('hex');

    const userResult = await client.query(
      `INSERT INTO users (org_id, email, password_hash, role, name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email`,
      [orgId, adminEmail, passwordHash, 'admin', 'Admin User']
    );
    userId = userResult.rows[0].id;
    console.log(`✅ Created admin user: ${adminEmail} (${userId})`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);

    // 3. Create API key
    console.log('🔑 Creating API key...');
    const rawApiKey = `sk_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawApiKey).digest('hex');

    const apiKeyResult = await client.query(
      `INSERT INTO api_keys (org_id, name, key_hash, last_used_at)
       VALUES ($1, $2, $3, $4) RETURNING id, name`,
      [orgId, 'Default API Key', keyHash, null]
    );
    const apiKeyId = apiKeyResult.rows[0].id;
    console.log(`✅ Created API key: ${apiKeyResult.rows[0].name} (${apiKeyId})`);
    console.log(`   Raw Key: ${rawApiKey}`);
    console.log(`   ⚠️  Store this key securely! It won't be shown again.`);

    // 4. Create sample audit events
    console.log('\n📊 Creating sample audit events...');
    const now = new Date();
    const events = [
      {
        orgId,
        actorType: 'user',
        actorId: userId,
        action: 'created',
        resourceType: 'organization',
        resourceId: orgId,
        metadata: JSON.stringify({ name: 'Default Organization', slug: 'default-org' }),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      {
        orgId,
        actorType: 'user',
        actorId: userId,
        action: 'created',
        resourceType: 'user',
        resourceId: userId,
        metadata: JSON.stringify({ email: adminEmail, role: 'admin', name: 'Admin User' }),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      },
      {
        orgId,
        actorType: 'user',
        actorId: userId,
        action: 'created',
        resourceType: 'api-key',
        resourceId: apiKeyId,
        metadata: JSON.stringify({ name: 'Default API Key' }),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        orgId,
        actorType: 'user',
        actorId: userId,
        action: 'login',
        resourceType: 'session',
        resourceId: `session-${randomBytes(16).toString('hex')}`,
        metadata: JSON.stringify({ method: 'password', success: true }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      },
      {
        orgId,
        actorType: 'user',
        actorId: userId,
        action: 'viewed',
        resourceType: 'audit-log',
        resourceId: 'audit-logs-page',
        metadata: JSON.stringify({ filters: { limit: 50 } }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        orgId,
        actorType: 'api-key',
        actorId: apiKeyId,
        action: 'created',
        resourceType: 'audit-event',
        resourceId: `event-${randomBytes(16).toString('hex')}`,
        metadata: JSON.stringify({ 
          eventType: 'user.action',
          source: 'external-api',
          clientVersion: '1.0.0'
        }),
        ipAddress: '203.0.113.42',
        userAgent: 'MyApp/1.0.0',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        orgId,
        actorType: 'user',
        actorId: userId,
        action: 'updated',
        resourceType: 'user',
        resourceId: userId,
        metadata: JSON.stringify({ field: 'name', oldValue: 'Admin', newValue: 'Admin User' }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        orgId,
        actorType: 'user',
        actorId: userId,
        action: 'exported',
        resourceType: 'audit-log',
        resourceId: `export-${randomBytes(16).toString('hex')}`,
        metadata: JSON.stringify({ format: 'csv', recordCount: 7, dateRange: 'last-7-days' }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
      },
      {
        orgId,
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
        orgId,
        actorType: 'user',
        actorId: userId,
        action: 'login',
        resourceType: 'session',
        resourceId: `session-${randomBytes(16).toString('hex')}`,
        metadata: JSON.stringify({ method: 'password', success: true }),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
    ];

    for (const event of events) {
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
    }
    console.log(`✅ Created ${events.length} sample audit events`);

    // 5. Seed webhooks for admin user only
    const webhookCount = await seedWebhooksForAdminOnly(client, orgId, adminEmail);

    console.log('\n✅ Database seed completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   Organization: Default Organization`);
    console.log(`   Admin User: ${adminEmail}`);
    console.log(`   API Key: ${rawApiKey.substring(0, 20)}...`);
    console.log(`   Audit Events: ${events.length} sample events created`);
    if (webhookCount > 0) {
      console.log(`   Webhooks: ${webhookCount} webhooks created for ${adminEmail}`);
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

/**
 * Seed webhooks for admin@example.com ONLY
 * This is DEV-ONLY / SEED-ONLY and will NOT run in production
 */
async function seedWebhooksForAdminOnly(
  client: Client,
  orgId: string,
  adminEmail: string
): Promise<number> {
  // Environment safety check
  if (process.env.NODE_ENV === 'production') {
    console.log('[seed] Production environment detected — skipping webhook seed');
    return 0;
  }

  console.log('\n🔗 Seeding webhooks for admin user...');
  console.log(`   Looking for user: ${adminEmail} in org: ${orgId}`);

  // Look up admin user and verify org matches
  const userResult = await client.query(
    `SELECT id, org_id FROM users WHERE email = $1 AND org_id = $2`,
    [adminEmail, orgId]
  );

  if (userResult.rows.length === 0) {
    console.log(`[seed] ${adminEmail} not found in org ${orgId} — skipping webhook seed`);
    // Debug: Check if user exists in different org
    const anyUserResult = await client.query(
      `SELECT id, org_id, email FROM users WHERE email = $1`,
      [adminEmail]
    );
    if (anyUserResult.rows.length > 0) {
      console.log(`[seed] User found but in different org: ${anyUserResult.rows[0].org_id}`);
    }
    return 0;
  }

  const userId = userResult.rows[0].id;

  // Check if webhooks already exist for this org (idempotency)
  const existingWebhooks = await client.query(
    `SELECT id, name FROM webhooks WHERE org_id = $1`,
    [orgId]
  );

  if (existingWebhooks.rows.length > 0) {
    console.log(`⚠️  Webhooks already exist for ${adminEmail} (${existingWebhooks.rows.length} found) — skipping webhook seed`);
    console.log(`   Existing webhooks: ${existingWebhooks.rows.map((r: any) => r.name).join(', ')}`);
    return existingWebhooks.rows.length;
  }

  // Generate secrets using the same method as production
  const generateSecret = () => randomBytes(32).toString('hex');

  // Define webhooks to seed
  const webhooks = [
    {
      name: 'Primary Audit Webhook',
      url: 'https://api.example.com/webhooks/audit',
      secret: generateSecret(),
      status: 'active',
      events: JSON.stringify(['audit_log.created', 'user.login', 'api_key.created']),
    },
    {
      name: 'Security Alerts',
      url: 'https://security.acme.com/events',
      secret: generateSecret(),
      status: 'active',
      events: JSON.stringify(['api_key.revoked', 'user.logout']),
    },
    {
      name: 'Legacy Integration',
      url: 'https://old.system.com/hook',
      secret: generateSecret(),
      status: 'disabled',
      events: JSON.stringify(['audit_log.created']),
    },
  ];

  const webhookIds: string[] = [];

  // Insert webhooks
  for (const webhook of webhooks) {
    const result = await client.query(
      `INSERT INTO webhooks (org_id, name, url, secret, status, events, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
       RETURNING id, name`,
      [orgId, webhook.name, webhook.url, webhook.secret, webhook.status, webhook.events]
    );
    webhookIds.push(result.rows[0].id);
    console.log(`✅ Created webhook: ${result.rows[0].name} (${result.rows[0].id})`);
  }

  // Seed webhook deliveries (only if deliveries table exists)
  await seedWebhookDeliveries(client, webhookIds);

  console.log(`✅ Created ${webhooks.length} webhooks for ${adminEmail}`);
  return webhooks.length;
}

/**
 * Seed webhook deliveries for the given webhook IDs
 * Only seeds if deliveries don't already exist (idempotent)
 */
async function seedWebhookDeliveries(
  client: Client,
  webhookIds: string[]
): Promise<void> {
  // Check if deliveries table exists and if deliveries already exist
  const existingDeliveries = await client.query(
    `SELECT COUNT(*) as count FROM webhook_deliveries WHERE webhook_id = ANY($1::uuid[])`,
    [webhookIds]
  );

  if (existingDeliveries.rows[0].count > 0) {
    console.log(`⚠️  Webhook deliveries already exist (${existingDeliveries.rows[0].count} found) — skipping delivery seed`);
    return;
  }

  console.log('\n📦 Seeding webhook deliveries...');

  const now = new Date();
  const deliveries = [];

  // Create deliveries for each webhook
  for (let i = 0; i < webhookIds.length; i++) {
    const webhookId = webhookIds[i];
    const baseTime = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000); // Stagger by days

    // Successful delivery
    deliveries.push({
      webhookId,
      payload: JSON.stringify({
        event: 'user.login',
        timestamp: baseTime.toISOString(),
        data: {
          userId: 'user-123',
          email: 'user@example.com',
          ipAddress: '192.168.1.100',
        },
      }),
      statusCode: 200,
      response: JSON.stringify({ received: true, processed: true }),
      status: 'success',
      attempts: 1,
      attemptedAt: baseTime,
      completedAt: new Date(baseTime.getTime() + 145), // 145ms latency
      error: null,
      nextRetryAt: null,
    });

    // Failed delivery (4xx)
    deliveries.push({
      webhookId,
      payload: JSON.stringify({
        event: 'payment.failed',
        timestamp: new Date(baseTime.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        data: {
          paymentId: 'pay-456',
          amount: 99.99,
          reason: 'insufficient_funds',
        },
      }),
      statusCode: 400,
      response: JSON.stringify({ error: 'Bad Request', message: 'Invalid payload format' }),
      status: 'failed',
      attempts: 3,
      attemptedAt: new Date(baseTime.getTime() - 3 * 60 * 60 * 1000),
      completedAt: new Date(baseTime.getTime() - 3 * 60 * 60 * 1000 + 2341), // 2341ms latency
      error: 'HTTP 400: Bad Request',
      nextRetryAt: null,
    });

    // Failed delivery (5xx)
    deliveries.push({
      webhookId,
      payload: JSON.stringify({
        event: 'user.login',
        timestamp: new Date(baseTime.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        data: {
          userId: 'user-789',
          email: 'another@example.com',
        },
      }),
      statusCode: 500,
      response: JSON.stringify({ error: 'Internal Server Error' }),
      status: 'failed',
      attempts: 3,
      attemptedAt: new Date(baseTime.getTime() - 6 * 60 * 60 * 1000),
      completedAt: new Date(baseTime.getTime() - 6 * 60 * 60 * 1000 + 123), // 123ms latency
      error: 'HTTP 500: Internal Server Error',
      nextRetryAt: null,
    });

    // Successful delivery with low latency
    deliveries.push({
      webhookId,
      payload: JSON.stringify({
        event: 'apikey.created',
        timestamp: new Date(baseTime.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        data: {
          apiKeyId: 'key-abc',
          name: 'New API Key',
        },
      }),
      statusCode: 200,
      response: JSON.stringify({ received: true }),
      status: 'success',
      attempts: 1,
      attemptedAt: new Date(baseTime.getTime() - 12 * 60 * 60 * 1000),
      completedAt: new Date(baseTime.getTime() - 12 * 60 * 60 * 1000 + 234), // 234ms latency
      error: null,
      nextRetryAt: null,
    });

    // Retrying delivery
    deliveries.push({
      webhookId,
      payload: JSON.stringify({
        event: 'subscription.updated',
        timestamp: new Date(baseTime.getTime() - 14 * 60 * 60 * 1000).toISOString(),
        data: {
          subscriptionId: 'sub-xyz',
          status: 'active',
        },
      }),
      statusCode: null,
      response: null,
      status: 'retrying',
      attempts: 2,
      attemptedAt: new Date(baseTime.getTime() - 14 * 60 * 60 * 1000),
      completedAt: null,
      error: 'Connection timeout',
      nextRetryAt: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutes from now
    });
  }

  // Insert deliveries
  for (const delivery of deliveries) {
    await client.query(
      `INSERT INTO webhook_deliveries (
        webhook_id, payload, status_code, response, status, attempts,
        attempted_at, completed_at, error, next_retry_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        delivery.webhookId,
        delivery.payload,
        delivery.statusCode,
        delivery.response,
        delivery.status,
        delivery.attempts,
        delivery.attemptedAt,
        delivery.completedAt,
        delivery.error,
        delivery.nextRetryAt,
      ]
    );
  }

  console.log(`✅ Created ${deliveries.length} webhook deliveries`);
}

seed();

