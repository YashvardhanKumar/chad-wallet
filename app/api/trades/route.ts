import { getTokenTrades, getSolPrice } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

/** Generate a deterministic username from a wallet address */
function walletToUsername(address: string): string {
  const prefixes = [
    'crypto', 'degen', 'sol', 'moon', 'ape', 'whale', 'alpha',
    'based', 'chad', 'sigma', 'diamond', 'rocket', 'turbo', 'mega',
    'ultra', 'hyper', 'super', 'dark', 'neon', 'pixel', 'zen',
    'iron', 'frost', 'blaze', 'storm', 'swift', 'prime', 'nova',
  ];
  const suffixes = [
    'trader', 'hands', 'maxi', 'bull', 'king', 'lord', 'boss',
    'whale', 'degen', 'ape', 'chad', 'punk', 'fan', 'hodler',
    'sniper', 'hunter', 'wizard', 'guru', 'chief', 'cap',
    'fox', 'wolf', 'bear', 'eagle', 'hawk', 'lion',
  ];

  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash + address.charCodeAt(i)) | 0;
  }
  const absHash = Math.abs(hash);
  const prefix = prefixes[absHash % prefixes.length];
  const suffix = suffixes[(absHash >> 8) % suffixes.length];
  const num = (absHash % 900) + 100;

  const fmt = absHash % 4;
  if (fmt === 0) return `${prefix}_${suffix}`;
  if (fmt === 1) return `${prefix}${suffix}${num}`;
  if (fmt === 2) return `${prefix.charAt(0).toUpperCase() + prefix.slice(1)}${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`;
  return `${suffix}_${prefix}${num % 100}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const limit = parseInt(searchParams.get('limit') || '30');

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const trades = await getTokenTrades(address, limit);
  const solPrice = await getSolPrice();
  const sPrice = solPrice > 0 ? solPrice : 150;

  const mapped = trades.map((t: any) => ({
    userId: t.owner,
    displayName: walletToUsername(t.owner || ''),
    usdAmount: (t.volumeUSD || 0) / sPrice,
    marketCap: 0,
    price: 0,
    tradeType: t.side?.toUpperCase() || 'BUY',
    unixTime: t.blockUnixTime
  }));

  return NextResponse.json({ trades: mapped });
}
