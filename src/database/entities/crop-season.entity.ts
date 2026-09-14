import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pond } from './pond.entity';
import { CropSeasonStatus } from './enums';

@Entity('crop_seasons')
export class CropSeason {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond!: Pond;

  @Column({ name: 'pond_id', type: 'uuid' })
  pondId!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ name: 'stocking_date', type: 'date' })
  stockingDate!: string;

  @Column({ name: 'initial_count', type: 'integer' })
  initialCount!: number;

  @Column({ name: 'stocking_density', type: 'numeric', precision: 12, scale: 2 })
  stockingDensity!: number;

  @Column({ name: 'initial_average_weight_g', type: 'numeric', precision: 8, scale: 3, nullable: true })
  initialAverageWeightG!: number | null;

  @Column({ name: 'estimated_survival_rate', type: 'numeric', precision: 5, scale: 2, nullable: true })
  estimatedSurvivalRate!: number | null;

  @Column({ type: 'enum', enum: CropSeasonStatus, default: CropSeasonStatus.PLANNED })
  status!: CropSeasonStatus;
}