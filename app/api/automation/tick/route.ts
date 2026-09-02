import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { scan } from '@/lib/market-data/signal-engine';
import { enqueue } from '@/lib/queue';
import { validateSignal } from '@/lib/validation';
import { markCycle, markError } from '@/lib/status';
import { Api2TradeAdapter } from '@/lib/execution/api2trade';
import { MetaKitAdapter } from '@/lib/execution/metakit';
import { MT5Adapter } from '@/lib/execution/mt5';
import type { ExecutionAdapter } from '@/lib/execution/adapter';

function getExecutionAdapter(): ExecutionAdapter | null {
  if (config.api2TradeApiKey && config.api2TradeAccountId) return new Api2TradeAdapter();
  if (config.metaKitBaseUrl) return new MetaKitAdapter();
  if (config.mt5BaseUrl) return new MT5Adapter();
  return null;
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (config.cronSecret && auth !== `Bearer ${config.cronSecret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!config.automationEnabled) return NextResponse.json({ ok: true, skipped: true, reason: 'Automation disabled' });

  try {
    const signals = await scan();
    const adapter = getExecutionAdapter();
    const results: Array<{ signalId: string; accepted: boolean; message: string }> = [];

    for (const signal of signals) {
      const validation = validateSignal(signal);
      if (!validation.valid) {
        results.push({ signalId: signal.id, accepted: false, message: validation.errors.join('; ') });
        continue;
      }

      enqueue(signal);
      if (adapter) {
        const result = await adapter.execute({ signal });
        results.push({ signalId: signal.id, accepted: result.accepted, message: result.message });
      } else {
        results.push({ signalId: signal.id, accepted: false, message: 'No execution provider configured; signal queued only' });
      }
    }

    markCycle(signals[0]?.createdAt);
    return NextResponse.json({ ok: true, signals: signals.length, executionProvider: adapter?.name ?? 'Not configured', results });
  } catch (e) {
    markError(e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
