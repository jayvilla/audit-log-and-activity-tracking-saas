import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavedViews1735800000000 implements MigrationInterface {
  name = 'AddSavedViews1735800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create saved_views table
    await queryRunner.query(`
      CREATE TABLE "saved_views" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "org_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "filters" jsonb NOT NULL,
        "last_used_at" TIMESTAMP,
        "use_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_views" PRIMARY KEY ("id"),
        CONSTRAINT "FK_saved_views_org" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // Create index for saved_views
    await queryRunner.query(`
      CREATE INDEX "IDX_saved_views_org_created" ON "saved_views" ("org_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_saved_views_org_created"
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "saved_views"
    `);
  }
}

