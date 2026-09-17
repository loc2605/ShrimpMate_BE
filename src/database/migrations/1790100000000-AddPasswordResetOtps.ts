import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetOtps1790100000000 implements MigrationInterface {
  name = 'AddPasswordResetOtps1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_reset_otps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "otp_hash" character varying(255) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_otps" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_password_reset_otps_user_created" ON "password_reset_otps" ("user_id", "created_at")',
    );
    await queryRunner.query(
      'ALTER TABLE "password_reset_otps" ADD CONSTRAINT "FK_password_reset_otps_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "password_reset_otps" DROP CONSTRAINT "FK_password_reset_otps_user"');
    await queryRunner.query('DROP INDEX "IDX_password_reset_otps_user_created"');
    await queryRunner.query('DROP TABLE "password_reset_otps"');
  }
}
