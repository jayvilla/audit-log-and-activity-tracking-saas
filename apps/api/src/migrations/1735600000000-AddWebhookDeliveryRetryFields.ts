import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookDeliveryRetryFields1735600000000 implements MigrationInterface {
  name = 'AddWebhookDeliveryRetryFields1735600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add attempts column
    await queryRunner.query(`
      ALTER TABLE "webhook_deliveries"
      ADD COLUMN "attempts" integer NOT NULL DEFAULT 0
    `);

    // Add next_retry_at column
    await queryRunner.query(`
      ALTER TABLE "webhook_deliveries"
      ADD COLUMN "next_retry_at" TIMESTAMP
    `);

    // Create index for pending deliveries with next_retry_at
    await queryRunner.query(`
      CREATE INDEX "IDX_webhook_deliveries_pending_retry" 
      ON "webhook_deliveries" ("status", "next_retry_at")
      WHERE "status" = 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_webhook_deliveries_pending_retry"
    `);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE "webhook_deliveries"
      DROP COLUMN IF EXISTS "next_retry_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "webhook_deliveries"
      DROP COLUMN IF EXISTS "attempts"
    `);
  }
}

