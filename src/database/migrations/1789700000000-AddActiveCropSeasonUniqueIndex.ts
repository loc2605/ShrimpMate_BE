import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActiveCropSeasonUniqueIndex1789700000000 implements MigrationInterface {
  name = 'AddActiveCropSeasonUniqueIndex1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_crop_seasons_one_active_per_pond" ON "crop_seasons" ("pond_id") WHERE "status" = \'active\'',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "UQ_crop_seasons_one_active_per_pond"');
  }
}