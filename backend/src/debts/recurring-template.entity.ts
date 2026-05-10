import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('recurring_templates')
export class RecurringTemplate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  person!: string;

  @Column('decimal', { precision: 15, scale: 6 })
  defaultAmount!: number;

  @Column({ type: 'enum', enum: ['ARS', 'USD'] })
  currency!: 'ARS' | 'USD';

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'varchar', nullable: true })
  lastGeneratedMonth!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
