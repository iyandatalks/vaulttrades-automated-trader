import { config } from './config';
import type { EngineStatus } from './types';

const executionProvider = config.api2TradeApiKey && config.api2TradeAccountId
  ? 'API2Trade'
  : config.metaKitBaseUrl
    ? 'MetaKit'
    : config.mt5BaseUrl
      ? 'MT5'
      : 'Not configured';

let state: EngineStatus = {
  enabled: config.automationEnabled,
  healthy: true,
  lastCycleAt: null,
  lastSignalAt: null,
  lastError: null,
  dataProvider: 'Twelve Data',
  executionProvider,
};

export function getStatus(){ return {...state}; }
export function markCycle(signalAt?:string){ state={...state,healthy:true,lastCycleAt:new Date().toISOString(),lastSignalAt:signalAt||state.lastSignalAt,lastError:null}; }
export function markError(error:unknown){ state={...state,healthy:false,lastError:error instanceof Error?error.message:String(error),lastCycleAt:new Date().toISOString()}; }
