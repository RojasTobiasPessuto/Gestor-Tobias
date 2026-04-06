import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, Currency } from '../accounts/account.entity.js';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  async onModuleInit() {
    const count = await this.accountRepo.count();
    if (count > 0) return;

    const defaults = [
      { name: 'ARS VIRTUAL', balance: 0, currency: Currency.ARS },
      { name: 'ARS BILLETERA', balance: 0, currency: Currency.ARS },
      { name: 'USD VIRTUAL', balance: 0, currency: Currency.USD },
      { name: 'USD FISICO', balance: 0, currency: Currency.USD },
      { name: 'ME DEBEN', balance: 0, currency: Currency.USD },
    ];

    await this.accountRepo.save(defaults.map((d) => this.accountRepo.create(d)));
    console.log('Cuentas iniciales creadas');
  }
}
