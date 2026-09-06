// Bandera segun la moneda de la cuenta (ARS = Argentina, USD = Estados Unidos)
export const currencyFlag = (currency: 'ARS' | 'USD') => (currency === 'USD' ? '🇺🇸' : '🇦🇷');

// Etiqueta de la cuenta con su bandera adelante, para usar en los selectores
export const accountLabel = (a: { name: string; currency: 'ARS' | 'USD' }) =>
  `${currencyFlag(a.currency)} ${a.name}`;
