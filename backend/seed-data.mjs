import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import pg from 'pg';
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

const wb = XLSX.read(readFileSync('../Gestor.xlsx'));

function getRows(sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  return data.slice(1).filter(row => row[0] !== undefined && row[0] !== null && row[0] !== '');
}

function toDate(val) {
  if (!val) return '2025-01-01';
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    const iso = d.toISOString().slice(0, 10);
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    return '2025-01-01';
  }
  if (val instanceof Date) {
    const iso = val.toISOString().slice(0, 10);
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    return '2025-01-01';
  }
  const s = String(val).trim();
  // Try parsing as date
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const iso = d.toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  }
  return '2025-01-01';
}

async function main() {
  await client.connect();
  console.log('Conectado a la base de datos');

  // Limpiar todo
  await client.query('DELETE FROM transactions');
  await client.query('DELETE FROM accounts');
  console.log('Tablas limpiadas');

  // Crear cuentas
  const cuentas = [
    ['ARS VIRTUAL', 0, 'ARS'],
    ['ARS BILLETERA', 0, 'ARS'],
    ['USD VIRTUAL', 0, 'USD'],
    ['USD FISICO', 0, 'USD'],
    ['ME DEBEN', 0, 'USD'],
    ['AHORROS', 0, 'USD'],
  ];

  const accountMap = {};
  for (const [name, balance, currency] of cuentas) {
    const res = await client.query(
      'INSERT INTO accounts (name, balance, currency) VALUES ($1, $2, $3) RETURNING id',
      [name, balance, currency]
    );
    accountMap[name] = res.rows[0].id;
  }
  console.log('Cuentas creadas:', accountMap);

  function acctId(name) {
    if (!name) return null;
    return accountMap[String(name).trim().toUpperCase()] || null;
  }

  let total = 0, errors = 0;

  // INGRESOS
  const ingresos = getRows('INGRESOS');
  for (const [amount, cuenta, category, comment, fecha] of ingresos) {
    const id = acctId(cuenta);
    if (!id) { errors++; continue; }
    await client.query(
      `INSERT INTO transactions (type, amount, account_id, category, comment, date) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['INGRESO', Number(amount), id, category || null, comment ? String(comment).replace(/\n/g, ' ') : null, toDate(fecha)]
    );
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [Number(amount), id]);
    total++;
  }
  console.log(`INGRESOS: ${total} ok`);

  // GASTOS
  let g = 0;
  const gastos = getRows('GASTOS');
  for (const [amount, cuenta, category, comment, fecha] of gastos) {
    const id = acctId(cuenta);
    if (!id) { errors++; continue; }
    await client.query(
      `INSERT INTO transactions (type, amount, account_id, category, comment, date) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['GASTO', Number(amount), id, category || null, comment ? String(comment).replace(/\n/g, ' ') : null, toDate(fecha)]
    );
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [Number(amount), id]);
    g++;
  }
  console.log(`GASTOS: ${g} ok`);
  total += g;

  // TRANSFERENCIAS
  let t = 0;
  const transferencias = getRows('TRANSFERENCIA');
  for (const [amount, c1, c2, comment, fecha] of transferencias) {
    const from = acctId(c1), to = acctId(c2);
    if (!from || !to) { errors++; continue; }
    await client.query(
      `INSERT INTO transactions (type, amount, account_id, account_to_id, comment, date) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['TRANSFERENCIA', Number(amount), from, to, comment ? String(comment).replace(/\n/g, ' ') : null, toDate(fecha)]
    );
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [Number(amount), from]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [Number(amount), to]);
    t++;
  }
  console.log(`TRANSFERENCIAS: ${t} ok`);
  total += t;

  // VENTA DOLARES
  let v = 0;
  const ventas = getRows('VENTA DE DOLARES');
  for (const [amount, c1, c2, tasa, fecha] of ventas) {
    const from = acctId(c1), to = acctId(c2);
    if (!from || !to) { errors++; continue; }
    const converted = Number(amount) * Number(tasa);
    await client.query(
      `INSERT INTO transactions (type, amount, account_id, account_to_id, "exchangeRate", date) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['VENTA_DOLARES', Number(amount), from, to, Number(tasa), toDate(fecha)]
    );
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [Number(amount), from]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [converted, to]);
    v++;
  }
  console.log(`VENTAS USD: ${v} ok`);
  total += v;

  // COMPRA DOLARES
  let c = 0;
  const compras = getRows('COMPRA DE DOLARES');
  for (const [amount, c1, c2, tasa, fecha] of compras) {
    const from = acctId(c1), to = acctId(c2);
    if (!from || !to) { errors++; continue; }
    const dolares = Number(amount) / Number(tasa);
    await client.query(
      `INSERT INTO transactions (type, amount, account_id, account_to_id, "exchangeRate", date) VALUES ($1, $2, $3, $4, $5, $6)`,
      ['COMPRA_DOLARES', Number(amount), from, to, Number(tasa), toDate(fecha)]
    );
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [Number(amount), from]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [dolares, to]);
    c++;
  }
  console.log(`COMPRAS USD: ${c} ok`);
  total += c;

  // Resumen
  console.log(`\n=== RESUMEN ===`);
  console.log(`Total cargados: ${total}`);
  console.log(`Errores: ${errors}`);

  const saldos = await client.query('SELECT name, balance, currency FROM accounts ORDER BY id');
  console.log('\nSaldos finales:');
  for (const a of saldos.rows) {
    const sym = a.currency === 'ARS' ? '$' : 'US$';
    console.log(`  ${a.name}: ${sym}${Number(a.balance).toFixed(2)}`);
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
