import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Farm } from './farm.entity';
import { PondStatus } from './enums';

@Entity('ponds')
@Index('IDX_ponds_farm_status', ['farmId', 'status'])
export class Pond {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Farm, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farm_id' })
  farm!: Farm;

  @Column({ name: 'farm_id', type: 'uuid' })
  farmId!: string;

  @Column({ length: 50 })
  code!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ name: 'area_m2', type: 'numeric', precision: 12, scale: 2 })
  areaM2!: number;

  @Column({ type: 'enum', enum: PondStatus, default: PondStatus.ACTIVE })
  status!: PondStatus;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}