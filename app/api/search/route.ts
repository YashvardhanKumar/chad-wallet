import { searchTokens } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ tokens: [] });
  }

  const tokens = await searchTokens(q);
  return NextResponse.json({ tokens });
}
