import { getTokenTrades, getSolPrice } from '@/app/lib/birdeye';
import { supabase } from '@/app/lib/supabase';
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

  // Query Supabase for registered user profiles to get custom avatars and display names
  const owners = Array.from(new Set(trades.map((t: any) => t.owner).filter(Boolean))) as string[];
  const { data: dbUsers } = owners.length > 0
    ? await supabase
        .from('users')
        .select('wallet_address, display_name, avatar_url')
        .in('wallet_address', owners)
    : { data: null };

  const userMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
  if (dbUsers) {
    dbUsers.forEach((u: any) => {
      userMap.set(u.wallet_address.toLowerCase(), {
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
      });
    });
  }

  const mapped = trades.map((t: any) => {
    const ownerKey = (t.owner || '').toLowerCase();
    const dbUser = userMap.get(ownerKey);
    const amountVal = t.side === 'buy' ? t.to?.uiAmount || 0 : t.from?.uiAmount || 0;
    const tokenPriceUsd = amountVal > 0 ? (t.volumeUSD || 0) / amountVal : 0;
    return {
      userId: t.owner,
      displayName: dbUser?.displayName || walletToUsername(t.owner || ''),
      avatarUrl: dbUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.owner || 'Anonymous'}`,
      usdAmount: t.volumeUSD || 0,
      marketCap: 0,
      price: tokenPriceUsd,
      tradeType: t.side?.toUpperCase() || 'BUY',
      unixTime: t.blockUnixTime,
      amount: amountVal
    };
  });

  return NextResponse.json({ trades: mapped });
}
