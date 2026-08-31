import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/status';
export async function GET(){ return NextResponse.json(getStatus()); }
