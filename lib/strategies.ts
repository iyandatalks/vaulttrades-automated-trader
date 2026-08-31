import type { Candle, Side } from './types';
import { vaultFibSignal, type FibContext } from './strategies/vaultFib';
import { latestUTBot } from './strategies/utBot';

export function ema(values:number[],length:number){const k=2/(length+1);let e=values[0]??0;return values.map((v,i)=>i?(e=v*k+e*(1-k)):e);}

export interface StrategySignal { side:Side; entry:number; stopLoss:number; takeProfit:number; tp1:number; tp2:number; tp3:number; confidence:number; reason:string[]; strategy:string; quality:string; }

/**
 * UT Bot is detection/confirmation only. It cannot create a trade by itself.
 * A signal exists only when the unchanged Vault Fib sequence is confirmed by the
 * matching UT Bot direction on the final candle.
 */
export function strategySignal(c:Candle[],context:FibContext={}):StrategySignal|null{
  if(c.length<60)return null;
  const fib=vaultFibSignal(c,context);
  if(!fib)return null;
  const ut=latestUTBot(c,1,10);
  if(!ut)return null;
  const aligned=fib.side==='BUY'?ut.buy:fib.side==='SELL'?ut.sell:false;
  if(!aligned)return null;
  return {side:fib.side,entry:fib.entry,stopLoss:fib.stopLoss,takeProfit:fib.takeProfit,tp1:fib.tp1,tp2:fib.tp2,tp3:fib.tp3,confidence:fib.confidence,reason:[...fib.reason,'UT Bot confirmation',`UT Bot ${fib.side}`],strategy:'Vault Auto Fib Retrace + UT Bot Confirmation',quality:fib.quality};
}
