import type { Candle, Side } from '../types';

export const FIB = {
  early:61.8, preferred:68.1, second:78.6, last:88.0, stop:125.0,
  tp1:38.2, tp2:0.0, tp3:-23.6, minConfluence:60,
  entryAtrLength:14, displacementATR:0.60, retestBars:8, pivotLen:5,
  asia:'0000-0600', london:'0700-1000', ny:'1230-1700'
} as const;

export interface FibSignal {
  side:Side; entry:number; stopLoss:number; takeProfit:number;
  tp1:number; tp2:number; tp3:number; confidence:number; quality:string;
  reason:string[]; state:string; orderBar:number; pullbackBar:number;
}

export interface FibContext { dxy?:Candle[]; confirmation?:Candle[]; }

function rma(values:number[],length:number):number[]{ const out:number[]=[]; let prev=values[0]??0; for(let i=0;i<values.length;i++){ if(i===0) prev=values[i]; else prev=(prev*(length-1)+values[i])/length; out.push(prev); } return out; }
function atr(c:Candle[],length:number):number[]{ const tr=c.map((x,i)=>i===0?x.high-x.low:Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close))); return rma(tr,length); }
function ema(values:number[],length:number):number[]{ const k=2/(length+1); let e=values[0]??0; return values.map((v,i)=>i?(e=v*k+e*(1-k)):e); }
function buyLevel(top:number,bot:number,pct:number){ return top-((top-bot)*pct/100); }
function sellLevel(top:number,bot:number,pct:number){ return bot+((top-bot)*pct/100); }
function session(ts:number, spec:string){ const d=new Date(ts); const mins=d.getUTCHours()*60+d.getUTCMinutes(); const [a,b]=spec.split('-').map(x=>Number(x.slice(0,2))*60+Number(x.slice(2))); return a<=b?mins>=a&&mins<b:mins>=a||mins<b; }
function dayKey(ts:number){ const d=new Date(ts); return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`; }
function weekKey(ts:number){ const d=new Date(ts); const day=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()-day+1); return dayKey(d.getTime()); }

function previousExtremes(c:Candle[]){
  const days=new Map<string,Candle[]>(), weeks=new Map<string,Candle[]>();
  for(const x of c){ const dk=dayKey(x.time), wk=weekKey(x.time); if(!days.has(dk))days.set(dk,[]); if(!weeks.has(wk))weeks.set(wk,[]); days.get(dk)!.push(x); weeks.get(wk)!.push(x); }
  const keys=[...days.keys()]; const wk=[...weeks.keys()]; const lastDay=keys.at(-2); const lastWeek=wk.at(-2);
  const dc=lastDay?days.get(lastDay)!:[]; const wc=lastWeek?weeks.get(lastWeek)!:[];
  return {pdHigh:dc.length?Math.max(...dc.map(x=>x.high)):NaN,pdLow:dc.length?Math.min(...dc.map(x=>x.low)):NaN,pwHigh:wc.length?Math.max(...wc.map(x=>x.high)):NaN,pwLow:wc.length?Math.min(...wc.map(x=>x.low)):NaN};
}

function sessionExtremes(c:Candle[],spec:string){
  let hi=NaN,lo=NaN;
  for(const x of c) if(session(x.time,spec)){ hi=Number.isFinite(hi)?Math.max(hi,x.high):x.high; lo=Number.isFinite(lo)?Math.min(lo,x.low):x.low; }
  return {hi,lo};
}

function pivots(c:Candle[],len:number){
  let high=NaN,low=NaN;
  for(let i=len;i<c.length-len;i++){
    let ph=true,pl=true; for(let j=1;j<=len;j++){ if(c[i].high<=c[i-j].high||c[i].high<c[i+j].high) ph=false; if(c[i].low>=c[i-j].low||c[i].low>c[i+j].low) pl=false; }
    if(ph) high=c[i].high; if(pl) low=c[i].low;
  }
  return {high,low};
}

function confluence(c:Candle[],dxy:Candle[]|undefined,top:number,bot:number){
  const last=c.at(-1)!, prev=c.at(-2)!; const mid=(top+bot)/2; let buy=0,sell=0;
  const d=dxy?.at(-1),dp=dxy?.at(-2); const dBear=!!d&&!!dp&&d.close<dp.close,dBull=!!d&&!!dp&&d.close>dp.close;
  const dAtr=dxy&&dxy.length>=20?dxy.slice(-20).map(x=>x.volume).reduce((a,b)=>a+b,0)/20:NaN; const dVolSpike=!!d&&Number.isFinite(dAtr)&&d.volume>dAtr*1.5;
  const pd=previousExtremes(c); const pdl=Number.isFinite(pd.pdLow)&&last.low<pd.pdLow&&last.close>pd.pdLow; const pdh=Number.isFinite(pd.pdHigh)&&last.high>pd.pdHigh&&last.close<pd.pdHigh;
  const dMa=dxy&&dxy.length>=50?ema(dxy.map(x=>x.close),50).at(-1):NaN; const dAbove=!!d&&Number.isFinite(dMa)&&d.close>dMa,dBelow=!!d&&Number.isFinite(dMa)&&d.close<dMa;
  const dBearMa=dBear&&dBelow,dBullMa=dBull&&dAbove;
  const buyFlip=last.close>=mid,sellFlip=last.close<=mid;
  buy+=(buyFlip?20:0)+(dBear?15:0)+(dBearMa?10:0)+(dVolSpike?10:0)+(pdl?15:0)+(last.close>=mid?20:0);
  sell+=(sellFlip?20:0)+(dBull?15:0)+(dBullMa?10:0)+(dVolSpike?10:0)+(pdh?15:0)+(last.close<=mid?20:0);
  return {buy:Math.min(buy,100),sell:Math.min(sell,100),dBear,dBull,pdl,pdh};
}

/** Exact calculation/sequence represented by the supplied Vault Auto Fib Pine source. Drawing/table code is intentionally UI-only and is not used by the scanner. */
export function vaultFibSignal(c:Candle[],ctx:FibContext={}):FibSignal|null{
  if(c.length<30)return null;
  const buyS=sessionExtremes(c,FIB.asia), london=sessionExtremes(c,FIB.london), ny=sessionExtremes(c,FIB.ny), prev=previousExtremes(c), pv=pivots(c,FIB.pivotLen);
  const buyStart=buyS.lo,buyEnd=buyS.hi,sellStart=sellS(c,buyS,london,ny,prev,pv).start,sellEnd=sellS(c,buyS,london,ny,prev,pv).end;
  const result: FibSignal[]=[]; const a=atr(c,FIB.entryAtrLength);
  let bullState=0,bearState=0,bullOrder=-1,bearOrder=-1,bullPull=-1,bearPull=-1,bullFib=NaN,bearFib=NaN,bullQ='',bearQ='';
  for(let i=1;i<c.length;i++){
    const x=c[i],p=c[i-1];
    const bReady=Number.isFinite(buyStart)&&Number.isFinite(buyEnd)&&Math.abs(buyStart-buyEnd)>1e-12;
    const sReady=Number.isFinite(sellStart)&&Number.isFinite(sellEnd)&&Math.abs(sellStart-sellEnd)>1e-12;
    const bt=bReady?Math.max(buyStart,buyEnd):NaN,bb=bReady?Math.min(buyStart,buyEnd):NaN,st=sReady?Math.max(sellStart,sellEnd):NaN,sb=sReady?Math.min(sellStart,sellEnd):NaN;
    const bmid=bReady?(bt+bb)/2:NaN,smid=sReady?(st+sb)/2:NaN;
    const d=ctx.dxy?.filter(z=>z.time<=x.time).at(-1),dp=ctx.dxy?.filter(z=>z.time<x.time).at(-2); const dBear=!!d&&!!dp&&d.close<dp.close,dBull=!!d&&!!dp&&d.close>dp.close;
    const bc=bReady&&x.close>=bmid?20:0,sc=sReady&&x.close<=smid?20:0;
    const pdLow=prev.pdLow,pdHigh=prev.pdHigh; const pdl=Number.isFinite(pdLow)&&x.low<pdLow&&x.close>pdLow,pdh=Number.isFinite(pdHigh)&&x.high>pdHigh&&x.close<pdHigh;
    const bullConf=bc+(dBear?15:0)+(pdl?15:0),sellConf=sc+(dBull?15:0)+(pdh?15:0);
    const bullOrder=bReady&&x.close>=bmid&&p.close<p.open&&x.close>p.high&&(x.close-x.open)>=a[i]*0.5;
    const bearOrder=sReady&&x.close<=smid&&p.close>p.open&&x.close<p.low&&(x.open-x.close)>=a[i]*0.5;
    if(bullOrder){bullState=1;bullOrder=i;bullPull=-1;bullFib=NaN;bullQ='';bearState=0;bearFib=NaN;bearQ='';}
    if(bearOrder){bearState=1;bearOrder=i;bearPull=-1;bearFib=NaN;bearQ='';bullState=0;bullFib=NaN;bullQ='';}
    if(bullState===1){ if(x.low<=buyLevel(bt,bb,FIB.preferred)){bullState=2;bullPull=i;bullFib=buyLevel(bt,bb,FIB.preferred);bullQ='68.1% PREFERRED';} else if(x.low<=buyLevel(bt,bb,FIB.second)){bullState=2;bullPull=i;bullFib=buyLevel(bt,bb,FIB.second);bullQ='78.6% SECOND';} else if(x.low<=buyLevel(bt,bb,FIB.last)){bullState=2;bullPull=i;bullFib=buyLevel(bt,bb,FIB.last);bullQ='88% LAST RESORT';} }
    if(bearState===1){ if(x.high>=sellLevel(st,sb,FIB.preferred)){bearState=2;bearPull=i;bearFib=sellLevel(st,sb,FIB.preferred);bearQ='68.1% PREFERRED';} else if(x.high>=sellLevel(st,sb,FIB.second)){bearState=2;bearPull=i;bearFib=sellLevel(st,sb,FIB.second);bearQ='78.6% SECOND';} else if(x.high>=sellLevel(st,sb,FIB.last)){bearState=2;bearPull=i;bearFib=sellLevel(st,sb,FIB.last);bearQ='88% LAST RESORT';} }
    if(bullState>=2&&i-bullPull>FIB.retestBars){bullState=0;bullFib=NaN;bullQ='';}
    if(bearState>=2&&i-bearPull>FIB.retestBars){bearState=0;bearFib=NaN;bearQ='';}
    const bullRet=bullState===2&&x.low<=bullFib&&x.close>bullFib, bearRet=bearState===2&&x.high>=bearFib&&x.close<bearFib;
    if(bullRet&&x.close>x.open&&x.close>p.high)bullState=3;
    if(bearRet&&x.close<x.open&&x.close<p.low)bearState=3;
    const m5=ctx.confirmation?.filter(z=>z.time<=x.time).at(-1),m5p=ctx.confirmation?.filter(z=>z.time<x.time).at(-1); const m5a=ctx.confirmation?atr(ctx.confirmation,FIB.entryAtrLength).at(-1):NaN;
    const m5Bull=!!m5&&!!m5p&&Number.isFinite(m5a)&&m5.close>m5.open&&(m5.close-m5.open)>=m5a*FIB.displacementATR&&m5.close>m5p.high;
    const m5Bear=!!m5&&!!m5p&&Number.isFinite(m5a)&&(m5.close<m5.open)&&(m5.open-m5.close)>=m5a*FIB.displacementATR&&m5.close<m5p.low;
    if(bullState===3&&m5Bull&&bullConf>=FIB.minConfluence){ const entry=bullFib,sl=buyLevel(bt,bb,FIB.stop),t1=buyLevel(bt,bb,FIB.tp1),t2=buyLevel(bt,bb,FIB.tp2),t3=buyLevel(bt,bb,FIB.tp3); result.push({side:'BUY',entry,stopLoss:sl,takeProfit:t3,tp1:t1,tp2:t2,tp3:t3,confidence:bullConf,quality:bullQ,reason:['Institutional order','Fib pullback','Fib retest','Candle confirmation','M5 bullish displacement',`Fib confluence ${bullConf}/100`],state:'CONFIRMED',orderBar:bullOrder,pullbackBar:bullPull}); bullState=4; }
    if(bearState===3&&m5Bear&&sellConf>=FIB.minConfluence){ const entry=bearFib,sl=sellLevel(st,sb,FIB.stop),t1=sellLevel(st,sb,FIB.tp1),t2=sellLevel(st,sb,FIB.tp2),t3=sellLevel(st,sb,FIB.tp3); result.push({side:'SELL',entry,stopLoss:sl,takeProfit:t3,tp1:t1,tp2:t2,tp3:t3,confidence:sellConf,quality:bearQ,reason:['Institutional order','Fib pullback','Fib retest','Candle confirmation','M5 bearish displacement',`Fib confluence ${sellConf}/100`],state:'CONFIRMED',orderBar:bearOrder,pullbackBar:bearPull}); bearState=4; }
  }
  return result.at(-1)??null;
}

function sellS(_c:Candle[],asia:{hi:number,lo:number},london:{hi:number,lo:number},ny:{hi:number,lo:number},prev:{pdHigh:number,pdLow:number,pwHigh:number,pwLow:number},pv:{high:number,low:number}){
  // Defaults exactly match the supplied Pine inputs: Sell Start = Asia High; Sell End = Asia Low.
  return {start:asia.hi,end:asia.lo};
}
