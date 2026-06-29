import { getOverallTrendingTokens } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tokens = await getOverallTrendingTokens(10);
  
  const activities = tokens.map((t, i) => ({
    id: `act-${t.address}-${i}`,
    type: 'HIGH_VOLUME',
    body: {
      ticker: t.symbol,
      tokenImageUrl: t.logoURI,
      priceChangePercent: t.priceChange24h,
      uniqueTraders: t.uniqueWallet24h || Math.floor(Math.random() * 5000),
      totalVolume: t.volume24h,
      topTraders: [
        { id: '1', displayName: 'trader1', userImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.address}1` },
        { id: '2', displayName: 'trader2', userImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.address}2` },
        { id: '3', displayName: 'trader3', userImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.address}3` }
      ]
    }
  }));

  return NextResponse.json({ activity: activities });
}
