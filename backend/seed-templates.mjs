import pg from 'pg';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '6543'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Conectado a la DB');

  // ========== 0. SCHEMA (crear si no existe) ==========
  console.log('=== Verificando schema ===');
  await client.query(`
    CREATE TABLE IF NOT EXISTS recurring_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR NOT NULL,
      person VARCHAR NOT NULL,
      "defaultAmount" DECIMAL(15,6) NOT NULL,
      currency VARCHAR NOT NULL CHECK (currency IN ('ARS','USD')),
      description VARCHAR,
      active BOOLEAN DEFAULT TRUE,
      "lastGeneratedMonth" VARCHAR,
      "createdAt" TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query(`ALTER TABLE debts ADD COLUMN IF NOT EXISTS "templateId" INT`);
  await client.query(`ALTER TABLE debts ADD COLUMN IF NOT EXISTS "installmentGroup" VARCHAR`);
  await client.query(`ALTER TABLE debts ADD COLUMN IF NOT EXISTS "installmentNumber" INT`);
  await client.query(`ALTER TABLE debts ADD COLUMN IF NOT EXISTS "installmentTotal" INT`);
  await client.query(`ALTER TABLE debts ADD COLUMN IF NOT EXISTS "installmentDescription" VARCHAR`);
  console.log('Schema OK\n');

  // ========== 1. PLANTILLAS RECURRENTES ==========
  const plantillas = [
    { name: 'Spotify',  person: 'Spotify',         amount: 5000,  currency: 'ARS', description: 'Mensualidad de Spotify' },
    { name: 'Gas',      person: 'CASA',            amount: 2000,  currency: 'ARS', description: 'Gas' },
    { name: 'Patente',  person: 'Patente',         amount: 8000,  currency: 'ARS', description: 'Patente de moto' },
    { name: 'Personal', person: 'Personal',        amount: 22300, currency: 'ARS', description: 'Personal, celular' },
    { name: 'Luz',      person: 'CASA',            amount: 20000, currency: 'ARS', description: 'Luz' },
    { name: 'Internet', person: 'CASA',            amount: 13500, currency: 'ARS', description: 'INTERNET' },
  ];

  console.log('\n=== Creando plantillas recurrentes ===');
  for (const p of plantillas) {
    // Insertar plantilla
    const ins = await client.query(
      `INSERT INTO recurring_templates (name, person, "defaultAmount", currency, description, active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [p.name, p.person, p.amount, p.currency, p.description]
    );
    const templateId = ins.rows[0].id;
    console.log(`  ${p.name} (id ${templateId}): $${p.amount}`);

    // Vincular la deuda existente del 30/04/2026 a esta plantilla
    const upd = await client.query(
      `UPDATE debts
       SET "templateId" = $1
       WHERE type = 'YO_DEBO'
         AND status = 'PENDIENTE'
         AND date = '2026-04-30'
         AND person = $2
         AND description = $3
         AND amount = $4
         AND "templateId" IS NULL
       RETURNING id`,
      [templateId, p.person, p.description, p.amount]
    );
    if (upd.rowCount > 0) {
      console.log(`    -> deuda existente vinculada (id ${upd.rows[0].id})`);
    } else {
      console.log(`    -> no se encontro deuda existente para vincular`);
    }
  }

  // ========== 2. CUOTAS ==========
  console.log('\n=== Procesando cuotas existentes ===');

  // 2.1 Camara Logi - 1/3 ya existe el 30/04, faltan 2/3 (30/05) y 3/3 (30/06)
  const camGroupId = randomUUID();
  console.log(`\nCamara Logi (group ${camGroupId}):`);

  const camUpd = await client.query(
    `UPDATE debts
     SET "installmentGroup" = $1,
         "installmentNumber" = 1,
         "installmentTotal" = 3,
         "installmentDescription" = 'Camara Logi'
     WHERE type = 'YO_DEBO'
       AND status = 'PENDIENTE'
       AND date = '2026-04-30'
       AND description = '1/3 Camara Logi'
       AND amount = 21566
       AND "installmentGroup" IS NULL
     RETURNING id`,
    [camGroupId]
  );
  if (camUpd.rowCount > 0) {
    console.log(`  Cuota 1/3 vinculada (id ${camUpd.rows[0].id})`);

    // Crear 2/3 y 3/3
    for (const [i, date] of [[2, '2026-05-30'], [3, '2026-06-30']]) {
      const r = await client.query(
        `INSERT INTO debts
          (type, person, amount, currency, description, date, status,
           "installmentGroup", "installmentNumber", "installmentTotal", "installmentDescription")
         VALUES ('YO_DEBO', 'Tarjeta Naranja', 21566, 'ARS',
                 $1, $2, 'PENDIENTE', $3, $4, 3, 'Camara Logi')
         RETURNING id`,
        [`${i}/3 Camara Logi`, date, camGroupId, i]
      );
      console.log(`  Cuota ${i}/3 creada (id ${r.rows[0].id}, fecha ${date})`);
    }
  } else {
    console.log('  No se encontro la cuota 1/3 existente');
  }

  // 2.2 SillaOffice - 1/9 ya existe el 30/04, faltan 2/9 a 9/9
  const sillaGroupId = randomUUID();
  console.log(`\nSilla Office (group ${sillaGroupId}):`);

  const sillaUpd = await client.query(
    `UPDATE debts
     SET "installmentGroup" = $1,
         "installmentNumber" = 1,
         "installmentTotal" = 9,
         "installmentDescription" = 'Silla Office'
     WHERE type = 'YO_DEBO'
       AND status = 'PENDIENTE'
       AND date = '2026-04-30'
       AND description = '1/9 Cuotas SillaOffice'
       AND amount = 84980.85
       AND "installmentGroup" IS NULL
     RETURNING id`,
    [sillaGroupId]
  );
  if (sillaUpd.rowCount > 0) {
    console.log(`  Cuota 1/9 vinculada (id ${sillaUpd.rows[0].id})`);

    // Crear 2/9 a 9/9 con fechas mensuales desde mayo
    for (let i = 2; i <= 9; i++) {
      const baseMonth = 4 + (i - 1); // i=2 -> mayo (5), i=3 -> junio (6), etc
      const year = 2026 + Math.floor((baseMonth - 1) / 12);
      const month = ((baseMonth - 1) % 12) + 1;
      const date = `${year}-${String(month).padStart(2, '0')}-30`;

      const r = await client.query(
        `INSERT INTO debts
          (type, person, amount, currency, description, date, status,
           "installmentGroup", "installmentNumber", "installmentTotal", "installmentDescription")
         VALUES ('YO_DEBO', 'Tarjeta Naranja', 84980.85, 'ARS',
                 $1, $2, 'PENDIENTE', $3, $4, 9, 'Silla Office')
         RETURNING id`,
        [`${i}/9 Cuotas SillaOffice`, date, sillaGroupId, i]
      );
      console.log(`  Cuota ${i}/9 creada (id ${r.rows[0].id}, fecha ${date})`);
    }
  } else {
    console.log('  No se encontro la cuota 1/9 existente');
  }

  // Resumen
  console.log('\n=== RESUMEN ===');
  const tpls = await client.query('SELECT COUNT(*) FROM recurring_templates');
  console.log(`Plantillas totales: ${tpls.rows[0].count}`);
  const ped = await client.query("SELECT COUNT(*) FROM debts WHERE type='YO_DEBO' AND status='PENDIENTE'");
  console.log(`Deudas YO_DEBO pendientes: ${ped.rows[0].count}`);

  await client.end();
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
