import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Pond } from './pond.entity';
import { DeviceMode, DeviceStatus, DeviceType } from './enums';

@Entity('devices')
@Index('IDX_devices_pond_status', ['pondId', 'status'])
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Pond, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'pond_id' })
  pond!: Pond | null;

  @Column({ name: 'pond_id', type: 'uuid', nullable: true })
  pondId!: string | null;

  @Column({ name: 'device_uid', unique: true, length: 100 })
  deviceUid!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'enum', enum: DeviceType })
  type!: DeviceType;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.OFFLINE })
  status!: DeviceStatus;

  @Column({ type: 'enum', enum: DeviceMode, default: DeviceMode.MANUAL })
  mode!: DeviceMode;

  @Column({ name: 'firmware_version', type: 'varchar', length: 50, nullable: true })
  firmwareVersion!: string | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt!: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}