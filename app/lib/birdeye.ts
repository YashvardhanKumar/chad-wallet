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
    const res = await fetch(
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

/**
 * Get PnL details for a specific wallet
 */
export async function getWalletPnlDetails(
  wallet: string,
  duration: 'all' | '90d' | '30d' | '7d' | '24h' = 'all'
): Promise<WalletPnlDetailsResponse | null> {
  try {
    const res = await fetch(`${BIRDEYE_API_BASE}/wallet/v2/pnl/details`, {
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

    return data.data || null;
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

    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 15 },
    });

    if (!res.ok) throw new Error(`BirdEye API error: ${res.status}`);
    const data = await res.json();

    return (data.data?.items || []).map((tx: any) => ({
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
    console.error('Failed to fetch token trades v3:', error);
    return [];
  }
}
