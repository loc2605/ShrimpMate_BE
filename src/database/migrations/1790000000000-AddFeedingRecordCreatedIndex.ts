import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedingRecordCreatedIndex1790000000000 implements MigrationInterface {
  name = 'AddFeedingRecordCreatedIndex1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX "IDX_feeding_records_pond_created" ON "feeding_records" ("pond_id", "created_at")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_feeding_records_pond_created"');
  }
}