import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('safety_rules')
export class SafetyRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 100 })
  code!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'integer', default: 100 })
  priority!: number;

  @Column({ default: true })
  isEnabled!: boolean;

  @Column({ type: 'jsonb' })
  condition!: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  action!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}