import type { Candle, Side } from '../types';

export const FIB = {
  early:61.8, preferred:68.1, second:78.6, last:88.0, stop:125.0,
  tp1:38.2, tp2:0.0, tp3:-23.6, minConfluence:60,
  entryAtrLength:14, displacementATR:0.60, retestBars:8, pivotLen:5,
  asia:'0000-0600', london:'0700-1000', ny:'1230-1700',
  dxyMaLen:50, dxyMaTouch:0.15
} as const;

export type FibAnchor = 'Asia Low'|'Asia High'|'London Low'|'London High'|'New York Low'|'New York High'|'Previous Day Low'|'Previous Day High'|'Previous Week Low'|'Previous Week High'|'Auto Swing Low'|'Auto Swing High';
export interface FibAnchorConfig { buyStartAnchor:FibAnchor; buyEndAnchor:FibAnchor; sellStartAnchor:FibAnchor; sellEndAnchor:FibAnchor; }
export const DEFAULT_FIB_ANCHORS: FibAnchorConfig = {buyStartAnchor:'Asia Low',buyEndAnchor:'Asia High',sellStartAnchor:'Asia High',sellEndAnchor:'Asia Low'};
export interface FibSignal { side:Side; entry:number; stopLoss:number; takeProfit:number; tp1:number; tp2:number; tp3:number; confidence:number; quality:string; reason:string[]; state:string; orderBar:number; pullbackBar:number; }
export interface FibContext { dxy?:Candle[]; confirmation?:Candle[]; anchors?:Partial<FibAnchorConfig>; }

function rma(values:number[],length:number):number[]{const out:number[]=[];let prev=values[0]??0;for(let i=0;i<values.length;i++){if(i===0)prev=values[i];else prev=(prev*(length-1)+values[i])/length;out.push(prev);}return out;}
function atr(c:Candle[],length:number):number[]{const tr=c.map((x,i)=>i===0?x.high-x.low:Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)));return rma(tr,length);}
function ema(values:number[],length:number):number[]{const k=2/(length+1);let e=values[0]??0;return values.map((v,i)=>i?(e=v*k+e*(1-k)):e);}
function buyLevel(top:number,bot:number,pct:number){return top-((top-bot)*pct/100);}
function sellLevel(top:number,bot:number,pct:number){return bot+((top-bot)*pct/100);}
function session(ts:number,spec:string){const d=new Date(ts);const mins=d.getUTCHours()*60+d.getUTCMinutes();const [a,b]=spec.split('-').map(x=>Number(x.slice(0,2))*60+Number(x.slice(2)));return a<=b?mins>=a&&mins<b:mins>=a||mins<b;}
function dayKey(ts:number){const d=new Date(ts);return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;}
function weekKey(ts:number){const d=new Date(ts);const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);return dayKey(d.getTime());}
function previousExtremes(c:Candle[]){const days=new Map<string,Candle[]>(),weeks=new Map<string,Candle[]>();for(const x of c){const dk=dayKey(x.time),wk=weekKey(x.time);if(!days.has(dk))days.set(dk,[]);if(!weeks.has(wk))weeks.set(wk,[]);days.get(dk)!.push(x);weeks.get(wk)!.push(x);}const dkeys=[...days.keys()],wkeys=[...weeks.keys()];const dc=dkeys.length>1?days.get(dkeys.at(-2)!)!:[],wc=wkeys.length>1?weeks.get(wkeys.at(-2)!)!:[];return{pdHigh:dc.length?Math.max(...dc.map(x=>x.high)):NaN,pdLow:dc.length?Math.min(...dc.map(x=>x.low)):NaN,pwHigh:wc.length?Math.max(...wc.map(x=>x.high)):NaN,pwLow:wc.length?Math.min(...wc.map(x=>x.low)):NaN};}
function latestSession(c:Candle[],spec:string){let hi=NaN,lo=NaN,activeKey='';for(const x of c){if(session(x.time,spec)){const k=dayKey(x.time);if(k!==activeKey){activeKey=k;hi=x.high;lo=x.low;}else{hi=Math.max(hi,x.high);lo=Math.min(lo,x.low);}}}return{hi,lo};}
function pivots(c:Candle[],len:number){let high=NaN,low=NaN;for(let i=len;i<c.length-len;i++){let ph=true,pl=true;for(let j=1;j<=len;j++){if(c[i].high<=c[i-j].high||c[i].high<c[i+j].high)ph=false;if(c[i].low>=c[i-j].low||c[i].low>c[i+j].low)pl=false;}if(ph)high=c[i].high;if(pl)low=c[i].low;}return{high,low};}
function resolveAnchor(anchor:FibAnchor,c:Candle[],a:{hi:number,lo:number},l:{hi:number,lo:number},n:{hi:number,lo:number},p:{pdHigh:number,pdLow:number,pwHigh:number,pwLow:number},pv:{high:number,low:number}){switch(anchor){case'Asia Low':return a.lo;case'Asia High':return a.hi;case'London Low':return l.lo;case'London High':return l.hi;case'New York Low':return n.lo;case'New York High':return n.hi;case'Previous Day Low':return p.pdLow;case'Previous Day High':return p.pdHigh;case'Previous Week Low':return p.pwLow;case'Previous Week High':return p.pwHigh;case'Auto Swing Low':return pv.low;case'Auto Swing High':return pv.high;default:return NaN;}}

function dxyAt(c:Candle[],dxy:Candle[]|undefined,time:number){if(!dxy?.length)return undefined;let v:Candle|undefined;for(const x of dxy){if(x.time<=time)v=x;else break;}return v;}
function dxyPrev(c:Candle[],dxy:Candle[]|undefined,time:number){if(!dxy?.length)return undefined;let prev:Candle|undefined;for(const x of dxy){if(x.time<time)prev=x;else break;}return prev;}
function confluence(c:Candle[],dxy:Candle[]|undefined,time:number,top:number,bot:number){const x=c.findLast(z=>z.time<=time)??c.at(-1)!;const d=dxyAt(c,dxy,time),dp=dxyPrev(c,dxy,time);const dBear=!!d&&!!dp&&d.close<dp.close,dBull=!!d&&!!dp&&d.close>dp.close;let dVolSpike=false,dAbove=false,dBelow=false,dAt=false,dBearMa=false,dBullMa=false;if(dxy?.length){const idx=dxy.findIndex(z=>z.time>time);const end=idx<0?dxy.length:idx;const ds=dxy.slice(0,end);if(d){const vols=ds.slice(-20).map(z=>z.volume);const sma=vols.length?vols.reduce((a,b)=>a+b,0)/vols.length:NaN;dVolSpike=Number.isFinite(d.volume)&&Number.isFinite(sma)&&d.volume>sma*1.5;const ma=ds.length>=FIB.dxyMaLen?ema(ds.map(z=>z.close),FIB.dxyMaLen).at(-1):NaN;if(Number.isFinite(ma)){dAbove=d.close>ma;dBelow=d.close<ma;dAt=ma!==0&&Math.abs(d.close-ma)/Math.abs(ma)*100<=FIB.dxyMaTouch;dBearMa=dBear&&dBelow;dBullMa=dBull&&dAbove;}}}const pd=previousExtremes(c);const pdl=Number.isFinite(pd.pdLow)&&x.low>0&&x.low<pd.pdLow&&x.close>pd.pdLow;const pdh=Number.isFinite(pd.pdHigh)&&x.high>pd.pdHigh&&x.close<pd.pdHigh;const mid=(top+bot)/2;const buyFlip=x.close>=mid,sellFlip=x.close<=mid;let buy=0,sell=0;buy+=(buyFlip?20:0)+(dBear?15:0)+(dBearMa?10:0)+(dVolSpike?10:0)+(pdl?15:0)+(x.close>=mid?20:0);sell+=(sellFlip?20:0)+(dBull?15:0)+(dBullMa?10:0)+(dVolSpike?10:0)+(pdh?15:0)+(x.close<=mid?20:0);return{buy:Math.min(buy,100),sell:Math.min(sell,100),dAt,pdl,pdh};}

/**
 * Vault Auto Fib Retrace + TP Ladder | Dashboard Professional WhieWhite
 * Source-of-truth calculation engine. Visual boxes/tables/labels are presentation only.
 * The state machine is deliberately retained: Institutional Order -> Pullback -> Retest -> Candle Confirmation -> M5 Displacement -> Confluence -> Entry.
 */
export function vaultFibSignal(c:Candle[],ctx:FibContext={}):FibSignal|null{
 if(c.length<30)return null;
 const anchors={...DEFAULT_FIB_ANCHORS,...ctx.anchors};
 const asia=latestSession(c,FIB.asia),london=latestSession(c,FIB.london),ny=latestSession(c,FIB.ny),prev=previousExtremes(c),pv=pivots(c,FIB.pivotLen);
 const bs=resolveAnchor(anchors.buyStartAnchor,c,asia,london,ny,prev,pv),be=resolveAnchor(anchors.buyEndAnchor,c,asia,london,ny,prev,pv),ss=resolveAnchor(anchors.sellStartAnchor,c,asia,london,ny,prev,pv),se=resolveAnchor(anchors.sellEndAnchor,c,asia,london,ny,prev,pv);
 const buyReady=Number.isFinite(bs)&&Number.isFinite(be)&&Math.abs(bs-be)>1e-12,sellReady=Number.isFinite(ss)&&Number.isFinite(se)&&Math.abs(ss-se)>1e-12;if(!buyReady&&!sellReady)return null;
 const bt=buyReady?Math.max(bs,be):NaN,bb=buyReady?Math.min(bs,be):NaN,st=sellReady?Math.max(ss,se):NaN,sb=sellReady?Math.min(ss,se):NaN;const bmid=buyReady?(bt+bb)/2:NaN,smid=sellReady?(st+sb)/2:NaN;const a=atr(c,FIB.entryAtrLength);
 let bullState=0,bearState=0,bullOrder=-1,bearOrder=-1,bullPull=-1,bearPull=-1,bullFib=NaN,bearFib=NaN,bullQ='',bearQ='';let latest:FibSignal|null=null;
 for(let i=1;i<c.length;i++){
  const x=c[i],p=c[i-1];
  const cc=confluence(c.slice(0,i+1),ctx.dxy,x.time,buyReady?bt:st,buyReady?bb:sb);
  const bullFlip=buyReady&&x.close>=bmid,sellFlip=sellReady&&x.close<=smid;
  const bullOrder=buyReady&&bullFlip&&p.close<p.open&&x.close>p.high&&(x.close-x.open)>=a[i]*0.50;
  const bearOrder=sellReady&&sellFlip&&p.close>p.open&&x.close<p.low&&(x.open-x.close)>=a[i]*0.50;
  if(bullOrder){bullState=1;bullOrder=i;bullPull=-1;bullFib=NaN;bullQ='';bearState=0;bearFib=NaN;bearQ='';}
  if(bearOrder){bearState=1;bearOrder=i;bearPull=-1;bearFib=NaN;bearQ='';bullState=0;bullFib=NaN;bullQ='';}
  if(bullState===1){if(x.low<=buyLevel(bt,bb,FIB.preferred)){bullState=2;bullPull=i;bullFib=buyLevel(bt,bb,FIB.preferred);bullQ='68.1% PREFERRED';}else if(x.low<=buyLevel(bt,bb,FIB.second)){bullState=2;bullPull=i;bullFib=buyLevel(bt,bb,FIB.second);bullQ='78.6% SECOND';}else if(x.low<=buyLevel(bt,bb,FIB.last)){bullState=2;bullPull=i;bullFib=buyLevel(bt,bb,FIB.last);bullQ='88% LAST RESORT';}}
  if(bearState===1){if(x.high>=sellLevel(st,sb,FIB.preferred)){bearState=2;bearPull=i;bearFib=sellLevel(st,sb,FIB.preferred);bearQ='68.1% PREFERRED';}else if(x.high>=sellLevel(st,sb,FIB.second)){bearState=2;bearPull=i;bearFib=sellLevel(st,sb,FIB.second);bearQ='78.6% SECOND';}else if(x.high>=sellLevel(st,sb,FIB.last)){bearState=2;bearPull=i;bearFib=sellLevel(st,sb,FIB.last);bearQ='88% LAST RESORT';}}
  if(bullState>=2&&i-bullPull>FIB.retestBars){bullState=0;bullFib=NaN;bullQ='';}if(bearState>=2&&i-bearPull>FIB.retestBars){bearState=0;bearFib=NaN;bearQ='';}
  const bullRet=bullState===2&&x.low<=bullFib&&x.close>bullFib,bearRet=bearState===2&&x.high>=bearFib&&x.close<bearFib;
  if(bullRet&&x.close>x.open&&x.close>p.high)bullState=3;if(bearRet&&x.close<x.open&&x.close<p.low)bearState=3;
  const m5=ctx.confirmation?.filter(z=>z.time<=x.time).at(-1),m5p=ctx.confirmation?.filter(z=>z.time<x.time).at(-1);const m5a=ctx.confirmation?atr(ctx.confirmation,FIB.entryAtrLength).at(-1):NaN;
  const m5Bull=!!m5&&!!m5p&&Number.isFinite(m5a)&&m5.close>m5.open&&(m5.close-m5.open)>=m5a*FIB.displacementATR&&m5.close>m5p.high;
  const m5Bear=!!m5&&!!m5p&&Number.isFinite(m5a)&&m5.close<m5.open&&(m5.open-m5.close)>=m5a*FIB.displacementATR&&m5.close<m5p.low;
  if(bullState===3&&m5Bull&&cc.buy>=FIB.minConfluence){const entry=bullFib,sl=buyLevel(bt,bb,FIB.stop),t1=buyLevel(bt,bb,FIB.tp1),t2=buyLevel(bt,bb,FIB.tp2),t3=buyLevel(bt,bb,FIB.tp3);latest={side:'BUY',entry,stopLoss:sl,takeProfit:t3,tp1:t1,tp2:t2,tp3:t3,confidence:cc.buy,quality:bullQ,reason:['Institutional order','Fib pullback','Fib retest','Candle confirmation','M5 bullish displacement',`Fib confluence ${cc.buy}/100`],state:'CONFIRMED',orderBar:bullOrder,pullbackBar:bullPull};bullState=4;}
  if(bearState===3&&m5Bear&&cc.sell>=FIB.minConfluence){const entry=bearFib,sl=sellLevel(st,sb,FIB.stop),t1=sellLevel(st,sb,FIB.tp1),t2=sellLevel(st,sb,FIB.tp2),t3=sellLevel(st,sb,FIB.tp3);latest={side:'SELL',entry,stopLoss:sl,takeProfit:t3,tp1:t1,tp2:t2,tp3:t3,confidence:cc.sell,quality:bearQ,reason:['Institutional order','Fib pullback','Fib retest','Candle confirmation','M5 bearish displacement',`Fib confluence ${cc.sell}/100`],state:'CONFIRMED',orderBar:bearOrder,pullbackBar:bearPull};bearState=4;}
 }
 return latest;
}
