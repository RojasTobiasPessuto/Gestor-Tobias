import { Controller, Get, Post, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { CreateTransactionDto } from './transaction.dto.js';
import { TransactionType } from './transaction.entity.js';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  findAll(@Query('type') type?: TransactionType) {
    return this.service.findAll(type);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTransactionDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
