import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './account.entity.js';
import { CreateAccountDto, UpdateAccountDto } from './account.dto.js';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
  ) {}

  findAll(): Promise<Account[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Account> {
    const account = await this.repo.findOneBy({ id });
    if (!account) throw new NotFoundException(`Cuenta #${id} no encontrada`);
    return account;
  }

  create(dto: CreateAccountDto): Promise<Account> {
    const account = this.repo.create({ ...dto, balance: dto.balance ?? 0 });
    return this.repo.save(account);
  }

  async update(id: number, dto: UpdateAccountDto): Promise<Account> {
    const account = await this.findOne(id);
    Object.assign(account, dto);
    return this.repo.save(account);
  }

  async remove(id: number): Promise<void> {
    const account = await this.findOne(id);
    await this.repo.remove(account);
  }
}
