import { getTrendingTokens } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const tokens = await getTrendingTokens(limit, offset);

  return NextResponse.json({ tokens });
}
