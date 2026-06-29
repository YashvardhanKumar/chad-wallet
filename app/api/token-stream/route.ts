import { NextRequest } from 'next/server';
import { getSolPrice } from '@/app/lib/birdeye';

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || '';
const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';

export const dynamic = 'force-dynamic';

async function fetchPrice(address: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${BIRDEYE_API_BASE}/defi/price?address=${address}`,
      {
        headers: {
          'X-API-KEY': BIRDEYE_API_KEY,
          'x-chain': 'solana',
          accept: 'application/json',
        },
        next: { revalidate: 0 },
      }
    );
    if (res.ok) {
      const data = await res.json();
      return data.data?.value ?? data.data?.price ?? null;
    }
  } catch {
    // silent
  }
  return null;
}

export async function GET(request: NextRequest) {
  const tokensParam = request.nextUrl.searchParams.get('tokens') || '';
  const addresses = tokensParam.split(',').filter(Boolean);

  const encoder = new TextEncoder();

  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream closed
        }
      };

      send({ type: 'connected', addresses });

      const poll = async () => {
        const solPrice = await getSolPrice();
        const sPrice = solPrice > 0 ? solPrice : 150;
        const updates: { address: string; value: number }[] = [];
        for (const addr of addresses) {
          const price = await fetchPrice(addr);
          if (price !== null) {
            updates.push({ address: addr, value: price / sPrice });
          }
        }
        if (updates.length > 0) {
          send({ type: 'price_update', data: Object.fromEntries(updates.map(u => [u.address, { value: u.value }])) });
        }
      };

      poll();
      interval = setInterval(poll, 10000);

      request.signal.addEventListener('abort', () => {
        if (interval) clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
