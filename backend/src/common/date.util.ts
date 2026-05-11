const BA_TZ = 'America/Argentina/Buenos_Aires';

/**
 * Devuelve la fecha actual en Buenos Aires (UTC-3) en formato YYYY-MM-DD.
 */
export function todayBA(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(new Date());
}
