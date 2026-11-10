import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenVersionAndLockoutToUsers1793000000000 implements MigrationInterface {
  name = 'AddTokenVersionAndLockoutToUsers1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "locked_until" timestamptz NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "is_admin_locked" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "is_admin_locked";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "locked_until";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "token_version";`);
  }
}

