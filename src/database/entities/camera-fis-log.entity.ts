import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Pond } from './pond.entity';
import { Device } from './device.entity';
import { FeedingRecord } from './feeding-record.entity';
import { AppetiteLevel } from './enums';

@Entity('camera_fis_logs')
@Index('IDX_camera_fis_logs_pond_timestamp', ['pondId', 'timestamp'])
@Index('IDX_camera_fis_logs_device_timestamp', ['deviceId', 'timestamp'])
@Index('IDX_camera_fis_logs_pond_appetite', ['pondId', 'appetiteLevel'])
export class CameraFisLog {
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

  @ManyToOne(() => FeedingRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'feeding_record_id' })
  feedingRecord!: FeedingRecord | null;

  @Column({ name: 'feeding_record_id', type: 'uuid', nullable: true })
  feedingRecordId!: string | null;

  @Column({ name: 'timestamp', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  timestamp!: Date;

  // 1. Diện tích thức ăn còn lại trên sàng Rt (m2 hoặc tỉ lệ 0.0 - 1.0)
  @Column({ name: 'remaining_feed_area_rt', type: 'numeric', precision: 8, scale: 4 })
  remainingFeedAreaRt!: number;

  // 2. Tốc độ tiêu thụ thức ăn vt (delta Rt / delta t)
  @Column({ name: 'feed_consumption_velocity_vt', type: 'numeric', precision: 8, scale: 4 })
  feedConsumptionVelocityVt!: number;

  // 3. Mật độ tôm quan sát được trong ROI Dt (số lượng hoặc chỉ số mật độ)
  @Column({ name: 'shrimp_density_dt', type: 'numeric', precision: 8, scale: 4 })
  shrimpDensityDt!: number;

  // 4. Nhãn / điểm phân loại hành vi ăn tức thời Ct (0..3 hoặc phân phối xác suất)
  @Column({ name: 'behavior_classification_ct', type: 'numeric', precision: 8, scale: 4 })
  behaviorClassificationCt!: number;

  // Chuẩn hóa Min-Max
  @Column({ name: 'normalized_rt', type: 'numeric', precision: 6, scale: 4 })
  normalizedRt!: number;

  @Column({ name: 'normalized_vt', type: 'numeric', precision: 6, scale: 4 })
  normalizedVt!: number;

  @Column({ name: 'normalized_dt', type: 'numeric', precision: 6, scale: 4 })
  normalizedDt!: number;

  @Column({ name: 'normalized_ct', type: 'numeric', precision: 6, scale: 4 })
  normalizedCt!: number;

  // Tổng hợp chỉ số FIS (Feeding Intensity Score)
  @Column({ name: 'fis_score', type: 'numeric', precision: 6, scale: 4 })
  fisScore!: number;

  // 4 mức bắt mồi: 0 (không ăn), 1 (ăn yếu), 2 (ăn bình thường), 3 (ăn mạnh)
  @Column({ name: 'appetite_level', type: 'smallint', enum: AppetiteLevel })
  appetiteLevel!: AppetiteLevel;

  @Column({ name: 'confidence', type: 'numeric', precision: 5, scale: 4, nullable: true })
  confidence!: number | null;

  @Column({ name: 'frame_url', type: 'varchar', length: 500, nullable: true })
  frameUrl!: string | null;

  // Metadata lưu trữ ROI, weights [w1, w2, w3, w4], bboxes, segmentations
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
