import { getTokenMetadataV3 } from '@/app/lib/birdeye';
import { NextResponse } from 'next/server';

const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY || process.env.JUPITER_API_KEY || '';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  try {
    // 1. Fetch from Birdeye
    const birdeyeMeta = await getTokenMetadataV3(address);

    // 2. Fetch from Jupiter search API
    let jupiterMeta: any = null;
    try {
      const jupRes = await fetch(`https://api.jup.ag/tokens/v2/search?query=${address}`, {
        headers: { 'x-api-key': JUPITER_API_KEY },
        next: { revalidate: 300 }
      });
      if (jupRes.ok) {
        const jupData = await jupRes.json();
        if (Array.isArray(jupData) && jupData.length > 0) {
          jupiterMeta = jupData.find((t: any) => t.id === address) || jupData[0];
        }
      }
    } catch (err) {
      console.error('Failed to fetch from Jupiter API:', err);
    }

    // 3. Fetch from Jupiter Content API (for description/about)
    let description = '';
    try {
      const contentRes = await fetch(`https://api.jup.ag/tokens/v2/content?mints=${address}`, {
        headers: { 'x-api-key': JUPITER_API_KEY },
        next: { revalidate: 300 }
      });
      if (contentRes.ok) {
        const contentData = await contentRes.json();
        if (contentData && contentData.data && contentData.data.length > 0) {
          const descItem = contentData.data.find((item: any) => item.body || item.description);
          description = descItem?.body || descItem?.description || '';
        }
      }
    } catch (err) {
      console.error('Failed to fetch from Jupiter Content API:', err);
    }

    // Merge everything into one object
    const merged = {
      ...(birdeyeMeta || {}),
      jupiter: jupiterMeta || null,
      description: description || '',
    };

    return NextResponse.json({ metadata: merged });
  } catch (error: any) {
    console.error('Token metadata route error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
