import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Farm } from './farm.entity';
import { PondStatus } from './enums';

@Entity('ponds')
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
}