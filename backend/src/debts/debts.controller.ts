import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { DebtsService } from './debts.service.js';
import {
  CreateDebtDto, UpdateDebtDto, PayDebtDto,
  CreateTemplateDto, UpdateTemplateDto, GenerateMonthDto, CreateInstallmentDto,
} from './debt.dto.js';
import { DebtType, DebtStatus } from './debt.entity.js';

@Controller('debts')
export class DebtsController {
  constructor(private readonly service: DebtsService) {}

  // ========== TEMPLATES ==========
  // Estos deben ir ANTES de los endpoints con :id para que no se interpreten mal

  @Get('templates')
  findAllTemplates(@Query('active') active?: string) {
    return this.service.findAllTemplates(active === 'true' ? true : undefined);
  }

  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateDto) {
    return this.service.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeTemplate(id);
  }

  @Post('generate-month')
  generateMonth(@Body() dto: GenerateMonthDto) {
    return this.service.generateMonthlyDebts(dto);
  }

  @Post('installments')
  createInstallment(@Body() dto: CreateInstallmentDto) {
    return this.service.createInstallmentPurchase(dto);
  }

  // ========== DEUDAS ==========

  @Get()
  findAll(@Query('type') type?: DebtType, @Query('status') status?: DebtStatus) {
    return this.service.findAll(type, status);
  }

  @Post()
  create(@Body() dto: CreateDebtDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDebtDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/pay')
  pay(@Param('id', ParseIntPipe) id: number, @Body() dto: PayDebtDto) {
    return this.service.pay(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
