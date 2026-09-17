import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPondAssignments1789900000000 implements MigrationInterface {
  name = 'AddUserPondAssignments1789900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "user_pond_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "pond_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_user_pond_assignment" UNIQUE ("user_id", "pond_id"), CONSTRAINT "PK_user_pond_assignments" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE INDEX "IDX_user_pond_assignments_user" ON "user_pond_assignments" ("user_id")');
    await queryRunner.query('CREATE INDEX "IDX_user_pond_assignments_pond" ON "user_pond_assignments" ("pond_id")');
    await queryRunner.query('ALTER TABLE "user_pond_assignments" ADD CONSTRAINT "FK_user_pond_assignments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE "user_pond_assignments" ADD CONSTRAINT "FK_user_pond_assignments_pond" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "user_pond_assignments" DROP CONSTRAINT "FK_user_pond_assignments_pond"');
    await queryRunner.query('ALTER TABLE "user_pond_assignments" DROP CONSTRAINT "FK_user_pond_assignments_user"');
    await queryRunner.query('DROP INDEX "IDX_user_pond_assignments_pond"');
    await queryRunner.query('DROP INDEX "IDX_user_pond_assignments_user"');
    await queryRunner.query('DROP TABLE "user_pond_assignments"');
  }
}