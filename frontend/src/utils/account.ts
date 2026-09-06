// Punto de color segun la moneda (ARS = azul, USD = verde), igual que las tarjetas del dashboard.
// Se ve igual en Windows y en el celular (a diferencia de las banderas).
export const currencyDot = (currency: 'ARS' | 'USD') => (currency === 'USD' ? '🟢' : '🔵');

// Etiqueta de la cuenta con su punto de color adelante, para usar en los selectores.
export const accountLabel = (a: { name: string; currency: 'ARS' | 'USD' }) =>
  `${currencyDot(a.currency)} ${a.name}`;
