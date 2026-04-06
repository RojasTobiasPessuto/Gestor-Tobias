import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { Currency } from './account.entity.js';

export class CreateAccountDto {
  @IsString()
  name!: string;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsEnum(Currency)
  currency!: Currency;
}

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  balance?: number;
}
