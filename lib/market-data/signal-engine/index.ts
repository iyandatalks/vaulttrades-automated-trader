import { candles } from '../twelve-data';
import { strategySignal } from '../../strategies';
import { config } from '../../config';
import type { Signal } from '../../types';

export async function scan():Promise<Signal[]>{
  const out:Signal[]=[];
  const [m5,m15,dxy5,dxy15]=await Promise.all([
    candles('M5',config.symbol,2500),
    candles('M15',config.symbol,1000),
    candles('M5',config.dxySymbol,2500),
    candles('M15',config.dxySymbol,1000),
  ]);
  const a=strategySignal(m5,{confirmation:m5,dxy:dxy5});
  const b=strategySignal(m15,{confirmation:m5,dxy:dxy15});
  const now=new Date().toISOString();
  if(a){
    const confirmed=!!b&&b.side===a.side;
    if(confirmed||!b){
      out.push({id:`${Date.now()}-M5`,symbol:config.symbol,strategy:a.strategy,side:a.side,timeframe:'M5',entry:a.entry,stopLoss:a.stopLoss,takeProfit:a.takeProfit,tp1:a.tp1,tp2:a.tp2,tp3:a.tp3,confidence:confirmed?Math.min(95,a.confidence+10):a.confidence,status:confirmed?'ACTIVE':'NEW',createdAt:now,source:'AUTOMATION',reason:confirmed?[...a.reason,'M15 Fib + UT Bot confirmation']:a.reason,higherTimeframeConfirmed:confirmed,quality:a.quality});
    }
  }
  if(b){
    out.push({id:`${Date.now()}-M15`,symbol:config.symbol,strategy:b.strategy,side:b.side,timeframe:'M15',entry:b.entry,stopLoss:b.stopLoss,takeProfit:b.takeProfit,tp1:b.tp1,tp2:b.tp2,tp3:b.tp3,confidence:b.confidence,status:'ACTIVE',createdAt:now,source:'AUTOMATION',reason:b.reason,higherTimeframeConfirmed:true,quality:b.quality});
  }
  return out;
}
