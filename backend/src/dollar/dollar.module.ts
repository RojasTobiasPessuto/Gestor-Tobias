import { Module } from '@nestjs/common';
import { DollarController } from './dollar.controller.js';

@Module({
  controllers: [DollarController],
})
export class DollarModule {}
