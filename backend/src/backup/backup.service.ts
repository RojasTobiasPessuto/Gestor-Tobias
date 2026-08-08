import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

// Orden de tablas: para borrar respetamos las FK (transactions -> accounts),
// para insertar primero las cuentas/categorias y despues el resto.
const TABLES = ['accounts', 'categories', 'transactions', 'debts', 'recurring_templates'] as const;

// Mapea nombre de tabla -> clave en el JSON del backup
const KEY: Record<(typeof TABLES)[number], string> = {
  accounts: 'accounts',
  categories: 'categories',
  transactions: 'transactions',
  debts: 'debts',
  recurring_templates: 'recurringTemplates',
};

@Injectable()
export class BackupService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Exporta TODA la base como un objeto JSON re-importable.
  async export() {
    const [accounts, categories, transactions, debts, recurringTemplates] = await Promise.all([
      this.dataSource.query('SELECT * FROM accounts ORDER BY id'),
      this.dataSource.query('SELECT * FROM categories ORDER BY id'),
      this.dataSource.query('SELECT * FROM transactions ORDER BY id'),
      this.dataSource.query('SELECT * FROM debts ORDER BY id'),
      this.dataSource.query('SELECT * FROM recurring_templates ORDER BY id'),
    ]);
    return {
      version: 1,
      app: 'gestor',
      exportedAt: new Date().toISOString(),
      accounts,
      categories,
      transactions,
      debts,
      recurringTemplates,
    };
  }

  // Restaura la base COMPLETA desde un backup: borra todo y reinserta.
  // Todo dentro de una transaccion: si algo falla, no se pierde nada.
  async restore(data: unknown) {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Backup invalido');
    }
    const d = data as Record<string, unknown>;
    for (const table of TABLES) {
      if (!Array.isArray(d[KEY[table]])) {
        throw new BadRequestException(`Backup invalido: falta "${KEY[table]}"`);
      }
    }

    return this.dataSource.transaction(async (manager) => {
      // Borrar respetando FKs
      await manager.query('DELETE FROM transactions');
      await manager.query('DELETE FROM debts');
      await manager.query('DELETE FROM recurring_templates');
      await manager.query('DELETE FROM accounts');
      await manager.query('DELETE FROM categories');

      // Insertar (cuentas y categorias primero por las FKs de transactions)
      await this.insertRows(manager, 'accounts', d[KEY['accounts']] as Record<string, unknown>[]);
      await this.insertRows(manager, 'categories', d[KEY['categories']] as Record<string, unknown>[]);
      await this.insertRows(manager, 'transactions', d[KEY['transactions']] as Record<string, unknown>[]);
      await this.insertRows(manager, 'debts', d[KEY['debts']] as Record<string, unknown>[]);
      await this.insertRows(manager, 'recurring_templates', d[KEY['recurring_templates']] as Record<string, unknown>[]);

      // Resetear las secuencias de id para que los proximos inserts no choquen
      for (const table of TABLES) {
        try {
          await manager.query(
            `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`,
          );
        } catch {
          // si la tabla usa identity en vez de secuencia, lo ignoramos
        }
      }

      return {
        restored: {
          accounts: (d[KEY['accounts']] as unknown[]).length,
          categories: (d[KEY['categories']] as unknown[]).length,
          transactions: (d[KEY['transactions']] as unknown[]).length,
          debts: (d[KEY['debts']] as unknown[]).length,
          recurringTemplates: (d[KEY['recurring_templates']] as unknown[]).length,
        },
      };
    });
  }

  // Inserta filas en lotes usando las columnas de la primera fila.
  private async insertRows(manager: EntityManager, table: string, rows: Record<string, unknown>[]) {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `"${c}"`).join(', ');
    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const params: unknown[] = [];
      const tuples = chunk.map((row) => {
        const ph = cols.map((c) => {
          params.push(row[c] ?? null);
          return `$${params.length}`;
        });
        return `(${ph.join(', ')})`;
      });
      await manager.query(`INSERT INTO "${table}" (${colList}) VALUES ${tuples.join(', ')}`, params);
    }
  }
}
