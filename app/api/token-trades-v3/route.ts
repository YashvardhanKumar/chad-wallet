import { getTokenTradesV3 } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');
  const txType = searchParams.get('tx_type') || 'swap';
  const sortType = searchParams.get('sort_type') || 'desc';
  const beforeTime = searchParams.get('before_time');
  const afterTime = searchParams.get('after_time');

  if (!address) {
    return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
  }

  const trades = await getTokenTradesV3(address, {
    limit,
    offset,
    tx_type: txType as 'swap' | 'buy' | 'sell' | 'add' | 'remove' | 'all',
    sort_type: sortType as 'asc' | 'desc',
    before_time: beforeTime ? parseInt(beforeTime) : undefined,
    after_time: afterTime ? parseInt(afterTime) : undefined,
  });

  return NextResponse.json({ trades });
}
