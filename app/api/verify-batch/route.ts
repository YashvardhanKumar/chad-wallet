import { isTokenVerified } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const addressesParam = searchParams.get('addresses');

  if (!addressesParam) {
    return NextResponse.json({ error: 'Missing addresses' }, { status: 400 });
  }

  const addresses = addressesParam.split(',').filter(Boolean);
  if (addresses.length === 0) {
    return NextResponse.json({ verified: [] });
  }

  if (addresses.length > 100) {
    return NextResponse.json({ error: 'Too many addresses (max 100)' }, { status: 400 });
  }

  const results = await Promise.all(addresses.map(isTokenVerified));
  const verified = addresses.filter((_, i) => results[i]);

  return NextResponse.json({ verified });
}
