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

  if (!address) return NextResponse.json({ theses: [] });

  const { data } = await supabase
    .from('theses')
    .select('*')
    .eq('token_address', address)
    .order('created_at', { ascending: false });

  const userIds = Array.from(new Set((data || []).map(t => t.user_id).filter(Boolean))) as string[];
  const { data: dbUsers } = userIds.length > 0
    ? await supabase
        .from('users')
        .select('wallet_address, display_name, username, avatar_url')
        .in('wallet_address', userIds)
    : { data: null };

  const userMap = new Map<string, { displayName?: string; username?: string; avatarUrl?: string }>();
  if (dbUsers) {
    dbUsers.forEach((u: any) => {
      userMap.set(u.wallet_address.toLowerCase(), {
        displayName: u.display_name,
        username: u.username,
        avatarUrl: u.avatar_url,
      });
    });
  }

  const mapped = (data || []).map(t => {
    const ownerKey = (t.user_id || '').toLowerCase();
    const dbUser = userMap.get(ownerKey);
    const fallbackName = walletToUsername(t.user_id || '');
    return {
      user_id: t.user_id,
      displayName: dbUser?.displayName || fallbackName,
      username: dbUser?.username || fallbackName.toLowerCase(),
      avatarUrl: dbUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.user_id || 'Anonymous'}`,
      comment: {
        comment: t.content,
        numLikes: t.hearts || 0
      },
      authorTrade: {
        unrealizedPnlUsd: 0
      },
      tokenImageUrl: t.image_url,
      created_at: t.created_at
    };
  });

  return NextResponse.json({ theses: mapped });
}
