import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserRolesToAdminAndFarmer1790400000000 implements MigrationInterface {
  name = 'UpdateUserRolesToAdminAndFarmer1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'farmer')`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "role" TYPE "public"."users_role_enum" 
      USING (
        CASE 
          WHEN "role"::text IN ('manager', 'operator') THEN 'farmer'::"public"."users_role_enum"
          WHEN "role"::text = 'admin' THEN 'admin'::"public"."users_role_enum"
          ELSE 'farmer'::"public"."users_role_enum"
        END
      )
    `);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'farmer'`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'manager', 'operator')`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "role" TYPE "public"."users_role_enum" 
      USING (
        CASE 
          WHEN "role"::text = 'farmer' THEN 'operator'::"public"."users_role_enum"
          WHEN "role"::text = 'admin' THEN 'admin'::"public"."users_role_enum"
          ELSE 'operator'::"public"."users_role_enum"
        END
      )
    `);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'operator'`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
  }
}
