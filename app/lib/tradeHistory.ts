import { supabase } from './supabase';

export interface TradeRecord {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string | null;
  tokenLogoURI: string | null;
  type: 'buy' | 'sell';
  amount: number;
  solAmount: number;
  price: number;
  priceUsd: number;
  timestamp: number;
  signature: string;
}

export interface HoldingRecord {
  walletAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string | null;
  tokenLogoURI: string | null;
  balance: number;
  avgEntry: number | null;
}

const LS_KEY_TRADES = 'chadwallet_trades';
const LS_KEY_WATCHLIST = 'chadwallet_watchlist';

function isTableNotFound(err: any): boolean {
  const msg = err?.message || err?.code || '';
  return msg.includes('PGRST205') || msg.includes('Could not find the table');
}

function lsGetTrades(walletAddress: string): TradeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LS_KEY_TRADES}_${walletAddress}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsSaveTrade(walletAddress: string, trade: TradeRecord) {
  if (typeof window === 'undefined') return;
  const trades = lsGetTrades(walletAddress);
  trades.unshift(trade);
  localStorage.setItem(`${LS_KEY_TRADES}_${walletAddress}`, JSON.stringify(trades));
}

// ---------- Users ----------

export async function upsertUser(
  walletAddress: string,
  data: {
    privy_did?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    username?: string | null;
    bio?: string | null;
    bannerUrl?: string | null;
    xUsername?: string | null;
  }
) {
  const payload: any = {
    wallet_address: walletAddress,
    updated_at: new Date().toISOString(),
  };

  if (data.privy_did !== undefined) payload.privy_did = data.privy_did;
  if (data.displayName !== undefined) payload.display_name = data.displayName;
  if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
  if (data.username !== undefined) payload.username = data.username;
  if (data.bio !== undefined) payload.bio = data.bio;
  if (data.bannerUrl !== undefined) payload.banner_url = data.bannerUrl;
  if (data.xUsername !== undefined) payload.x_username = data.xUsername;

  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'wallet_address' });
  if (error && !isTableNotFound(error)) console.error('Failed to upsert user:', error);
}

export async function getUserByUsername(username: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user by username:', error);
    return null;
  }
  return data;
}

export async function getUserByWallet(walletAddress: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user by wallet:', error);
    return null;
  }
  return data;
}

// ---------- Trades ----------

export async function saveTrade(
  walletAddress: string,
  record: Omit<TradeRecord, 'id' | 'timestamp'>
) {
  await upsertUser(walletAddress, {});

  const newTrade: TradeRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  // Try Supabase first
  const { error } = await supabase.from('trades').insert({
    wallet_address: walletAddress,
    token_address: record.tokenAddress,
    token_symbol: record.tokenSymbol,
    token_name: record.tokenName,
    token_logo_uri: record.tokenLogoURI,
    type: record.type,
    amount: record.amount,
    sol_amount: record.solAmount,
    price: record.price,
    price_usd: record.priceUsd,
    signature: record.signature,
  });

  if (error && isTableNotFound(error)) {
    // Fallback to localStorage
    lsSaveTrade(walletAddress, newTrade);
  } else if (error) {
    console.error('Failed to save trade:', error);
    lsSaveTrade(walletAddress, newTrade);
  }
}

export async function getTrades(walletAddress: string): Promise<TradeRecord[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false });

  if (error && isTableNotFound(error)) {
    return lsGetTrades(walletAddress);
  }

  if (error || !data) {
    console.error('Failed to fetch trades:', error);
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    tokenAddress: t.token_address,
    tokenSymbol: t.token_symbol,
    tokenName: t.token_name,
    tokenLogoURI: t.token_logo_uri,
    type: t.type as 'buy' | 'sell',
    amount: Number(t.amount),
    solAmount: Number(t.sol_amount),
    price: Number(t.price),
    priceUsd: Number(t.price_usd),
    timestamp: new Date(t.created_at).getTime(),
    signature: t.signature || '',
  }));
}

// ---------- Holdings ----------

export async function upsertHolding(
  walletAddress: string,
  holding: {
    tokenAddress: string;
    tokenSymbol: string;
    tokenName: string | null;
    tokenLogoURI: string | null;
    balance: number;
    avgEntry: number | null;
  }
) {
  const { error } = await supabase.from('holdings').upsert(
    {
      wallet_address: walletAddress,
      token_address: holding.tokenAddress,
      token_symbol: holding.tokenSymbol,
      token_name: holding.tokenName,
      token_logo_uri: holding.tokenLogoURI,
      balance: holding.balance,
      avg_entry: holding.avgEntry,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'wallet_address, token_address' }
  );
  if (error && !isTableNotFound(error)) console.error('Failed to upsert holding:', error);
}

// ---------- Watchlist ----------

function lsGetWatchlist(walletAddress: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LS_KEY_WATCHLIST}_${walletAddress}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function lsSetWatchlist(walletAddress: string, addresses: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${LS_KEY_WATCHLIST}_${walletAddress}`, JSON.stringify(addresses));
}

export async function addToWatchlist(walletAddress: string, token: { address: string; symbol: string; name: string; logoURI: string }) {
  const { error } = await supabase.from('watchlist').upsert(
    {
      wallet_address: walletAddress,
      token_address: token.address,
      token_symbol: token.symbol,
      token_name: token.name,
      token_logo_uri: token.logoURI,
    },
    { onConflict: 'wallet_address, token_address' }
  );
  if (error && isTableNotFound(error)) {
    const list = lsGetWatchlist(walletAddress);
    if (!list.includes(token.address)) {
      list.push(token.address);
      lsSetWatchlist(walletAddress, list);
    }
  } else if (error) {
    console.error('Failed to add to watchlist:', error);
  }
}

export async function removeFromWatchlist(walletAddress: string, tokenAddress: string) {
  const { error } = await supabase.from('watchlist').delete().match({
    wallet_address: walletAddress,
    token_address: tokenAddress,
  });
  if (error && isTableNotFound(error)) {
    const list = lsGetWatchlist(walletAddress).filter(a => a !== tokenAddress);
    lsSetWatchlist(walletAddress, list);
  } else if (error) {
    console.error('Failed to remove from watchlist:', error);
  }
}

export async function getWatchlistAddresses(walletAddress: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('watchlist')
    .select('token_address')
    .eq('wallet_address', walletAddress);

  if (error && isTableNotFound(error)) {
    return lsGetWatchlist(walletAddress);
  }
  if (error || !data) {
    console.error('Failed to fetch watchlist:', error);
    return [];
  }
  return data.map(w => w.token_address);
}

export async function getWatchlistTokens(walletAddress: string): Promise<{ token_address: string; token_symbol: string; token_name: string | null; token_logo_uri: string | null }[]> {
  const { data, error } = await supabase
    .from('watchlist')
    .select('token_address, token_symbol, token_name, token_logo_uri')
    .eq('wallet_address', walletAddress);

  if (error && isTableNotFound(error)) {
    return [];
  }
  if (error || !data) {
    console.error('Failed to fetch watchlist tokens:', error);
    return [];
  }
  return data;
}

// ---------- Holdings ----------

export async function getHoldings(walletAddress: string): Promise<HoldingRecord[]> {
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .eq('wallet_address', walletAddress);

  if (error && isTableNotFound(error)) {
    return [];
  }

  if (error || !data) {
    console.error('Failed to fetch holdings:', error);
    return [];
  }

  return data.map((h: any) => ({
    walletAddress: h.wallet_address,
    tokenAddress: h.token_address,
    tokenSymbol: h.token_symbol,
    tokenName: h.token_name,
    tokenLogoURI: h.token_logo_uri,
    balance: Number(h.balance),
    avgEntry: h.avg_entry ? Number(h.avg_entry) : null,
  }));
}

// ---------- Follows ----------

export async function followUser(followerAddress: string, followingAddress: string) {
  const { error } = await supabase.from('follows').upsert(
    {
      follower_address: followerAddress,
      following_address: followingAddress,
    },
    { onConflict: 'follower_address, following_address' }
  );
  if (error) console.error('Failed to follow user:', error);
}

export async function unfollowUser(followerAddress: string, followingAddress: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .match({ follower_address: followerAddress, following_address: followingAddress });
  if (error) console.error('Failed to unfollow user:', error);
}

export async function isFollowing(followerAddress: string, followingAddress: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_address', followerAddress)
    .eq('following_address', followingAddress)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

export async function getFollowsCount(walletAddress: string): Promise<{ followers: number; following: number }> {
  const [followersRes, followingRes] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_address', walletAddress),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_address', walletAddress),
  ]);

  return {
    followers: followersRes.count || 0,
    following: followingRes.count || 0,
  };
}
