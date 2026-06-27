import { getLeaderboard, getWalletPnlDetails } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const wallet = searchParams.get('wallet');
  const duration = searchParams.get('duration') || 'all';

  if (wallet) {
    const pnlDetails = await getWalletPnlDetails(
      wallet,
      duration as 'all' | '90d' | '30d' | '7d' | '24h'
    );
    return NextResponse.json({ pnl: pnlDetails });
  }

  const entries = await getLeaderboard(limit, offset);
  return NextResponse.json({ entries });
}
