import type { Signal } from '../types';
export function validateSignal(s:Signal){
  if(!s.id||!s.symbol||!s.timeframe) return {valid:false,reason:'Missing identity'};
  if(!Number.isFinite(s.entry)||!Number.isFinite(s.stopLoss)||!Number.isFinite(s.takeProfit)) return {valid:false,reason:'Invalid price'};
  if(s.side==='BUY' && !(s.stopLoss<s.entry && s.takeProfit>s.entry)) return {valid:false,reason:'Invalid BUY risk geometry'};
  if(s.side==='SELL' && !(s.stopLoss>s.entry && s.takeProfit<s.entry)) return {valid:false,reason:'Invalid SELL risk geometry'};
  if(s.confidence<0||s.confidence>100) return {valid:false,reason:'Confidence outside 0-100'};
  return {valid:true as const};
}
