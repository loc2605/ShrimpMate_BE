import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Pond } from './pond.entity';

@Entity('feeding_schedules')
export class FeedingSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pond_id' })
  pond!: Pond;

  @Column({ name: 'pond_id', type: 'uuid' })
  pondId!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ name: 'time_of_day', type: 'time' })
  timeOfDay!: string;

  @Column({ name: 'feed_amount_kg', type: 'numeric', precision: 10, scale: 3 })
  feedAmountKg!: number;

  @Column({ name: 'spread_rate_kg_per_minute', type: 'numeric', precision: 10, scale: 3, nullable: true })
  spreadRateKgPerMinute!: number | null;

  @Column({ name: 'days_of_week', type: 'smallint', array: true, default: '{}' })
  daysOfWeek!: number[];

  @Column({ default: true })
  isEnabled!: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}