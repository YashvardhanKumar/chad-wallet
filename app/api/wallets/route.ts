import { getLeaderboard } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const leaderboard = await getLeaderboard(10);
  
  const wallets = leaderboard.map(w => ({
    app: { browser: 'https://explorer.solana.com/address/' + w.owner },
    image_url: { sm: `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.owner}` },
    metadata: { shortName: w.owner.slice(0, 6) }
  }));

  return NextResponse.json({ wallets });
}
