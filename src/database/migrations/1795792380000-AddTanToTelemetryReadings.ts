import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTanToTelemetryReadings1795792380000 implements MigrationInterface {
  name = 'AddTanToTelemetryReadings1795792380000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "telemetry_readings" ADD COLUMN "tan_mg_l" double precision',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "telemetry_readings" DROP COLUMN "tan_mg_l"',
    );
  }
}
