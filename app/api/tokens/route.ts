import { getOverallTrendingTokens, isTokenVerified } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  const tokens = await getOverallTrendingTokens(limit);
  
  const mapped = await Promise.all(tokens.map(async (t) => ({
    change5m: t.priceChange5m?.toString() || "0",
    change1: t.priceChange1h?.toString() || "0",
    change24: t.priceChange24h?.toString() || "0",
    liquidity: t.liquidity?.toString() || "0",
    marketCap: t.marketCap?.toString() || "0",
    priceUSD: t.price?.toString() || "0",
    volume24h: t.volume24h?.toString() || "0",
    age: t.age || "",
    isVerified: t.isVerified ?? await isTokenVerified(t.address),
    token: {
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      info: {
        imageLargeUrl: t.logoURI,
        imageSmallUrl: t.logoURI,
      }
    }
  })));

  return NextResponse.json({ tokens: mapped });
}
