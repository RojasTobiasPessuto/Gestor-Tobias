import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { CreateTransactionDto } from './transaction.dto.js';
import { TransactionType } from './transaction.entity.js';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  findAll(
    @Query('type') type?: TransactionType,
    @Query('categories') categories?: string | string[],
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    let cats: string[] | undefined;
    if (categories) {
      cats = Array.isArray(categories) ? categories : categories.split(',').filter(Boolean);
    }
    return this.service.findAll(type, cats, desde, hasta);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTransactionDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateTransactionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
