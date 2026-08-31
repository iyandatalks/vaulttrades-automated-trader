export type Side = 'BUY' | 'SELL';
export type Timeframe = 'M1' | 'M5' | 'M10' | 'M15' | 'M30';
export type SignalStatus = 'NEW' | 'ACTIVE' | 'TP1' | 'TP2' | 'TP3' | 'SL' | 'EXPIRED';
export interface Candle { time:number; open:number; high:number; low:number; close:number; volume:number; }
export interface Signal { id:string; symbol:string; strategy:string; side:Side; timeframe:Timeframe; entry:number; stopLoss:number; takeProfit:number; confidence:number; status:SignalStatus; createdAt:string; source:'AUTOMATION'; reason:string[]; higherTimeframeConfirmed:boolean; }
export interface EngineStatus { enabled:boolean; healthy:boolean; lastCycleAt:string|null; lastSignalAt:string|null; lastError:string|null; dataProvider:string; executionProvider:string; }
export interface ExecutionRequest { signal:Signal; }
export interface ExecutionResult { accepted:boolean; externalId?:string; message:string; }
