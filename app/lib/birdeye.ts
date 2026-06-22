// BirdEye API client for fetching Solana token data
// API docs: https://docs.birdeye.so/reference

const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';

// We'll use this server-side in API routes to hide the key
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || '';

function getHeaders(): Record<string, string> {
  return {
    'X-API-KEY': BIRDEYE_API_KEY,
    'x-chain': 'solana',
    accept: 'application/json',
  };
}

export interface TrendingToken {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
}

export interface TokenOverview {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
  priceChange24h: number;
  priceChange1h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  supply: number;
  holder: number;
  decimals: number;
  extensions?: {
    website?: string;
    twitter?: string;
    telegram?: string;
  };
}

export interface PriceHistoryItem {
  unixTime: number;
  value: number;
}

export interface TradeItem {
  txHash: string;
  blockUnixTime: number;
  source: string;
  owner: string;
  from: {
    symbol: string;
    address: string;
    amount: number;
    uiAmount: number;
  };
  to: {
    symbol: string;
    address: string;
    amount: number;
    uiAmount: number;
  };
  side: 'buy' | 'sell';
  volumeUSD: number;
}

/**
 * Get trending tokens on Solana
 */
export async function getTrendingTokens(limit = 20, offset = 0): Promise<TrendingToken[]> {
  try {
    const res = await fetch(
      `${BIRDEYE_API_BASE}/defi/token_trending?sort_by=rank&sort_type=asc&offset=${offset}&limit=${limit}`,
      {
        headers: getHeaders(),
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();

    const rawTokens: any[] = data.data?.tokens || [];
    const tokens = rawTokens.filter((t: any) => {
      const liq = Number(t.liquidity || 0);
      const vol = Number(t.volume24hUSD || t.volume24h || t.v24hUSD || 0);
      return liq >= 100 || vol >= 100;
    });

    return tokens.map((t: any): TrendingToken => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      logoURI: t.logoURI || t.logo_uri || '',
      price: t.price || 0,
      priceChange24h: t.price24hChangePercent || t.priceChange24hPercent || t.price_change_24h_percent || 0,
      volume24h: t.volume24hUSD || t.volume24h || t.v24hUSD || 0,
      marketCap: t.marketcap || t.mc || t.marketCap || 0,
      liquidity: t.liquidity || 0,
    }));
  } catch (error) {
    console.error('Failed to fetch trending tokens:', error);
    return [];
  }
}

/**
 * Get token overview by address
 */
export async function getTokenOverview(address: string): Promise<TokenOverview | null> {
  try {
    const res = await fetch(
      `${BIRDEYE_API_BASE}/defi/token_overview?address=${address}`,
      {
        headers: getHeaders(),
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();
    const t = data.data;

    if (!t) return null;

    return {
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      logoURI: t.logoURI || t.logo_uri || '',
      price: t.price || 0,
      priceChange24h: t.priceChange24hPercent || 0,
      priceChange1h: t.priceChange1hPercent || 0,
      volume24h: t.v24hUSD || 0,
      marketCap: t.mc || 0,
      liquidity: t.liquidity || 0,
      supply: t.supply || 0,
      holder: t.holder || 0,
      decimals: t.decimals || 9,
      extensions: t.extensions,
    };
  } catch (error) {
    console.error('Failed to fetch token overview:', error);
    return null;
  }
}

/**
 * Get price history for charts
 */
export async function getPriceHistory(
  address: string,
  type: '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W' = '1D',
  timeFrom?: number,
  timeTo?: number
): Promise<any[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = timeFrom || now - 86400; // default: 24h ago
    const to = timeTo || now;

    const res = await fetch(
      `${BIRDEYE_API_BASE}/defi/ohlcv?address=${address}&type=${type}&time_from=${from}&time_to=${to}`,
      {
        headers: getHeaders(),
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();

    return (data.data?.items || []).map((item: any) => ({
      unixTime: item.unixTime,
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
    }));
  } catch (error) {
    console.error('Failed to fetch price history:', error);
    return [];
  }
}

/**
 * Get recent trades for a token
 */
export async function getTokenTrades(address: string, limit = 20): Promise<TradeItem[]> {
  try {
    const res = await fetch(
      `${BIRDEYE_API_BASE}/defi/txs/token?address=${address}&tx_type=swap&sort_type=desc&limit=${limit}`,
      {
        headers: getHeaders(),
        next: { revalidate: 15 },
      }
    );

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();

    return (data.data?.items || []).map((tx: Record<string, unknown>) => ({
      txHash: tx.txHash,
      blockUnixTime: tx.blockUnixTime,
      source: tx.source,
      owner: tx.owner,
      from: tx.from,
      to: tx.to,
      side: tx.side,
      volumeUSD: tx.volumeUSD,
    }));
  } catch (error) {
    console.error('Failed to fetch token trades:', error);
    return [];
  }
}

/**
 * Search tokens by keyword
 */
export async function searchTokens(keyword: string): Promise<TrendingToken[]> {
  try {
    const res = await fetch(
      `${BIRDEYE_API_BASE}/defi/v3/search?keyword=${encodeURIComponent(keyword)}&chain=solana&target=token&sort_by=volume_24h_usd&sort_type=desc&limit=10`,
      {
        headers: getHeaders(),
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();

    return (data.data?.items?.[0]?.result || []).map((t: Record<string, unknown>) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      logoURI: t.logo_uri || '',
      price: t.price || 0,
      priceChange24h: t.price_change_24h || 0,
      volume24h: t.volume_24h_usd || 0,
      marketCap: t.market_cap || 0,
      liquidity: t.liquidity || 0,
    }));
  } catch (error) {
    console.error('Failed to search tokens:', error);
    return [];
  }
}
