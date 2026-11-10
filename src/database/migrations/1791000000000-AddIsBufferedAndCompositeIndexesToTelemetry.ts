import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsBufferedAndCompositeIndexesToTelemetry1791000000000 implements MigrationInterface {
  name = 'AddIsBufferedAndCompositeIndexesToTelemetry1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Bổ sung cột is_buffered (đánh dấu gói tin đệm gửi bù từ bộ nhớ flash/SD của thiết bị)
    await queryRunner.query(
      `ALTER TABLE "telemetry_readings" ADD COLUMN IF NOT EXISTS "is_buffered" boolean NOT NULL DEFAULT false`,
    );

    // 2. Tạo composite index tối ưu hóa truy vấn O(1) cho chuỗi thời gian (Time-series optimization)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_telemetry_pond_measured_desc" ON "telemetry_readings" ("pond_id", "measured_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_telemetry_device_measured_desc" ON "telemetry_readings" ("device_id", "measured_at" DESC)`,
    );

    // 3. Tự động chuyển đổi sang TimescaleDB Hypertable nếu extension timescaledb được cài đặt trên PostgreSQL
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
          PERFORM create_hypertable('telemetry_readings', 'measured_at', if_not_exists => TRUE, migrate_data => TRUE);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_telemetry_device_measured_desc"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_telemetry_pond_measured_desc"`);
    await queryRunner.query(`ALTER TABLE "telemetry_readings" DROP COLUMN IF EXISTS "is_buffered"`);
  }
}

