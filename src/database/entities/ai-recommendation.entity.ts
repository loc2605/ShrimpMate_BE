import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pond } from './pond.entity';
import { AiRecommendationStatus, AppetiteLevel, SafetyDecision } from './enums';

@Entity('ai_recommendations')
export class AiRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond!: Pond;

  @Column({ name: 'pond_id', type: 'uuid' })
  pondId!: string;

  @Column({ name: 'model_name', length: 100 })
  modelName!: string;

  @Column({ name: 'model_version', type: 'varchar', length: 50, nullable: true })
  modelVersion!: string | null;

  @Column({ name: 'predicted_feed_amount_kg', type: 'numeric', precision: 10, scale: 3, nullable: true })
  predictedFeedAmountKg!: number | null;

  @Column({ name: 'spread_rate_kg_per_minute', type: 'numeric', precision: 10, scale: 3, nullable: true })
  spreadRateKgPerMinute!: number | null;

  @Column({ name: 'appetite_level', type: 'smallint', enum: AppetiteLevel, nullable: true })
  appetiteLevel!: AppetiteLevel | null;

  @Column({ name: 'biomass_kg', type: 'numeric', precision: 12, scale: 3, nullable: true })
  biomassKg!: number | null;

  @Column({ name: 'anomaly_score', type: 'double precision', nullable: true })
  anomalyScore!: number | null;

  @Column({ type: 'double precision', nullable: true })
  confidence!: number | null;

  @Column({ name: 'input_snapshot', type: 'jsonb' })
  inputSnapshot!: Record<string, unknown>;

  @Column({ name: 'explanation', type: 'text', nullable: true })
  explanation!: string | null;

  @Column({ name: 'safety_decision', type: 'enum', enum: SafetyDecision, nullable: true })
  safetyDecision!: SafetyDecision | null;

  @Column({ name: 'safety_reason', type: 'text', nullable: true })
  safetyReason!: string | null;

  @Column({ type: 'enum', enum: AiRecommendationStatus, default: AiRecommendationStatus.PENDING })
  status!: AiRecommendationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}