import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerIdToFarms1790300000000 implements MigrationInterface {
  name = 'AddOwnerIdToFarms1790300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "farms" ADD "owner_id" uuid');
    await queryRunner.query('CREATE INDEX "IDX_farms_owner_id" ON "farms" ("owner_id")');
    await queryRunner.query('ALTER TABLE "farms" ADD CONSTRAINT "FK_farms_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "farms" DROP CONSTRAINT "FK_farms_owner_id"');
    await queryRunner.query('DROP INDEX "IDX_farms_owner_id"');
    await queryRunner.query('ALTER TABLE "farms" DROP COLUMN "owner_id"');
  }
}
