import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://solana-rpc.publicnode.com';
    
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `RPC returned status ${res.status}: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('RPC Proxy failed:', error);
    return NextResponse.json({ error: error.message || 'Internal RPC error' }, { status: 500 });
  }
}
