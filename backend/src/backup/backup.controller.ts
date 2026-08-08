import { Controller, Get, Post, Body } from '@nestjs/common';
import { BackupService } from './backup.service.js';

@Controller('backup')
export class BackupController {
  constructor(private readonly service: BackupService) {}

  @Get()
  export() {
    return this.service.export();
  }

  @Post('restore')
  restore(@Body() data: unknown) {
    return this.service.restore(data);
  }
}
