import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Account } from '../accounts/account.entity.js';

export enum TransactionType {
  INGRESO = 'INGRESO',
  GASTO = 'GASTO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  VENTA_DOLARES = 'VENTA_DOLARES',
  COMPRA_DOLARES = 'COMPRA_DOLARES',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column('decimal', { precision: 15, scale: 6 })
  amount!: number;

  @ManyToOne(() => Account, { eager: true })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @Column()
  account_id!: number;

  @ManyToOne(() => Account, { eager: true, nullable: true })
  @JoinColumn({ name: 'account_to_id' })
  accountTo!: Account | null;

  @Column({ type: 'int', nullable: true })
  account_to_id!: number | null;

  @Column({ type: 'varchar', nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', nullable: true })
  comment!: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 6, nullable: true })
  exchangeRate!: number | null;

  @Column({ type: 'date' })
  date!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
