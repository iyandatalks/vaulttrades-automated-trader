import type { Candle, Side } from '../types';

/** UT Bot v4 translated literally: detection only, never an execution strategy. */
export interface UTBotPoint { buy:boolean; sell:boolean; longBias:boolean; shortBias:boolean; trailingStop:number; position:number; }

function rma(values:number[], length:number):number[] {
  const out:number[]=[];
  let prev:number|undefined;
  const alpha=1/length;
  for (let i=0;i<values.length;i++) {
    const v=values[i];
    if (i===0) prev=v;
    else prev = alpha*v + (1-alpha)*prev!;
    out.push(prev!);
  }
  return out;
}

function atr(c:Candle[], length:number):number[] {
  const tr=c.map((x,i)=> i===0 ? x.high-x.low : Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)));
  return rma(tr,length);
}

export function utBot(candles:Candle[], a=1, c=10):UTBotPoint[] {
  const xATR=atr(candles,c);
  const stop:number[]=[];
  const pos:number[]=[];
  const out:UTBotPoint[]=[];
  for(let i=0;i<candles.length;i++){
    const src=candles[i].close;
    const prevSrc=i>0?candles[i-1].close:src;
    const prevStop=i>0?stop[i-1]:0;
    const nLoss=a*xATR[i];
    let s:number;
    if(src>prevStop && prevSrc>prevStop) s=Math.max(prevStop,src-nLoss);
    else if(src<prevStop && prevSrc<prevStop) s=Math.min(prevStop,src+nLoss);
    else if(src>prevStop) s=src-nLoss;
    else s=src+nLoss;
    stop.push(s);
    let p:number;
    if(prevSrc<prevStop && src>prevStop) p=1;
    else if(prevSrc>prevStop && src<prevStop) p=-1;
    else p=i>0?pos[i-1]:0;
    pos.push(p);
    const above=src> s && prevSrc <= prevStop;
    const below=src< s && prevSrc >= prevStop;
    out.push({buy:src>s && above,sell:src<s && below,longBias:src>s,shortBias:src<s,trailingStop:s,position:p});
  }
  return out;
}

export function latestUTBot(candles:Candle[], a=1, c=10):UTBotPoint|null {
  if(candles.length<2) return null;
  const all=utBot(candles,a,c);
  return all.at(-1) ?? null;
}
