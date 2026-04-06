import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, Currency } from '../accounts/account.entity.js';
import { Category, CategoryType } from '../categories/category.entity.js';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async onModuleInit() {
    const acctCount = await this.accountRepo.count();
    if (acctCount === 0) {
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

    const catCount = await this.categoryRepo.count();
    if (catCount === 0) {
      const I = CategoryType.INGRESO;
      const G = CategoryType.GASTO;

      const cats = [
        // Categorias de INGRESO
        { name: 'SALARIO', type: I },
        { name: 'VIDEO', type: I },
        { name: 'FOTOS', type: I },
        { name: 'EDICION', type: I },
        { name: 'VIDEO, EDICION', type: I },
        { name: 'EDICION, VIDEO', type: I },
        { name: 'FOTOS, VIDEO', type: I },
        { name: 'FOTOS, VIDEO, ME DEBE', type: I },
        { name: 'NARANJA', type: I },
        { name: 'PROGRESAR', type: I },
        { name: 'VENTA', type: I },
        { name: 'ME DEBE', type: I },
        { name: 'REGALO', type: I },
        { name: 'NOSE', type: I },

        // Categorias de GASTO
        { name: 'ALQUILER', type: G },
        { name: 'INTERNET', type: G },
        { name: 'ALIMENTACION', type: G },
        { name: 'ROPA', type: G },
        { name: 'GYM', type: G },
        { name: 'PELUQUERIA', type: G },
        { name: 'TRANSPORTE', type: G },
        { name: 'NAFTA', type: G },
        { name: 'MOTO', type: G },
        { name: 'SALUD', type: G },
        { name: 'LIMPIEZA', type: G },
        { name: 'MASCOTA', type: G },
        { name: 'GASTOS DE LA CASA', type: G },
        { name: 'ARREGLOS', type: G },
        { name: 'COSAS NECESARIAS', type: G },
        { name: 'UNI', type: G },
        { name: 'TARJETA', type: G },
        { name: 'SALIDA', type: G },
        { name: 'SALIDA / JUNTADA', type: G },
        { name: 'BOLUDECES', type: G },
        { name: 'PRESTAMO', type: G },
        { name: 'PERDIDO', type: G },
        { name: 'REGALO', type: G },
        { name: 'NOSE', type: G },
      ];
      await this.categoryRepo.save(cats.map((c) => this.categoryRepo.create(c)));
      console.log('Categorias iniciales creadas');
    }
  }
}
