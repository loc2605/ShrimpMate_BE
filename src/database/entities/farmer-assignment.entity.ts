import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Farm } from './farm.entity';
import { Pond } from './pond.entity';

@Entity('farmer_assignments')
@Index('IDX_farmer_assignments_farmer', ['farmerId'])
@Index('IDX_farmer_assignments_farm', ['farmId'])
@Index('IDX_farmer_assignments_pond', ['pondId'])
export class FarmerAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmer_id' })
  farmer!: User;

  @Column({ name: 'farm_id', type: 'uuid' })
  farmId!: string;

  @ManyToOne(() => Farm, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farm_id' })
  farm!: Farm;

  @Column({ name: 'pond_id', type: 'uuid', nullable: true })
  pondId!: string | null;

  @ManyToOne(() => Pond, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'pond_id' })
  pond!: Pond | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
