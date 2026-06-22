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

export async function upsertUser(walletAddress: string, data: { privy_did?: string }) {
  const { error } = await supabase.from('users').upsert(
    { wallet_address: walletAddress, privy_did: data.privy_did || null, updated_at: new Date().toISOString() },
    { onConflict: 'wallet_address' }
  );
  if (error && !isTableNotFound(error)) console.error('Failed to upsert user:', error);
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
