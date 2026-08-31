import type { Signal } from '../types';
const memory: Signal[] = [];
export function enqueue(signal:Signal){ memory.unshift(signal); if(memory.length>50) memory.length=50; }
export function latestSignals(){ return [...memory]; }
