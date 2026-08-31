import { NextResponse } from 'next/server';
import { latestSignals } from '@/lib/queue';
export async function GET(){ return NextResponse.json({signals:latestSignals()}); }
