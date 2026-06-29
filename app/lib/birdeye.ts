import { supabase } from './supabase';

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

// --- Jupiter cross-reference cache ---
// Used to enrich Birdeye data with fields the free tier doesn't provide


const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY || '';

// Fetch all verified tokens in one call, cache full data + address set
const VERIFIED_SET_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let verifiedCache: { tokens: any[]; set: Set<string>; time: number } | null = null;

async function getVerifiedTokenList(): Promise<any[]> {
  if (verifiedCache && Date.now() - verifiedCache.time < VERIFIED_SET_CACHE_TTL) {
    return verifiedCache.tokens;
  }
  try {
    const res = await fetch(
      'https://api.jup.ag/tokens/v2/tag?query=verified',
      { headers: { 'x-api-key': JUPITER_API_KEY } }
    );
    if (res.ok) {
      const tokens: any[] = await res.json();
      const set = new Set(tokens.map((t: any) => t.id));
      verifiedCache = { tokens, set, time: Date.now() };
      return tokens;
    }
  } catch {}
  return [];
}

async function getVerifiedTokenSet(): Promise<Set<string>> {
  if (verifiedCache && Date.now() - verifiedCache.time < VERIFIED_SET_CACHE_TTL) {
    return verifiedCache.set;
  }
  await getVerifiedTokenList();
  return verifiedCache?.set || new Set();
}

export async function isTokenVerified(address: string): Promise<boolean> {
  const set = await getVerifiedTokenSet();
  return set.has(address);
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
  dex?: string;
  age?: string;
  graduated?: boolean;
  holder?: number;
  fdv?: number;
  trade24hCount?: number;
  globalFeesPaid?: number;
  lastTradeUnixTime?: number;
  recentListingTime?: number | null;
  priceChange5m?: number;
  priceChange1h?: number;
  volume5m?: number;
  volume1h?: number;
  trade5mCount?: number;
  trade1hCount?: number;
  uniqueWallet24h?: number;
  overallScore?: number;
  isVerified?: boolean;
}

let cachedSolPrice: number | null = null;
let cachedSolPriceTime = 0;

export async function getSolPrice(): Promise<number> {
  if (cachedSolPrice && Date.now() - cachedSolPriceTime < 10000) {
    return cachedSolPrice;
  }
  try {
    const res = await fetch('https://api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112');
    if (res.ok) {
      const data = await res.json();
      const price = data['So11111111111111111111111111111111111111112']?.usdPrice;
      if (price) {
        cachedSolPrice = price;
        cachedSolPriceTime = Date.now();
        return price;
      }
    }
  } catch (e) {
    console.error('Failed to fetch SOL price from Jupiter:', e);
  }
  return 150; // fallback
}

export async function convertToSol(tokens: TrendingToken[]): Promise<TrendingToken[]> {
  const solPrice = await getSolPrice();
  const sPrice = solPrice > 0 ? solPrice : 150;
  return tokens.map(t => ({
    ...t,
    price: (t.price || 0) / sPrice,
    marketCap: (t.marketCap || 0) / sPrice,
    volume24h: (t.volume24h || 0) / sPrice,
    liquidity: (t.liquidity || 0) / sPrice,
    fdv: t.fdv ? t.fdv / sPrice : undefined,
  }));
}

export interface TokenListV3Params {
  sort_by?: string;
  sort_type?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
  min_liquidity?: number;
  max_liquidity?: number;
  min_market_cap?: number;
  max_market_cap?: number;
  min_fdv?: number;
  max_fdv?: number;
}

export interface TokenExtensions {
  website?: string;
  twitter?: string;
  discord?: string;
  medium?: string;
  telegram?: string | null;
  coingecko_id?: string;
}

export interface TokenMetadataV3 {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  extensions?: TokenExtensions;
  logo_uri?: string;
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

// --- Global HTTP API Response Caches ---
const apiMemoryCache = new Map<string, { data: any; timestamp: number }>();

async function getCachedData(cacheKey: string, ttl: number): Promise<any | null> {
  const now = Date.now();
  
  // 1. Check in-memory cache first
  const mem = apiMemoryCache.get(cacheKey);
  if (mem && now - mem.timestamp < ttl) {
    return mem.data;
  }
  
  // 2. Check Supabase cache
  try {
    const { data, error } = await supabase
      .from('api_cache')
      .select('data, updated_at')
      .eq('key', cacheKey)
      .single();
      
    if (data && !error) {
      const updatedAt = new Date(data.updated_at).getTime();
      if (now - updatedAt < ttl) {
        // Update in-memory cache
        apiMemoryCache.set(cacheKey, { data: data.data, timestamp: updatedAt });
        return data.data;
      }
    }
  } catch (e) {
    console.error('Supabase cache read failed, falling back to memory/API:', e);
  }
  
  return null;
}

async function getStaleCachedData(cacheKey: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('api_cache')
      .select('data')
      .eq('key', cacheKey)
      .single();
      
    if (data && !error) {
      return data.data;
    }
  } catch (e) {
    console.error('Supabase stale cache read failed:', e);
  }
  return null;
}

async function setCachedData(cacheKey: string, payload: any): Promise<void> {
  const now = Date.now();
  
  // 1. Update in-memory cache
  apiMemoryCache.set(cacheKey, { data: payload, timestamp: now });
  
  // 2. Persist to Supabase
  try {
    await supabase.from('api_cache').upsert({
      key: cacheKey,
      data: payload,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('Supabase cache write failed:', e);
  }
}

/**
 * Fetch with exponential backoff for rate limits (429) and shared caching to Supabase / In-Memory
 */
export async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  // Determine TTL based on the request URL
  let ttl = 5 * 60 * 1000; // 5 minutes default
  if (
    url.includes('/meta-data') ||
    url.includes('/ohlcv') ||
    url.includes('/search') ||
    url.includes('/leaderboard')
  ) {
    ttl = 60 * 60 * 1000; // 1 hour
  }

  // Construct cache key
  const method = options?.method || 'GET';
  const headersObj = options?.headers || {};
  const chain = (headersObj as any)?.['x-chain'] || (headersObj as any)?.['X-CHAIN'] || 'solana';
  const body = options?.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : '';
  const cacheKey = `${method}:${chain}:${url}:${body}`;

  // Try to load from cache
  const cached = await getCachedData(cacheKey, ttl);
  if (cached !== null) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let res: Response | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    res = await fetch(url, options);
    
    if (res.status === 429) {
      // Fallback immediately to stale cache if rate limited
      const staleData = await getStaleCachedData(cacheKey);
      if (staleData !== null) {
        console.warn(`Rate limited (429) on ${url}, returning stale cached data immediately.`);
        return new Response(JSON.stringify(staleData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      const jitter = Math.random() * 500;
      const wait = Math.min(1000 * Math.pow(2, attempt) + jitter, 8000);
      console.warn(`Rate limited (429), retrying in ${Math.round(wait)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    
    break;
  }

  if (!res) {
    res = await fetch(url, options);
  }

  // If we still have a 429 and have stale cache, try fallback one last time
  if (res.status === 429) {
    const staleData = await getStaleCachedData(cacheKey);
    if (staleData !== null) {
      console.warn(`Rate limit failure on ${url}, returning stale cached data.`);
      return new Response(JSON.stringify(staleData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Cache and return if successful
  if (res.ok) {
    try {
      const clone = res.clone();
      const payload = await clone.json();
      await setCachedData(cacheKey, payload);
    } catch (e) {
      console.error('Failed to parse or cache response:', e);
    }
  }

  return res;
}

function mapJupiterToken(t: any): TrendingToken {
  return {
    address: t.id,
    symbol: t.symbol?.toUpperCase() || '',
    name: t.name || '',
    logoURI: t.icon || '',
    price: t.usdPrice || 0,
    priceChange24h: t.stats24h?.priceChange ?? 0,
    volume24h: (t.stats24h?.buyVolume || 0) + (t.stats24h?.sellVolume || 0),
    marketCap: t.mcap || 0,
    liquidity: t.liquidity || 0,
    holder: t.holderCount,
    fdv: t.fdv,
    isVerified: t.tags?.includes('verified') || false,
  };
}

/**
 * Generic v3 token list fetcher — supports all sort_by fields from the API
 */
export async function getTokenListV3(
  params: TokenListV3Params = {}
): Promise<TrendingToken[]> {
  const {
    sort_by = 'liquidity',
    sort_type = 'desc',
    offset = 0,
    limit = 20,
    min_liquidity,
    max_liquidity,
    min_market_cap,
    max_market_cap,
    min_fdv,
    max_fdv,
  } = params;

  try {
    let url = `${BIRDEYE_API_BASE}/defi/v3/token/list?sort_by=${sort_by}&sort_type=${sort_type}&offset=${offset}&limit=${limit}`;
    if (min_liquidity !== undefined) url += `&min_liquidity=${min_liquidity}`;
    if (max_liquidity !== undefined) url += `&max_liquidity=${max_liquidity}`;
    if (min_market_cap !== undefined) url += `&min_market_cap=${min_market_cap}`;
    if (max_market_cap !== undefined) url += `&max_market_cap=${max_market_cap}`;
    if (min_fdv !== undefined) url += `&min_fdv=${min_fdv}`;
    if (max_fdv !== undefined) url += `&max_fdv=${max_fdv}`;

    const res = await fetchWithRetry(url, {
      headers: getHeaders(),
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();

    const rawTokens: any[] = data.data?.items || data.data?.tokens || [];
    const tokens = rawTokens.filter((t: any) => {
      const liq = Number(t.liquidity || 0);
      const vol = Number(t.volume_24h_usd || t.v24hUSD || 0);
      return liq >= 100 || vol >= 100;
    });

    const result: TrendingToken[] = tokens.map((t: any) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      logoURI: t.logo_uri || t.logoURI || '',
      price: t.price || 0,
      priceChange24h: t.price_change_24h_percent || t.price24hChangePercent || 0,
      volume24h: t.volume_24h_usd || t.v24hUSD || 0,
      marketCap: t.market_cap || t.mc || 0,
      liquidity: t.liquidity || 0,
      holder: t.holder,
      fdv: t.fdv,
      trade24hCount: t.trade_24h_count,
      globalFeesPaid: t.global_fees_paid,
      lastTradeUnixTime: t.last_trade_unix_time,
      recentListingTime: t.recent_listing_time,
      priceChange5m: t.price_change_5m_percent,
      priceChange1h: t.price_change_1h_percent,
      volume5m: t.volume_5m_usd,
      volume1h: t.volume_1h_usd,
      trade5mCount: t.trade_5m_count,
      trade1hCount: t.trade_1h_count,
      uniqueWallet24h: t.unique_wallet_24h,
    }));

    return result;
  } catch (error) {
    console.error('BirdEye token list failed:', error);
    return [];
  }
}

/**
 * Get trending tokens — uses v3 with momentum sort (price_change_5m_percent desc)
 */
export async function getTrendingTokens(limit = 20, offset = 0): Promise<TrendingToken[]> {
  const tokens = await getTokenListV3({
    sort_by: 'price_change_5m_percent',
    sort_type: 'desc',
    limit,
    offset,
    min_liquidity: 100,
  });
  if (tokens.length > 0) return convertToSol(tokens);

  const fallback = await jupiterFetch(`/toptraded/24h?limit=${Math.min(limit, 100)}`);
  if (!fallback.ok) return [];
  const data: any[] = await fallback.json();
  return convertToSol(data.slice(0, limit).map(mapJupiterToken));
}

/**
 * Overall trending using CMC/CG-style formula:
 *   Trend Score = w1 × ΔP + w2 × ΔV + w3 × S + w4 × Q
 *
 *   ΔP = price change %     — priceChange5m + priceChange1h
 *   ΔV = volume growth %     — (5m_rate - 1h_rate) / 1h_rate
 *   S  = engagement          — trade counts + unique wallets
 *   Q  = unique interest     — uniqueWallet24h
 */
export async function getOverallTrendingTokens(limit = 50): Promise<TrendingToken[]> {
  const W = { dP: 0.30, dV: 0.35, S: 0.20, Q: 0.15 };

  let tokens = await getTokenListV3({
    sort_by: 'volume_5m_usd',
    sort_type: 'desc',
    limit: 100,
    min_liquidity: 100,
  });

  if (tokens.length === 0) {
    const fallback = await jupiterFetch('/toptraded/24h?limit=100');
    if (fallback.ok) {
      tokens = (await fallback.json()).map(mapJupiterToken);
    }
  }

  if (tokens.length === 0) return [];

  const withVolGrowth = tokens.map(t => {
    const vol5m = t.volume5m || 0;
    const vol1h = t.volume1h || 0;
    const rate5m = vol5m / 5;
    const rate1h = vol1h / 60;
    const volGrowth = rate1h > 0 ? (rate5m - rate1h) / rate1h : rate5m > 0 ? 2 : 0;
    return { ...t, _volGrowth: Math.max(volGrowth, 0) };
  });

  const max_dP = Math.max(...withVolGrowth.map(t => Math.abs(t.priceChange5m || 0) * 0.6 + Math.abs(t.priceChange1h || 0) * 0.4), 1);
  const max_dV = Math.max(...withVolGrowth.map(t => t._volGrowth), 1);
  const max_S = Math.max(...withVolGrowth.map(t => (t.trade1hCount || 0) * 0.5 + (t.uniqueWallet24h || 0) * 0.5), 1);
  const max_Q = Math.max(...withVolGrowth.map(t => t.uniqueWallet24h || 0), 1);

  for (const t of withVolGrowth) {
    const dP = (Math.abs(t.priceChange5m || 0) * 0.6 + Math.abs(t.priceChange1h || 0) * 0.4) / max_dP;
    const dV = t._volGrowth / max_dV;
    const S = ((t.trade1hCount || 0) * 0.5 + (t.uniqueWallet24h || 0) * 0.5) / max_S;
    const Q = (t.uniqueWallet24h || 0) / max_Q;

    t.overallScore = dP * W.dP + dV * W.dV + S * W.S + Q * W.Q;
  }

  withVolGrowth.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
  return convertToSol(withVolGrowth.slice(0, limit));
}

/**
 * Get most held tokens — uses v3 sorted by holder desc with safety filters
 */
export async function getMostHeldTokens(limit = 50): Promise<TrendingToken[]> {
  const tokens = await getTokenListV3({
    sort_by: 'holder',
    sort_type: 'desc',
    limit,
    min_liquidity: 50000,
    min_market_cap: 100000,
  });
  if (tokens.length > 0) return convertToSol(tokens);

  const verified = await getVerifiedTokenList();
  const withHolder = verified.filter((t: any) => t.holderCount > 0 && t.mcap >= 100000);
  withHolder.sort((a: any, b: any) => (b.holderCount || 0) - (a.holderCount || 0));
  return convertToSol(withHolder.slice(0, limit).map(mapJupiterToken));
}

/**
 * Get top crypto tokens across chains
 */
export async function getCryptoTokens(limit = 30): Promise<TrendingToken[]> {
  const chains = ['ethereum', 'solana', 'bsc'];
  const results: TrendingToken[] = [];

  for (const chain of chains) {
    if (results.length >= limit) break;
    try {
      const res = await fetchWithRetry(
        `${BIRDEYE_API_BASE}/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${limit}`,
        {
          headers: { 'X-API-KEY': BIRDEYE_API_KEY, 'x-chain': chain, accept: 'application/json' },
          next: { revalidate: 60 },
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const rawTokens: any[] = data.data?.items || data.data?.tokens || [];
      for (const t of rawTokens) {
        const liq = Number(t.liquidity || 0);
        const vol = Number(t.volume24hUSD || t.volume24h || t.v24hUSD || 0);
        if (liq < 100 && vol < 100) continue;
        if (results.some(r => r.symbol === t.symbol)) continue;
        results.push({
          address: t.address,
          symbol: t.symbol,
          name: t.name,
          logoURI: t.logoURI || t.logo_uri || '',
          price: t.price || 0,
          priceChange24h: t.price24hChangePercent || t.priceChange24hPercent || t.price_change_24h_percent || 0,
          volume24h: t.volume24hUSD || t.volume24h || t.v24hUSD || 0,
          marketCap: t.marketcap || t.mc || t.marketCap || 0,
          liquidity: liq,
        });
      }
    } catch {
      continue;
    }
  }

  if (results.length > 0) {
    results.sort((a, b) => b.marketCap - a.marketCap);
    return convertToSol(results.slice(0, limit));
  }

  console.error('BirdEye crypto failed, using Jupiter fallback');
  const fallback = await jupiterFetch(`/toptraded/24h?limit=${Math.min(limit, 100)}`);
  if (!fallback.ok) return [];
  const tokens: any[] = await fallback.json();
  return convertToSol(tokens.slice(0, limit).map(mapJupiterToken));
}

/**
 * Get bonding (pre-graduation) tokens
 */
export async function getBondingTokens(limit = 30): Promise<TrendingToken[]> {
  try {
    const res = await fetchWithRetry(
      `${BIRDEYE_API_BASE}/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${limit}`,
      {
        headers: getHeaders(),
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();
    const rawTokens: any[] = data.data?.tokens || [];

    const result: TrendingToken[] = rawTokens
      .filter((t: any) => {
        const liq = Number(t.liquidity || 0);
        const vol = Number(t.volume24hUSD || t.volume24h || t.v24hUSD || 0);
        return liq >= 100 || vol >= 100;
      })
      .slice(0, limit)
      .map((t: any) => {
        const address = t.address || '';
        const dex = address.endsWith('pump') ? 'Pump.fun' : 'Raydium';
        return {
          address,
          symbol: t.symbol,
          name: t.name,
          logoURI: t.logoURI || t.logo_uri || '',
          price: t.price || 0,
          priceChange24h: t.price24hChangePercent || t.priceChange24hPercent || t.price_change_24h_percent || 0,
          volume24h: t.volume24hUSD || t.volume24h || t.v24hUSD || 0,
          marketCap: t.marketcap || t.mc || t.marketCap || 0,
          liquidity: Number(t.liquidity || 0),
          dex,
          bonding: 70,
        } as TrendingToken;
      });

    return convertToSol(result);
  } catch (error) {
    console.error('BirdEye bonding failed, using Jupiter fallback:', error);
    const fallback = await jupiterFetch(`/recent?limit=${Math.min(limit, 100)}`);
    if (!fallback.ok) return [];
    const tokens: any[] = await fallback.json();
    return convertToSol(tokens.slice(0, limit).map(mapJupiterToken));
  }
}

/**
 * Get recently graduated tokens
 */
export async function getGraduatedTokens(limit = 30): Promise<TrendingToken[]> {
  try {
    const res = await fetchWithRetry(
      `${BIRDEYE_API_BASE}/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${limit}`,
      {
        headers: getHeaders(),
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();
    const rawTokens: any[] = data.data?.tokens || [];

    const result: TrendingToken[] = rawTokens
      .filter((t: any) => {
        const liq = Number(t.liquidity || 0);
        const vol = Number(t.volume24hUSD || t.volume24h || t.v24hUSD || 0);
        return liq >= 100 || vol >= 100;
      })
      .slice(0, limit)
      .map((t: any) => {
        const address = t.address || '';
        const dex = address.endsWith('pump') ? 'Pump.fun' : 'Raydium';
        return {
          address,
          symbol: t.symbol,
          name: t.name,
          logoURI: t.logoURI || t.logo_uri || '',
          price: t.price || 0,
          priceChange24h: t.price24hChangePercent || t.priceChange24hPercent || t.price_change_24h_percent || 0,
          volume24h: t.volume24hUSD || t.volume24h || t.v24hUSD || 0,
          marketCap: t.marketcap || t.mc || t.marketCap || 0,
          liquidity: Number(t.liquidity || 0),
          dex,
          graduated: true,
        } as TrendingToken;
      });

    return convertToSol(result);
  } catch (error) {
    console.error('BirdEye graduated failed, using Jupiter fallback:', error);
    const fallback = await jupiterFetch(`/toporganicscore/24h?limit=${Math.min(limit, 100)}`);
    if (!fallback.ok) return [];
    const tokens: any[] = await fallback.json();
    return convertToSol(tokens.slice(0, limit).map(mapJupiterToken));
  }
}

const JUPITER_TOKENS_API = 'https://api.jup.ag/tokens/v2';

async function jupiterFetch(path: string, options?: RequestInit) {
  return fetch(`${JUPITER_TOKENS_API}${path}`, {
    ...options,
    headers: { 'x-api-key': JUPITER_API_KEY, ...options?.headers },
    next: { revalidate: 300 },
  });
}



/**
 * Get token overview by address
 */
export async function getTokenOverview(address: string): Promise<TokenOverview | null> {
  try {
    const res = await fetchWithRetry(
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

    const solPrice = await getSolPrice();
    const sPrice = solPrice > 0 ? solPrice : 150;

    return {
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      logoURI: t.logoURI || t.logo_uri || '',
      price: (t.price || 0) / sPrice,
      priceChange24h: t.priceChange24hPercent || 0,
      priceChange1h: t.priceChange1hPercent || 0,
      volume24h: (t.v24hUSD || 0) / sPrice,
      marketCap: (t.mc || 0) / sPrice,
      liquidity: (t.liquidity || 0) / sPrice,
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
 * Get token metadata with social links via v3 API
 */
export async function getTokenMetadataV3(address: string): Promise<TokenMetadataV3 | null> {
  try {
    const res = await fetchWithRetry(
      `${BIRDEYE_API_BASE}/defi/v3/token/meta-data/single?address=${address}`,
      {
        headers: getHeaders(),
        next: { revalidate: 300 },
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
      decimals: t.decimals || 9,
      extensions: t.extensions,
      logo_uri: t.logo_uri || '',
    };
  } catch (error) {
    console.error('Failed to fetch token metadata v3:', error);
    return null;
  }
}

/**
 * Get price history for charts (v3 OHLCV)
 */
export async function getPriceHistory(
  address: string,
  type: '1m' | '3m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H' | '6H' | '8H' | '12H' | '1D' | '3D' | '1W' | '1M' = '1D',
  timeFrom?: number,
  timeTo?: number
): Promise<any[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = timeFrom || now - 86400;
    const to = timeTo || now;

    const res = await fetchWithRetry(
      `${BIRDEYE_API_BASE}/defi/v3/ohlcv?address=${address}&type=${type}&time_from=${from}&time_to=${to}`,
      {
        headers: getHeaders(),
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();

    const solPrice = await getSolPrice();
    const sPrice = solPrice > 0 ? solPrice : 150;

    return (data.data?.items || []).map((item: any) => ({
      unixTime: item.unixTime ?? item.unix_time,
      open: (item.o ?? item.open) / sPrice,
      high: (item.h ?? item.high) / sPrice,
      low: (item.l ?? item.low) / sPrice,
      close: (item.c ?? item.close) / sPrice,
      volume: (item.v ?? item.volume ?? 0) / sPrice,
    }));
  } catch (error) {
    console.error('Failed to fetch price history:', error);
    return [];
  }
}

/**
 * Background helper to sync token trades to Supabase trades and users tables
 */
async function syncTokenTradesToSupabase(trades: TradeItem[], tokenAddress: string) {
  try {
    if (!trades || trades.length === 0) return;

    const uniqueOwners = Array.from(new Set(trades.map(t => t.owner).filter(Boolean)));
    if (uniqueOwners.length > 0) {
      const userPayloads = uniqueOwners.map(owner => ({
        wallet_address: owner,
        display_name: owner.slice(0, 6) + '...' + owner.slice(-4),
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${owner}`,
        updated_at: new Date().toISOString()
      }));
      await supabase.from('users').upsert(userPayloads, { onConflict: 'wallet_address' });
    }

    const tradesPayload = trades.map(t => {
      const solPriceEst = 150;
      const amountVal = t.side === 'buy' ? t.to?.uiAmount || 0 : t.from?.uiAmount || 0;
      const tokenPriceUsd = t.volumeUSD / (amountVal || 1);
      return {
        wallet_address: t.owner,
        token_address: tokenAddress,
        token_symbol: t.side === 'buy' ? t.to?.symbol || 'UNKNOWN' : t.from?.symbol || 'UNKNOWN',
        token_name: t.side === 'buy' ? t.to?.symbol || 'UNKNOWN' : t.from?.symbol || 'UNKNOWN',
        token_logo_uri: null,
        type: t.side,
        amount: amountVal,
        sol_amount: t.volumeUSD / solPriceEst,
        price: tokenPriceUsd / solPriceEst,
        price_usd: tokenPriceUsd,
        signature: t.txHash,
        created_at: new Date(t.blockUnixTime * 1000).toISOString()
      };
    });

    await supabase.from('trades').upsert(tradesPayload, { onConflict: 'signature' });
  } catch (e) {
    console.error('Failed to sync token trades to Supabase:', e);
  }
}

/**
 * Get recent trades for a token (v3)
 */
export async function getTokenTrades(address: string, limit = 20): Promise<TradeItem[]> {
  try {
    const res = await fetchWithRetry(
      `${BIRDEYE_API_BASE}/defi/v3/token/txs?address=${address}&offset=0&limit=${limit}&sort_by=block_unix_time&sort_type=desc&tx_type=swap`,
      {
        headers: getHeaders(),
        next: { revalidate: 15 },
      }
    );

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();

    const items = (data.data?.items || []).map((tx: Record<string, unknown>) => ({
      txHash: (tx as any).txHash ?? (tx as any).tx_hash,
      blockUnixTime: (tx as any).blockUnixTime ?? (tx as any).block_unix_time,
      source: tx.source ?? (tx as any).source,
      owner: tx.owner ?? (tx as any).owner,
      from: tx.from ?? (tx as any).from,
      to: tx.to ?? (tx as any).to,
      side: tx.side ?? (tx as any).side,
      volumeUSD: (tx as any).volumeUSD ?? (tx as any).volume_usd,
    }));

    // Sync token trades to Supabase in the background
    syncTokenTradesToSupabase(items, address).catch(e => 
      console.error('syncTokenTradesToSupabase failed:', e)
    );

    return items;
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
    const res = await fetchWithRetry(
      `${BIRDEYE_API_BASE}/defi/v3/search?keyword=${encodeURIComponent(keyword)}&chain=solana&target=token&sort_by=volume_24h_usd&sort_type=desc&limit=10`,
      {
        headers: getHeaders(),
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();

    const items = (data.data?.items?.[0]?.result || []).map((t: Record<string, unknown>) => ({
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
    return await convertToSol(items);
  } catch (error) {
    console.error('BirdEye search failed, using Jupiter fallback:', error);
    try {
      const fallback = await jupiterFetch(`/search?query=${encodeURIComponent(keyword)}`);
      if (!fallback.ok) return [];
      const tokens: any[] = await fallback.json();
      return await convertToSol(tokens.slice(0, 10).map(mapJupiterToken));
    } catch {
      return [];
    }
  }
}

// --- Leaderboard & Wallet PnL types ---

export interface LeaderboardEntry {
  owner: string;
  total_value: number;
}

export interface WalletPnlToken {
  symbol: string;
  decimals: number;
  address: string;
  counts: {
    total_buy: number;
    total_sell: number;
    total_trade: number;
  };
  quantity: {
    total_bought_amount: number;
    total_sold_amount: number;
    holding: number;
  };
  cashflow_usd: {
    cost_of_quantity_sold: number;
    total_invested: number;
    total_sold: number;
    current_value: number;
  };
  pnl: {
    realized_profit_usd: number;
    realized_profit_percent: number;
    unrealized_usd: number;
    unrealized_percent: number;
    total_usd: number;
    total_percent: number;
    avg_profit_per_trade_usd: number;
  };
  pricing: {
    current_price: number | null;
    avg_buy_cost: number;
    avg_sell_cost: number;
  };
}

export interface WalletPnlSummary {
  unique_tokens: number;
  counts: {
    total_buy: number;
    total_sell: number;
    total_trade: number;
    total_win: number;
    total_loss: number;
    win_rate: number;
  };
  cashflow_usd: {
    total_invested: number;
    total_sold: number;
    current_value: number;
  };
  pnl: {
    realized_profit_usd: number;
    realized_profit_percent: number;
    unrealized_usd: number;
    total_usd: number;
    avg_profit_per_trade_usd: number;
  };
}

export interface WalletPnlDetailsResponse {
  meta: {
    address: string;
    currency: string;
    holding_check: boolean;
    time: string;
  };
  tokens: WalletPnlToken[];
  summary: WalletPnlSummary;
}

/**
 * Get wallet leaderboard sorted by total asset value
 */
export async function getLeaderboard(limit = 20, offset = 0): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetchWithRetry(
      `${BIRDEYE_API_BASE}/wallet/v2/leaderboard?limit=${limit}&offset=${offset}`,
      {
        headers: getHeaders(),
        next: { revalidate: 120 },
      }
    );

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();

    return (data.data || []).map((entry: any) => ({
      owner: entry.owner,
      total_value: entry.total_value || 0,
    }));
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return [];
  }
}

export interface LeaderboardPnlEntry {
  owner: string;
  total_value: number;
  pnl: number;
}

// --- Leaderboard & Wallet PnL Cache ---
const pnlCache: Record<string, { data: WalletPnlDetailsResponse | null; timestamp: number }> = {};
const PNL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const leaderboardDurationCache: Record<string, { data: LeaderboardPnlEntry[]; timestamp: number }> = {};
const LEADERBOARD_DURATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function pnlBatch(
  wallets: { owner: string; total_value: number }[],
  duration: 'all' | '90d' | '30d' | '7d' | '24h',
  concurrency = 1
): Promise<LeaderboardPnlEntry[]> {
  const entries: LeaderboardPnlEntry[] = [];
  for (let i = 0; i < wallets.length; i += concurrency) {
    const batch = wallets.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (w) => {
        const details = await getWalletPnlDetails(w.owner, duration);
        const pnl = details?.summary?.pnl?.total_usd;
        if (pnl == null) throw new Error('No PnL data');
        return { owner: w.owner, total_value: w.total_value, pnl };
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') entries.push(r.value);
    }
    if (i + concurrency < wallets.length) {
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }
  return entries;
}

async function syncDefaultWatchlistForLeaderboard(wallets: { owner: string }[]) {
  try {
    const trending = await getTokenListV3({
      sort_by: 'volume_24h_usd',
      sort_type: 'desc',
      limit: 5,
      min_liquidity: 10000
    });

    if (trending.length === 0) return;

    const watchlistPayloads: any[] = [];
    for (const w of wallets) {
      for (const t of trending) {
        watchlistPayloads.push({
          wallet_address: w.owner,
          token_address: t.address,
          token_symbol: t.symbol || 'UNKNOWN',
          token_name: t.name || 'UNKNOWN',
          token_logo_uri: t.logoURI || null,
          created_at: new Date().toISOString()
        });
      }
    }

    if (watchlistPayloads.length > 0) {
      await supabase.from('watchlist').upsert(watchlistPayloads, { onConflict: 'wallet_address, token_address' });
    }
  } catch (e) {
    console.error('Failed to sync default watchlist for leaderboard users:', e);
  }
}

const THESIS_CONTENT_TEMPLATES = [
  "Strong accumulation patterns on 1H chart. Liquidity depth supports massive breakout potential here.",
  "Holding the key support level beautifully. Volume growth shows strong buyers stepping in.",
  "Excellent gainer momentum. Bullish structure confirmed by high social volume and whale interest.",
  "Solana ecosystem token. Ready for continuation after current consolidation phase.",
  "Liquidity-to-marketcap ratio is super healthy. Looking to add more on dips."
];

async function syncDefaultThesesForLeaderboard(wallets: { owner: string }[]) {
  try {
    const trending = await getTokenListV3({
      sort_by: 'volume_24h_usd',
      sort_type: 'desc',
      limit: 3,
      min_liquidity: 10000
    });

    if (trending.length === 0) return;

    for (const w of wallets) {
      for (const t of trending) {
        const { data } = await supabase
          .from('theses')
          .select('id')
          .eq('user_id', w.owner)
          .eq('token_address', t.address)
          .maybeSingle();

        if (!data) {
          const randContent = THESIS_CONTENT_TEMPLATES[Math.floor(Math.random() * THESIS_CONTENT_TEMPLATES.length)];
          // Look up the user's actual trade timestamp for this token
          const { data: userTrade } = await supabase
            .from('trades')
            .select('created_at')
            .eq('wallet_address', w.owner)
            .eq('token_address', t.address)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          let thesisTime = userTrade?.created_at;
          if (!thesisTime) {
            const hoursAgo = Math.random() * 12;
            thesisTime = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
          }

          await supabase.from('theses').insert({
            user_id: w.owner,
            token_address: t.address,
            content: randContent,
            hearts: Math.floor(Math.random() * 50) + 5,
            created_at: thesisTime
          });
        }
      }
    }
  } catch (e) {
    console.error('Failed to sync default theses for leaderboard:', e);
  }
}

export async function getLeaderboardByDuration(
  limit = 30,
  duration: 'all' | '90d' | '30d' | '7d' | '24h' = 'all'
): Promise<LeaderboardPnlEntry[]> {
  const cacheKey = `${limit}_${duration}`;
  const now = Date.now();
  if (
    leaderboardDurationCache[cacheKey] &&
    now - leaderboardDurationCache[cacheKey].timestamp < LEADERBOARD_DURATION_CACHE_TTL
  ) {
    return leaderboardDurationCache[cacheKey].data;
  }

  // Check database cache for Compiled Leaderboard
  const dbCacheKey = `leaderboard_${limit}_${duration}`;
  try {
    const { data, error } = await supabase
      .from('api_cache')
      .select('data, updated_at')
      .eq('key', dbCacheKey)
      .single();
      
    if (data && !error) {
      const updatedAt = new Date(data.updated_at).getTime();
      if (now - updatedAt < LEADERBOARD_DURATION_CACHE_TTL) {
        leaderboardDurationCache[cacheKey] = {
          data: data.data,
          timestamp: updatedAt,
        };
        return data.data;
      }
    }
  } catch (e) {
    console.error('Supabase leaderboard cache read failed:', e);
  }

  try {
    const wallets = await getLeaderboard(limit, 0);
    if (wallets.length === 0) {
      const staleLeaderboard = await getStaleCachedData(dbCacheKey);
      if (staleLeaderboard) {
        console.warn('Leaderboard fetch failed, returning stale leaderboard cache.');
        return staleLeaderboard;
      }
      return [];
    }

    // Sync leaderboard users to Supabase users table
    try {
      const userPayloads = wallets.map(w => ({
        wallet_address: w.owner,
        display_name: w.owner.slice(0, 6) + '...' + w.owner.slice(-4),
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.owner}`,
        updated_at: new Date().toISOString()
      }));
      await supabase.from('users').upsert(userPayloads, { onConflict: 'wallet_address' });
    } catch (e) {
      console.error('Failed to sync leaderboard users to Supabase:', e);
    }

    // Sync default watchlists and theses for leaderboard users
    syncDefaultWatchlistForLeaderboard(wallets).catch(e => console.error(e));
    syncDefaultThesesForLeaderboard(wallets).catch(e => console.error(e));

    const entries = await pnlBatch(wallets, duration, 1);
    entries.sort((a, b) => b.pnl - a.pnl);

    leaderboardDurationCache[cacheKey] = {
      data: entries,
      timestamp: now,
    };

    // Save compiled leaderboard to database cache
    try {
      await supabase.from('api_cache').upsert({
        key: dbCacheKey,
        data: entries,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to cache leaderboard in Supabase:', e);
    }

    return entries;
  } catch (error) {
    console.error('Failed to fetch leaderboard by duration:', error);
    const staleLeaderboard = await getStaleCachedData(dbCacheKey);
    if (staleLeaderboard) {
      return staleLeaderboard;
    }
    return [];
  }
}

/**
 * Background helper to sync wallet user and holding records to Supabase tables
 */
async function syncWalletDataToSupabase(wallet: string, details: WalletPnlDetailsResponse) {
  try {
    const shortName = wallet.slice(0, 6) + '...' + wallet.slice(-4);
    await supabase.from('users').upsert({
      wallet_address: wallet,
      display_name: shortName,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${wallet}`,
      updated_at: new Date().toISOString()
    }, { onConflict: 'wallet_address' });

    if (details.tokens && details.tokens.length > 0) {
      const holdingsPayload = details.tokens.map(t => ({
        wallet_address: wallet,
        token_address: t.address,
        token_symbol: t.symbol?.toUpperCase() || 'UNKNOWN',
        token_name: t.symbol || 'UNKNOWN',
        token_logo_uri: null,
        balance: t.quantity?.holding || 0,
        avg_entry: t.pricing?.avg_buy_cost || 0,
        updated_at: new Date().toISOString()
      }));

      await supabase.from('holdings').upsert(holdingsPayload, { onConflict: 'wallet_address, token_address' });
    }
  } catch (e) {
    console.error('Failed to sync wallet holdings to Supabase:', e);
  }
}

/**
 * Get PnL details for a specific wallet
 */
export async function getWalletPnlDetails(
  wallet: string,
  duration: 'all' | '90d' | '30d' | '7d' | '24h' = 'all'
): Promise<WalletPnlDetailsResponse | null> {
  const cacheKey = `${wallet}_${duration}`;
  const now = Date.now();
  if (
    pnlCache[cacheKey] &&
    now - pnlCache[cacheKey].timestamp < PNL_CACHE_TTL
  ) {
    return pnlCache[cacheKey].data;
  }

  try {
    const res = await fetchWithRetry(`${BIRDEYE_API_BASE}/wallet/v2/pnl/details`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet,
        duration,
        sort_by: 'last_trade',
        sort_type: 'desc',
        limit: 10,
      }),
    });

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();
    const result = data.data || null;

    if (result) {
      // Sync user and holding records to Supabase in the background
      syncWalletDataToSupabase(wallet, result).catch(e => 
        console.error('syncWalletDataToSupabase failed:', e)
      );
    }

    pnlCache[cacheKey] = {
      data: result,
      timestamp: now,
    };

    return result;
  } catch (error) {
    console.error('Failed to fetch wallet PnL details:', error);
    return null;
  }
}

/**
 * Get token trades (v3) with various filters
 */
export async function getTokenTradesV3(
  address: string,
  options: {
    limit?: number;
    offset?: number;
    tx_type?: 'swap' | 'buy' | 'sell' | 'add' | 'remove' | 'all';
    sort_type?: 'asc' | 'desc';
    before_time?: number;
    after_time?: number;
  } = {}
): Promise<TradeItem[]> {
  const { limit = 100, offset = 0, tx_type = 'swap', sort_type = 'desc', before_time, after_time } = options;

  try {
    let url = `${BIRDEYE_API_BASE}/defi/v3/token/txs?address=${address}&offset=${offset}&limit=${limit}&sort_by=block_unix_time&sort_type=${sort_type}&tx_type=${tx_type}`;
    if (before_time) url += `&before_time=${before_time}`;
    if (after_time) url += `&after_time=${after_time}`;

    const res = await fetchWithRetry(url, {
      headers: getHeaders(),
      next: { revalidate: 15 },
    });

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();

    const items = (data.data?.items || []).map((tx: any) => ({
      txHash: tx.txHash,
      blockUnixTime: tx.blockUnixTime,
      source: tx.source,
      owner: tx.owner,
      from: tx.from,
      to: tx.to,
      side: tx.side,
      volumeUSD: tx.volumeUSD,
    }));

    // Sync token trades to Supabase in the background
    syncTokenTradesToSupabase(items, address).catch(e => 
      console.error('syncTokenTradesToSupabase failed:', e)
    );

    return items;
  } catch (error) {
    console.error('Failed to fetch token trades v3:', error);
    return [];
  }
}
