import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum CategoryType {
  INGRESO = 'INGRESO',
  GASTO = 'GASTO',
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: CategoryType })
  type!: CategoryType;
}
