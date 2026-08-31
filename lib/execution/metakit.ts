import { config } from '../config';
import type { ExecutionRequest,ExecutionResult } from '../types';
import type { ExecutionAdapter } from './adapter';
export class MetaKitAdapter implements ExecutionAdapter { name='MetaKit'; async execute(request:ExecutionRequest):Promise<ExecutionResult>{ if(!config.metaKitBaseUrl) return {accepted:false,message:'MetaKit endpoint is not configured'}; const r=await fetch(`${config.metaKitBaseUrl.replace(/\\/$/,'')}/orders`,{method:'POST',headers:{'content-type':'application/json',...(config.metaKitKey?{authorization:`Bearer ${config.metaKitKey}`}:{})},body:JSON.stringify(request.signal)}); const text=await r.text(); return {accepted:r.ok,externalId:r.ok?((JSON.parse(text||'{}') as {id?:string}).id):undefined,message:text||r.statusText}; }}
