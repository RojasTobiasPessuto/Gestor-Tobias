import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { DebtsService } from './debts.service.js';
import { CreateDebtDto, UpdateDebtDto, PayDebtDto } from './debt.dto.js';
import { DebtType, DebtStatus } from './debt.entity.js';

@Controller('debts')
export class DebtsController {
  constructor(private readonly service: DebtsService) {}

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
