import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum Currency {
  ARS = 'ARS',
  USD = 'USD',
}

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column('decimal', { precision: 15, scale: 6, default: 0 })
  balance!: number;

  @Column({ type: 'enum', enum: Currency })
  currency!: Currency;
}
