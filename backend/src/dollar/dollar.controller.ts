import { Controller, Get } from '@nestjs/common';

@Controller('dollar')
export class DollarController {
  @Get('rate')
  async getRate() {
    try {
      const res = await fetch('https://www.infodolar.com/cotizacion-dolar-provincia-cordoba.aspx');
      const html = await res.text();

      // Extraer valores de compra/venta del dólar blue (posición 4 y 5 de colCompraVenta)
      const matches = [...html.matchAll(/class="colCompraVenta"[^>]*>([\s\S]*?)<\/td>/g)];

      const parseValue = (raw: string): number => {
        const clean = raw.replace(/<[^>]*>/g, '').replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
        return parseFloat(clean) || 0;
      };

      // Posiciones 3 y 4 (0-indexed) = Blue compra y venta
      const compra = matches[3] ? parseValue(matches[3][1]) : 0;
      const venta = matches[4] ? parseValue(matches[4][1]) : 0;
      const promedio = compra && venta ? (compra + venta) / 2 : 0;

      return { compra, venta, promedio };
    } catch {
      return { compra: 0, venta: 0, promedio: 0, error: 'No se pudo obtener la cotización' };
    }
  }
}
