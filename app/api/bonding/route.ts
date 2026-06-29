import { getBondingTokens, isTokenVerified } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const tokens = await getBondingTokens(30);
    const verified = await Promise.all(tokens.map(t => isTokenVerified(t.address)));
    const withVerified = tokens.map((t, i) => ({ ...t, isVerified: t.isVerified ?? verified[i] }));
    return NextResponse.json({ tokens: withVerified });
  } catch (error) {
    console.error('Failed to fetch bonding tokens:', error);
    return NextResponse.json({ tokens: [] });
  }
}
