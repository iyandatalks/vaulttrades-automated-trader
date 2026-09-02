import { config } from '../config';
import type { ExecutionRequest, ExecutionResult } from '../types';
import type { ExecutionAdapter } from './adapter';

const base = 'https://api.api2trade.com';

export class Api2TradeAdapter implements ExecutionAdapter {
  name = 'API2Trade';

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    if (!config.api2TradeApiKey || !config.api2TradeAccountId) {
      return { accepted: false, message: 'API2Trade is not configured' };
    }

    const s = request.signal;
    const params = new URLSearchParams({
      id: config.api2TradeAccountId,
      symbol: s.symbol,
      operation: s.side === 'BUY' ? 'Buy' : 'Sell',
      volume: String(config.api2TradeDefaultVolume),
      stoploss: String(s.stopLoss),
      takeprofit: String(s.takeProfit),
      comment: `VaultTrades ${s.strategy} ${s.timeframe}`,
      expertID: String(config.api2TradeExpertId),
      placedType: 'Signal',
    });

    const response = await fetch(`${base}/OrderSend?${params.toString()}`, {
      method: 'GET',
      headers: { 'x-api-key': config.api2TradeApiKey },
      cache: 'no-store',
    });

    const text = await response.text();
    return {
      accepted: response.ok,
      externalId: response.ok ? extractId(text) : undefined,
      message: text || response.statusText,
    };
  }
}

function extractId(text: string): string | undefined {
  try {
    const body = JSON.parse(text) as { id?: string | number; ticket?: string | number; order?: string | number };
    const value = body.id ?? body.ticket ?? body.order;
    return value === undefined ? undefined : String(value);
  } catch {
    return undefined;
  }
}
