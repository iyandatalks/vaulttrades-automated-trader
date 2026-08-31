import type { ExecutionRequest,ExecutionResult } from '../types';
export interface ExecutionAdapter { name:string; execute(request:ExecutionRequest):Promise<ExecutionResult>; }
