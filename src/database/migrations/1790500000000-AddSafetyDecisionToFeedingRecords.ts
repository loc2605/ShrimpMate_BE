import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSafetyDecisionToFeedingRecords1790500000000 implements MigrationInterface {
  name = 'AddSafetyDecisionToFeedingRecords1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."feeding_records_safety_decision_enum" AS ENUM('allowed', 'adjusted', 'blocked');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );
    await queryRunner.query(
      `ALTER TABLE "feeding_records" ADD COLUMN IF NOT EXISTS "safety_decision" "public"."feeding_records_safety_decision_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feeding_records" ADD COLUMN IF NOT EXISTS "safety_reason" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "feeding_records" DROP COLUMN IF EXISTS "safety_reason"`);
    await queryRunner.query(`ALTER TABLE "feeding_records" DROP COLUMN IF EXISTS "safety_decision"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."feeding_records_safety_decision_enum"`);
  }
}
