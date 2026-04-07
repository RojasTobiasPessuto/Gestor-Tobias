import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum DebtType {
  ME_DEBEN = 'ME_DEBEN',
  YO_DEBO = 'YO_DEBO',
}

export enum DebtStatus {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
}

@Entity('debts')
export class Debt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: DebtType })
  type!: DebtType;

  @Column()
  person!: string;

  @Column('decimal', { precision: 15, scale: 6 })
  amount!: number;

  @Column({ type: 'enum', enum: ['ARS', 'USD'] })
  currency!: 'ARS' | 'USD';

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'enum', enum: DebtStatus, default: DebtStatus.PENDIENTE })
  status!: DebtStatus;

  @Column({ type: 'date', nullable: true })
  paidDate!: string | null;

  @Column({ type: 'int', nullable: true })
  paidAccountId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
