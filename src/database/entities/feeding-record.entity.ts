import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Device } from './device.entity';
import { FeedingSchedule } from './feeding-schedule.entity';
import { Pond } from './pond.entity';
import { AppetiteLevel, FeedingSource, FeedingStatus } from './enums';

@Entity('feeding_records')
export class FeedingRecord {
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

  @ManyToOne(() => FeedingSchedule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schedule_id' })
  schedule!: FeedingSchedule | null;

  @Column({ name: 'schedule_id', type: 'uuid', nullable: true })
  scheduleId!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ name: 'requested_amount_kg', type: 'numeric', precision: 10, scale: 3 })
  requestedAmountKg!: number;

  @Column({ name: 'actual_amount_kg', type: 'numeric', precision: 10, scale: 3, nullable: true })
  actualAmountKg!: number | null;

  @Column({ type: 'enum', enum: FeedingSource })
  source!: FeedingSource;

  @Column({ type: 'enum', enum: FeedingStatus, default: FeedingStatus.REQUESTED })
  status!: FeedingStatus;

  @Column({ name: 'appetite_level', type: 'smallint', enum: AppetiteLevel, nullable: true })
  appetiteLevel!: AppetiteLevel | null;

  @Column({ name: 'leftover_percent', type: 'numeric', precision: 5, scale: 2, nullable: true })
  leftoverPercent!: number | null;

  @Column({ name: 'stopped_reason', type: 'text', nullable: true })
  stoppedReason!: string | null;
}