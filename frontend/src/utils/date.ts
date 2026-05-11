const BA_TZ = 'America/Argentina/Buenos_Aires';

/**
 * Parsea una fecha en formato YYYY-MM-DD como fecha local (no UTC).
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Formatea una fecha YYYY-MM-DD como dd/MM/yyyy sin conversiones de timezone.
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Devuelve la fecha actual en Buenos Aires (UTC-3) en formato YYYY-MM-DD.
 */
export function todayBA(): string {
  // en-CA formatea YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(new Date());
}

/**
 * Devuelve el mes actual en Buenos Aires en formato YYYY-MM.
 */
export function currentMonthBA(): string {
  return todayBA().slice(0, 7);
}

/**
 * Devuelve el primer dia del mes actual en Buenos Aires (YYYY-MM-01).
 */
export function firstDayOfMonthBA(): string {
  return `${currentMonthBA()}-01`;
}

/**
 * Devuelve el ultimo dia del mes actual en Buenos Aires.
 */
export function lastDayOfMonthBA(): string {
  const [y, m] = currentMonthBA().split('-').map(Number);
  // Truco: dia 0 del mes siguiente = ultimo dia del mes actual
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}
