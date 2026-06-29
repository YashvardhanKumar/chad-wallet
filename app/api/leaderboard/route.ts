import { getLeaderboardByDuration, getWalletPnlDetails } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const wallet = searchParams.get('wallet');
  const duration = (searchParams.get('duration') || '24h') as 'all' | '90d' | '30d' | '7d' | '24h';

  if (wallet) {
    const pnlDetails = await getWalletPnlDetails(wallet, duration);
    return NextResponse.json({ pnl: pnlDetails });
  }

  const entries = await getLeaderboardByDuration(limit, duration);
  return NextResponse.json({ entries });
}
