import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOperationalTimestampsAndIndexes1789800000000 implements MigrationInterface {
  name = 'AddOperationalTimestampsAndIndexes1789800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "ponds" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "ponds" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "crop_seasons" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "crop_seasons" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "feeding_schedules" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "feeding_records" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "feeding_records" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()');

    await queryRunner.query('CREATE INDEX "IDX_farms_status" ON "farms" ("status")');
    await queryRunner.query('CREATE INDEX "IDX_ponds_farm_status" ON "ponds" ("farm_id", "status")');
    await queryRunner.query('CREATE INDEX "IDX_crop_seasons_pond_status" ON "crop_seasons" ("pond_id", "status")');
    await queryRunner.query('CREATE INDEX "IDX_devices_pond_status" ON "devices" ("pond_id", "status")');
    await queryRunner.query('CREATE INDEX "IDX_feeding_schedules_pond_enabled" ON "feeding_schedules" ("pond_id", "isEnabled")');
    await queryRunner.query('CREATE INDEX "IDX_feeding_records_pond_started" ON "feeding_records" ("pond_id", "started_at")');
    await queryRunner.query('CREATE INDEX "IDX_feeding_records_device_started" ON "feeding_records" ("device_id", "started_at")');
    await queryRunner.query('CREATE INDEX "IDX_feeding_records_pond_status" ON "feeding_records" ("pond_id", "status")');
    await queryRunner.query('CREATE INDEX "IDX_alerts_pond_status_triggered" ON "alerts" ("pond_id", "status", "triggered_at")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_alerts_pond_status_triggered"');
    await queryRunner.query('DROP INDEX "IDX_feeding_records_pond_status"');
    await queryRunner.query('DROP INDEX "IDX_feeding_records_device_started"');
    await queryRunner.query('DROP INDEX "IDX_feeding_records_pond_started"');
    await queryRunner.query('DROP INDEX "IDX_feeding_schedules_pond_enabled"');
    await queryRunner.query('DROP INDEX "IDX_devices_pond_status"');
    await queryRunner.query('DROP INDEX "IDX_crop_seasons_pond_status"');
    await queryRunner.query('DROP INDEX "IDX_ponds_farm_status"');
    await queryRunner.query('DROP INDEX "IDX_farms_status"');
    await queryRunner.query('ALTER TABLE "feeding_records" DROP COLUMN "updated_at"');
    await queryRunner.query('ALTER TABLE "feeding_records" DROP COLUMN "created_at"');
    await queryRunner.query('ALTER TABLE "feeding_schedules" DROP COLUMN "created_at"');
    await queryRunner.query('ALTER TABLE "crop_seasons" DROP COLUMN "updated_at"');
    await queryRunner.query('ALTER TABLE "crop_seasons" DROP COLUMN "created_at"');
    await queryRunner.query('ALTER TABLE "ponds" DROP COLUMN "updated_at"');
    await queryRunner.query('ALTER TABLE "ponds" DROP COLUMN "created_at"');
  }
}