import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupportThreeRolesAndFarmerAssignments1790700000000 implements MigrationInterface {
  name = 'SupportThreeRolesAndFarmerAssignments1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Cập nhật enum role với 3 vai trò: admin, manager, farmer
    await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'manager', 'farmer')`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "role" TYPE "public"."users_role_enum" 
      USING (
        CASE 
          WHEN "role"::text = 'manager' THEN 'manager'::"public"."users_role_enum"
          WHEN "role"::text = 'admin' THEN 'admin'::"public"."users_role_enum"
          ELSE 'farmer'::"public"."users_role_enum"
        END
      )
    `);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'farmer'`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);

    // 2. Thêm trường manager_id vào users
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "manager_id" uuid`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_manager') THEN
          ALTER TABLE "users" ADD CONSTRAINT "FK_users_manager" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_manager_id" ON "users"("manager_id")`);

    // 3. Tạo bảng farmer_assignments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "farmer_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "farmer_id" uuid NOT NULL,
        "farm_id" uuid NOT NULL,
        "pond_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_farmer_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_farmer_assignments_farmer" FOREIGN KEY ("farmer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_farmer_assignments_farm" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_farmer_assignments_pond" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_farmer_assignments_farmer" ON "farmer_assignments"("farmer_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_farmer_assignments_farm" ON "farmer_assignments"("farm_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_farmer_assignments_pond" ON "farmer_assignments"("pond_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "farmer_assignments"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_manager"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_manager_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "manager_id"`);

    await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'farmer')`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "role" TYPE "public"."users_role_enum" 
      USING (
        CASE 
          WHEN "role"::text = 'admin' THEN 'admin'::"public"."users_role_enum"
          ELSE 'farmer'::"public"."users_role_enum"
        END
      )
    `);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'farmer'`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
  }
}
