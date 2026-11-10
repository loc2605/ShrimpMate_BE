import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUnusedTables1790900000000 implements MigrationInterface {
  name = 'DropUnusedTables1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_pond_assignments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "camera_fis_logs" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Không cần rollback vì các tính năng này đã được loại bỏ hoàn toàn
  }
}

