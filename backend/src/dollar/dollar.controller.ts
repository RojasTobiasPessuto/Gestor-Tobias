import { Controller, Get } from '@nestjs/common';

const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

interface BinanceAd {
  adv: { price: string };
}

interface BinanceResponse {
  data?: BinanceAd[];
}

async function fetchBinancePrice(tradeType: 'BUY' | 'SELL'): Promise<number> {
  const body = {
    fiat: 'ARS',
    page: 1,
    rows: 5,
    tradeType,
    asset: 'USDT',
    countries: [],
    proMerchantAds: false,
    shieldMerchantAds: false,
    publisherType: null,
    payTypes: [],
  };

  const res = await fetch(BINANCE_P2P_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return 0;
  const data = (await res.json()) as BinanceResponse;
  if (!data.data || data.data.length === 0) return 0;

  // Promedio de los primeros 5 anuncios
  const prices = data.data.map((d) => parseFloat(d.adv.price)).filter((n) => !isNaN(n));
  if (prices.length === 0) return 0;
  return prices.reduce((s, p) => s + p, 0) / prices.length;
}

@Controller('dollar')
export class DollarController {
  @Get('rate')
  async getRate() {
    try {
      // En Binance P2P:
      // BUY = quien quiere comprar USDT (lo que vos pagas si vendes USDT)
      // SELL = quien quiere vender USDT (lo que vos pagas si compras USDT)
      // Para reflejar "compra/venta" del dolar:
      //   compra (te lo compran a vos) = precio BUY (mas bajo)
      //   venta (te lo venden a vos) = precio SELL (mas alto)
      const [compra, venta] = await Promise.all([
        fetchBinancePrice('BUY'),
        fetchBinancePrice('SELL'),
      ]);

      const promedio = compra && venta ? (compra + venta) / 2 : 0;
      return { compra, venta, promedio };
    } catch {
      return { compra: 0, venta: 0, promedio: 0, error: 'No se pudo obtener la cotizacion' };
    }
  }
}
