import { config } from '../config';
import type { ExecutionRequest,ExecutionResult } from '../types';
import type { ExecutionAdapter } from './adapter';
export class MT5Adapter implements ExecutionAdapter { name='MT5'; async execute(request:ExecutionRequest):Promise<ExecutionResult>{ if(!config.mt5BaseUrl) return {accepted:false,message:'MT5 endpoint is not configured'}; const r=await fetch(`${config.mt5BaseUrl.replace(/\\/$/,'')}/orders`,{method:'POST',headers:{'content-type':'application/json',...(config.mt5Key?{authorization:`Bearer ${config.mt5Key}`}:{})},body:JSON.stringify(request.signal)}); return {accepted:r.ok,message:await r.text()||r.statusText}; }}
