import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, IsArray } from 'class-validator';
import { TransactionType } from './transaction.entity.js';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsNumber()
  amount!: number;

  @IsNumber()
  account_id!: number;

  @IsNumber()
  @IsOptional()
  account_to_id?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsString()
  @IsOptional()
  comment?: string;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsDateString()
  date!: string;
}
