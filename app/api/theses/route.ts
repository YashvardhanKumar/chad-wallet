import { supabase } from '@/app/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) return NextResponse.json({ theses: [] });

  const { data } = await supabase
    .from('theses')
    .select('*')
    .eq('token_address', address)
    .order('created_at', { ascending: false });

  const mapped = (data || []).map(t => ({
    user_id: t.user_id,
    displayName: null, // Let frontend handle shortenAddress
    comment: {
      comment: t.content,
      numLikes: t.hearts || 0
    },
    authorTrade: {
      unrealizedPnlUsd: 0
    },
    tokenImageUrl: t.image_url,
    created_at: t.created_at
  }));

  return NextResponse.json({ theses: mapped });
}
