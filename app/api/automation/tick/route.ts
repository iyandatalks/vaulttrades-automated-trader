import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { scan } from '@/lib/market-data/signal-engine';
import { enqueue } from '@/lib/queue';
import { validateSignal } from '@/lib/validation';
import { markCycle,markError } from '@/lib/status';
import { MetaKitAdapter } from '@/lib/execution/metakit';
import { MT5Adapter } from '@/lib/execution/mt5';
export async function GET(req:Request){ const auth=req.headers.get('authorization'); if(config.cronSecret && auth!==`Bearer ${config.cronSecret}`) return NextResponse.json({error:'Unauthorized'},{status:401}); if(!config.automationEnabled) return NextResponse.json({ok:true,skipped:true,reason:'Automation disabled'}); try{ const signals=await scan(); for(const signal of signals){ if(!validateSignal(signal).valid) continue; enqueue(signal); const adapter=config.metaKitBaseUrl?new MetaKitAdapter():new MT5Adapter(); await adapter.execute({signal}); } markCycle(signals[0]?.createdAt); return NextResponse.json({ok:true,signals:signals.length}); }catch(e){ markError(e); return NextResponse.json({ok:false,error:e instanceof Error?e.message:String(e)},{status:500}); } }
