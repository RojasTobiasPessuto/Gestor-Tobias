/**
 * Parsea una fecha en formato YYYY-MM-DD como fecha local (no UTC).
 * Evita el bug de timezone donde new Date('2026-04-08') se interpreta como UTC midnight.
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
