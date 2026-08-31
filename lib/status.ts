import { config } from './config';
import type { EngineStatus } from './types';
let state: EngineStatus = {enabled:config.automationEnabled,healthy:true,lastCycleAt:null,lastSignalAt:null,lastError:null,dataProvider:'Twelve Data',executionProvider:config.metaKitBaseUrl?'MetaKit':config.mt5BaseUrl?'MT5':'Not configured'};
export function getStatus(){ return {...state}; }
export function markCycle(signalAt?:string){ state={...state,lastCycleAt:new Date().toISOString(),lastSignalAt:signalAt||state.lastSignalAt,lastError:null}; }
export function markError(error:unknown){ state={...state,healthy:false,lastError:error instanceof Error?error.message:String(error),lastCycleAt:new Date().toISOString()}; }
