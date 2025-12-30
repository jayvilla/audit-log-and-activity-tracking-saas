import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OrganizationEntity } from '../entities/organization.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { AuditEventEntity, ActorType } from '../entities/audit-event.entity';

// Get the DataSource from the test app if available, otherwise fall back to setup DataSource
function getDataSourceForTests(): DataSource {
  // Try to get the DataSource from the test app (set by test-app.factory)
  const appDataSource = (global as any).__TEST_APP_DATA_SOURCE__;
  if (appDataSource && appDataSource.isInitialized) {
    console.log('✅ Test helpers using app DataSource');
    return appDataSource;
  }
  // Fallback to test setup DataSource
  const { getTestDataSource } = require('./setup');
  const setupDataSource = getTestDataSource();
  if (!appDataSource) {
    console.warn('⚠️  Using setup DataSource instead of app DataSource - this may cause data visibility issues!');
  } else if (!appDataSource.isInitialized) {
    console.warn('⚠️  App DataSource exists but is not initialized - using setup DataSource');
  }
  return setupDataSource;
}

export async function createTestOrganization(
  name: string = 'Test Org',
): Promise<OrganizationEntity> {
  // Try to use the app's DataSource repository (same as services use)
  const dataSource = getDataSourceForTests();
  const orgRepo = dataSource.getRepository(OrganizationEntity);
  const org = orgRepo.create({ name, slug: name.toLowerCase().replace(/\s+/g, '-') });
  return await orgRepo.save(org);
}

export async function createTestUser(
  orgId: string,
  email: string,
  password: string = 'password123',
  role: UserRole = UserRole.USER,
): Promise<UserEntity> {
  // Always use the app's DataSource to ensure we're using the same connection
  // The key is that both test helpers and app services use the same DataSource instance
  const dataSource = getDataSourceForTests();
  const userRepo = dataSource.getRepository(UserEntity);
  const passwordHash = await bcrypt.hash(password, 10);
  const user = userRepo.create({
    orgId,
    email,
    passwordHash,
    role,
    name: email.split('@')[0],
  });
  const saved = await userRepo.save(user);
  return saved;
}

export async function createTestApiKey(
  orgId: string,
  name: string = 'Test API Key',
  apiKey?: string,
): Promise<{ entity: ApiKeyEntity; key: string }> {
  const dataSource = getDataSourceForTests();
  const apiKeyRepo = dataSource.getRepository(ApiKeyEntity);
  
  // Generate API key if not provided
  if (!apiKey) {
    apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
  }
  
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const entity = apiKeyRepo.create({
    orgId,
    name,
    keyHash,
  });
  const saved = await apiKeyRepo.save(entity);
  
  return { entity: saved, key: apiKey };
}

export async function createTestAuditEvent(
  orgId: string,
  actorType: ActorType = ActorType.USER,
  actorId?: string,
  action: string = 'test.action',
  resourceType: string = 'test',
  resourceId: string = 'test-id',
): Promise<AuditEventEntity> {
  const dataSource = getDataSourceForTests();
  const auditRepo = dataSource.getRepository(AuditEventEntity);
  const event = auditRepo.create({
    orgId,
    actorType,
    actorId: actorId || null,
    action,
    resourceType,
    resourceId,
    metadata: null,
    ipAddress: null,
    userAgent: null,
  });
  return await auditRepo.save(event);
}

