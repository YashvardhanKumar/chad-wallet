import { getTrendingTokens } from '@/app/lib/birdeye';
import { KNOWN_TOKENS } from '@/app/lib/constants';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Try BirdEye API first, fall back to known tokens
  let tokens = await getTrendingTokens(limit, offset);

  if (tokens.length === 0) {
    // Fallback: return known tokens with mock data
    tokens = KNOWN_TOKENS.map((t, i) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      logoURI: t.logoURI,
      price: [170.5, 1.0, 1.0, 0.00002345, 0.89, 0.45, 2.15, 0.56][i] || Math.random() * 10,
      priceChange24h: (Math.random() - 0.4) * 50,
      volume24h: Math.random() * 1e7,
      marketCap: Math.random() * 1e9,
      liquidity: Math.random() * 1e6,
    }));
  }

  return NextResponse.json({ tokens });
}
