import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pond } from './pond.entity';
import { FeedingRecord } from './feeding-record.entity';
import { AiRecommendation } from './ai-recommendation.entity';
import { FeedbackEvaluation } from './enums';

@Entity('feeding_feedbacks')
@Index('IDX_feeding_feedbacks_pond_created', ['pondId', 'createdAt'])
@Index('IDX_feeding_feedbacks_record', ['recordId'])
export class FeedingFeedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond!: Pond;

  @Column({ name: 'pond_id', type: 'uuid' })
  pondId!: string;

  @ManyToOne(() => FeedingRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'record_id' })
  record!: FeedingRecord;

  @Column({ name: 'record_id', type: 'uuid' })
  recordId!: string;

  @ManyToOne(() => AiRecommendation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recommendation_id' })
  recommendation!: AiRecommendation | null;

  @Column({ name: 'recommendation_id', type: 'uuid', nullable: true })
  recommendationId!: string | null;

  @Column({ name: 'actual_amount_kg', type: 'numeric', precision: 10, scale: 3 })
  actualAmountKg!: number;

  @Column({ name: 'leftover_percent', type: 'numeric', precision: 5, scale: 2 })
  leftoverPercent!: number;

  @Column({ name: 'tray_inspection_minutes', type: 'integer', nullable: true })
  trayInspectionMinutes!: number | null;

  @Column({ name: 'gut_fullness_score', type: 'smallint', nullable: true })
  gutFullnessScore!: number | null;

  @Column({ name: 'effective_consumed_kg', type: 'numeric', precision: 10, scale: 3 })
  effectiveConsumedKg!: number;

  @Column({ name: 'predicted_amount_kg', type: 'numeric', precision: 10, scale: 3, nullable: true })
  predictedAmountKg!: number | null;

  @Column({ name: 'residual_kg', type: 'numeric', precision: 10, scale: 3, nullable: true })
  residualKg!: number | null;

  @Column({ type: 'varchar', length: 30, default: FeedbackEvaluation.OPTIMAL })
  evaluation!: FeedbackEvaluation;

  @Column({ name: 'recommended_adjustment_percent', type: 'numeric', precision: 5, scale: 2, nullable: true })
  recommendedAdjustmentPercent!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'features_snapshot', type: 'jsonb', default: {} })
  featuresSnapshot!: Record<string, unknown>;

  @Column({ name: 'synced_to_ai', type: 'boolean', default: false })
  syncedToAi!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
