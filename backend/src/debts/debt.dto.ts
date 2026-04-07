import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsIn } from 'class-validator';
import { DebtType } from './debt.entity.js';

export class CreateDebtDto {
  @IsEnum(DebtType)
  type!: DebtType;

  @IsString()
  person!: string;

  @IsNumber()
  amount!: number;

  @IsIn(['ARS', 'USD'])
  currency!: 'ARS' | 'USD';

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  date!: string;
}

export class UpdateDebtDto {
  @IsString()
  @IsOptional()
  person?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsIn(['ARS', 'USD'])
  @IsOptional()
  currency?: 'ARS' | 'USD';

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string;
}

export class PayDebtDto {
  @IsNumber()
  account_id!: number;

  @IsDateString()
  @IsOptional()
  paidDate?: string;
}
