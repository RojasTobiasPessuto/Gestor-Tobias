import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsIn, IsArray } from 'class-validator';
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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsNumber()
  @IsOptional()
  source_account_id?: number;
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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsNumber()
  @IsOptional()
  source_account_id?: number | null;
}

export class PayDebtDto {
  @IsNumber()
  account_id!: number;

  @IsDateString()
  @IsOptional()
  paidDate?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;
}

export class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsString()
  person!: string;

  @IsNumber()
  defaultAmount!: number;

  @IsIn(['ARS', 'USD'])
  currency!: 'ARS' | 'USD';

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];
}

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  person?: string;

  @IsNumber()
  @IsOptional()
  defaultAmount?: number;

  @IsIn(['ARS', 'USD'])
  @IsOptional()
  currency?: 'ARS' | 'USD';

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  active?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];
}

export class GenerateMonthItemDto {
  @IsNumber()
  templateId!: number;

  @IsNumber()
  amount!: number;
}

export class GenerateMonthDto {
  @IsString()
  month!: string; // YYYY-MM

  @IsDateString()
  date!: string; // YYYY-MM-DD

  @IsOptional()
  items?: GenerateMonthItemDto[];
}

export class CreateInstallmentDto {
  @IsString()
  description!: string;

  @IsString()
  person!: string;

  @IsNumber()
  totalAmount!: number;

  @IsNumber()
  installments!: number;

  @IsIn(['ARS', 'USD'])
  currency!: 'ARS' | 'USD';

  @IsDateString()
  firstDate!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];
}
