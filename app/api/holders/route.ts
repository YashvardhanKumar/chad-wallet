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

  // Use address bytes to deterministically pick prefix + suffix
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash + address.charCodeAt(i)) | 0;
  }
  const absHash = Math.abs(hash);
  const prefix = prefixes[absHash % prefixes.length];
  const suffix = suffixes[(absHash >> 8) % suffixes.length];
  const num = (absHash % 900) + 100; // 3-digit number

  // Some variety in format
  const fmt = absHash % 4;
  if (fmt === 0) return `${prefix}_${suffix}`;
  if (fmt === 1) return `${prefix}${suffix}${num}`;
  if (fmt === 2) return `${prefix.charAt(0).toUpperCase() + prefix.slice(1)}${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`;
  return `${suffix}_${prefix}${num % 100}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  
  if (!address) return NextResponse.json({ holders: [] });

  const trades = await getTokenTrades(address, 15);
  const solPrice = await getSolPrice();
  const sPrice = solPrice > 0 ? solPrice : 150;
  
  // Deduplicate by owner, aggregate
  const ownerMap = new Map<string, { totalUSD: number; count: number; lastTime: number }>();
  for (const t of trades) {
    const owner = (t as any).owner || '';
    const existing = ownerMap.get(owner);
    if (existing) {
      existing.totalUSD += (t as any).volumeUSD || 0;
      existing.count += 1;
      existing.lastTime = Math.max(existing.lastTime, (t as any).blockUnixTime || 0);
    } else {
      ownerMap.set(owner, {
        totalUSD: (t as any).volumeUSD || 0,
        count: 1,
        lastTime: (t as any).blockUnixTime || 0,
      });
    }
  }

  const mapped = Array.from(ownerMap.entries()).map(([owner, agg]) => {
    const pnlMultiplier = (Math.abs(hashCode(owner)) % 200 - 30) / 100; // deterministic PnL
    return {
      user: {
        address: owner,
        displayName: walletToUsername(owner),
      },
      humanAmount: agg.totalUSD / 0.01,
      value: agg.totalUSD / sPrice,
      pnl: (pnlMultiplier * agg.totalUSD) / sPrice,
      costBasis: (agg.totalUSD * (1 - pnlMultiplier)) / sPrice,
      averageEntryPrice: 0.01 / sPrice,
      averageEntryMarketCap: ((Math.abs(hashCode(owner)) % 90 + 5) * 1e6) / sPrice,
      averageHoldTimeSeconds: (Math.abs(hashCode(owner)) % 864000) + 600,
      comment: hashCode(owner) % 3 === 0 ? {
        comment: ['up only tek', 'diamond hands forever', 'WAGMI', 'conviction play', 'long term hold'][Math.abs(hashCode(owner)) % 5],
        numLikes: Math.abs(hashCode(owner)) % 80,
        createdAt: new Date(agg.lastTime * 1000).toISOString(),
      } : null
    };
  });

  // Sort by position size descending
  mapped.sort((a, b) => b.value - a.value);

  return NextResponse.json({ holders: mapped });
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}
