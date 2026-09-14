import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Device } from './device.entity';
import { Pond } from './pond.entity';

@Entity('telemetry_readings')
@Index(['pondId', 'measuredAt'])
@Index(['deviceId', 'measuredAt'])
export class TelemetryReading {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond!: Pond;

  @Column({ name: 'pond_id', type: 'uuid' })
  pondId!: string;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'device_id' })
  device!: Device | null;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId!: string | null;

  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt!: Date;

  @Column({ name: 'ph', type: 'double precision', nullable: true })
  ph!: number | null;

  @Column({ name: 'dissolved_oxygen_mg_l', type: 'double precision', nullable: true })
  dissolvedOxygenMgL!: number | null;

  @Column({ name: 'temperature_c', type: 'double precision', nullable: true })
  temperatureC!: number | null;

  @Column({ name: 'salinity_ppt', type: 'double precision', nullable: true })
  salinityPpt!: number | null;

  @Column({ name: 'ammonia_mg_l', type: 'double precision', nullable: true })
  ammoniaMgL!: number | null;

  @Column({ name: 'turbidity_ntu', type: 'double precision', nullable: true })
  turbidityNtu!: number | null;

  @Column({ type: 'jsonb', default: {} })
  rawData!: Record<string, unknown>;
}