import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCameraFisLogs1790600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'camera_fis_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'pond_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'device_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'feeding_record_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'remaining_feed_area_rt',
            type: 'numeric(8,4)',
            isNullable: false,
          },
          {
            name: 'feed_consumption_velocity_vt',
            type: 'numeric(8,4)',
            isNullable: false,
          },
          {
            name: 'shrimp_density_dt',
            type: 'numeric(8,4)',
            isNullable: false,
          },
          {
            name: 'behavior_classification_ct',
            type: 'numeric(8,4)',
            isNullable: false,
          },
          {
            name: 'normalized_rt',
            type: 'numeric(6,4)',
            isNullable: false,
          },
          {
            name: 'normalized_vt',
            type: 'numeric(6,4)',
            isNullable: false,
          },
          {
            name: 'normalized_dt',
            type: 'numeric(6,4)',
            isNullable: false,
          },
          {
            name: 'normalized_ct',
            type: 'numeric(6,4)',
            isNullable: false,
          },
          {
            name: 'fis_score',
            type: 'numeric(6,4)',
            isNullable: false,
          },
          {
            name: 'appetite_level',
            type: 'smallint',
            isNullable: false,
          },
          {
            name: 'confidence',
            type: 'numeric(5,4)',
            isNullable: true,
          },
          {
            name: 'frame_url',
            type: 'varchar(500)',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('camera_fis_logs', [
      new TableForeignKey({
        columnNames: ['pond_id'],
        referencedTableName: 'ponds',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['device_id'],
        referencedTableName: 'devices',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['feeding_record_id'],
        referencedTableName: 'feeding_records',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createIndices('camera_fis_logs', [
      new TableIndex({
        name: 'IDX_camera_fis_logs_pond_timestamp',
        columnNames: ['pond_id', 'timestamp'],
      }),
      new TableIndex({
        name: 'IDX_camera_fis_logs_device_timestamp',
        columnNames: ['device_id', 'timestamp'],
      }),
      new TableIndex({
        name: 'IDX_camera_fis_logs_pond_appetite',
        columnNames: ['pond_id', 'appetite_level'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('camera_fis_logs', true);
  }
}
