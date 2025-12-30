import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyPrefix1735700000000 implements MigrationInterface {
  name = 'AddApiKeyPrefix1735700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add key_prefix column to api_keys table
    await queryRunner.query(`
      ALTER TABLE "api_keys"
      ADD COLUMN "key_prefix" character varying(16)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove key_prefix column
    await queryRunner.query(`
      ALTER TABLE "api_keys"
      DROP COLUMN IF EXISTS "key_prefix"
    `);
  }
}

