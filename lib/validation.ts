import type { Signal } from './types';

export function validateSignal(signal: Signal): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!signal.symbol) errors.push('Missing symbol');
  if (!signal.strategy) errors.push('Missing strategy');
  if (!Number.isFinite(signal.entry) || signal.entry <= 0) errors.push('Invalid entry');
  if (!Number.isFinite(signal.stopLoss) || signal.stopLoss <= 0) errors.push('Invalid stop loss');
  if (!Number.isFinite(signal.takeProfit) || signal.takeProfit <= 0) errors.push('Invalid take profit');
  if (signal.side === 'BUY' && !(signal.stopLoss < signal.entry && signal.takeProfit > signal.entry)) errors.push('BUY risk geometry invalid');
  if (signal.side === 'SELL' && !(signal.stopLoss > signal.entry && signal.takeProfit < signal.entry)) errors.push('SELL risk geometry invalid');
  if (!Number.isFinite(signal.confidence) || signal.confidence < 0 || signal.confidence > 100) errors.push('Invalid confidence');
  return { valid: errors.length === 0, errors };
}
