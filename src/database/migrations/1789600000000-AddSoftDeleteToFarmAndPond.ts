import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToFarmAndPond1789600000000 implements MigrationInterface {
  name = 'AddSoftDeleteToFarmAndPond1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "farms" ADD "deleted_at" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query('ALTER TABLE "ponds" ADD "deleted_at" TIMESTAMP WITH TIME ZONE');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "ponds" DROP COLUMN "deleted_at"');
    await queryRunner.query('ALTER TABLE "farms" DROP COLUMN "deleted_at"');
  }
}