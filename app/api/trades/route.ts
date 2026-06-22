import { getTokenTrades } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const limit = parseInt(searchParams.get('limit') || '30');

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const trades = await getTokenTrades(address, limit);
  return NextResponse.json({ trades });
}
