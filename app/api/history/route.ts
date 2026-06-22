import { getPriceHistory } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const type = searchParams.get('type') as '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W' || '15m';
  const timeFrom = searchParams.get('timeFrom');
  const timeTo = searchParams.get('timeTo');

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const history = await getPriceHistory(
    address, 
    type, 
    timeFrom ? parseInt(timeFrom) : undefined,
    timeTo ? parseInt(timeTo) : undefined
  );
  
  return NextResponse.json({ history });
}
