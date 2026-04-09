import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { CreateAccountDto, UpdateAccountDto } from './account.dto.js';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAccountDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/adjust')
  adjust(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { balance: number; comment?: string },
  ) {
    return this.service.adjustBalance(id, body.balance, body.comment);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
