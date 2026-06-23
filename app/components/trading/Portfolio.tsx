'use client';

import { useState, useEffect } from 'react';
import TokenLogo from './TokenLogo';
import { getTrades, TradeRecord } from '@/app/lib/tradeHistory';
import { timeAgo } from '@/app/lib/constants';
import { getMainnetRpcUrl } from '@/app/lib/solanaRpc';

interface TokenPrice {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
}

interface Holding {
  mint: string;
  symbol: string;
  name: string;
  logoURI: string;
  balance: number;
  price: number;
  usdValue: number;
  avgEntry: number | null;
  pnl: number | null;
  pnlPercent: number | null;
}

export default function Portfolio({
  walletAddress,
  tokenPrices,
  onClose,
  onSelectToken,
}: {
  walletAddress: string | undefined;
  tokenPrices: TokenPrice[];
  onClose: () => void;
  onSelectToken: (addr: string) => void;
}) {
  const [tab, setTab] = useState<'holdings' | 'history'>('holdings');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [solBalance, setSolBalance] = useState(0);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;

    async function fetchData() {
      const rpcUrl = getMainnetRpcUrl();

      // Fetch trades from Supabase
      const tradeRecords = await getTrades(walletAddress!);
      setTrades(tradeRecords);

      // Fetch SOL balance
      let sol = 0;
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [walletAddress] }),
        });
        const data = await res.json();
        if (data.result !== undefined) sol = data.result.value / 1e9;
      } catch (e) {
        console.error('Failed to fetch SOL balance for portfolio:', e);
      }
      setSolBalance(sol);

      // Fetch SPL balances from traded tokens
      const mintAddresses = tradeRecords.map(t => t.tokenAddress);
      const uniqueMints = [...new Set(mintAddresses)];

      const results: Holding[] = [];
      for (const mint of uniqueMints) {
        try {
          const res = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getTokenAccountsByOwner',
              params: [walletAddress, { mint }, { encoding: 'jsonParsed' }],
            }),
          });
          const data = await res.json();
          let balance = 0;
          if (data.result?.value?.length > 0) {
            balance = data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
          }

          const tokenInfo = tokenPrices.find(t => t.address === mint);
          const symbol = tokenInfo?.symbol || mint.slice(0, 4);
          const name = tokenInfo?.name || '';
          const logoURI = tokenInfo?.logoURI || '';
          const price = tokenInfo?.price || 0;
          const usdValue = balance * price;

          // Calculate avg entry from buy trades
          const tokenTrades = tradeRecords.filter(t => t.tokenAddress === mint && t.type === 'buy');
          let avgEntry: number | null = null;
          let pnl: number | null = null;
          let pnlPercent: number | null = null;
          if (tokenTrades.length > 0 && balance > 0) {
            const totalSolSpent = tokenTrades.reduce((sum, t) => sum + t.solAmount, 0);
            const totalTokensBought = tokenTrades.reduce((sum, t) => sum + t.amount, 0);
            if (totalTokensBought > 0) {
              avgEntry = totalSolSpent / totalTokensBought;
              pnl = (price - avgEntry) * balance;
              pnlPercent = avgEntry > 0 ? ((price - avgEntry) / avgEntry) * 100 : null;
            }
          }

          results.push({ mint, symbol, name, logoURI, balance, price, usdValue, avgEntry, pnl, pnlPercent });
        } catch (e) {
          console.error(`Failed to fetch balance for ${mint}:`, e);
        }
      }

      setHoldings(results);
      setLoading(false);
    }

    fetchData();
  }, [walletAddress, tokenPrices]);

  const totalPortfolioValue = solBalance * (tokenPrices.find(t => t.symbol === 'SOL')?.price || 150) +
    holdings.reduce((sum, h) => sum + h.usdValue, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="font-bold text-sm text-white">Portfolio</h2>
        <button onClick={onClose} className="p-1 text-text-tertiary hover:text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setTab('holdings')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'holdings' ? 'text-accent border-b-2 border-accent' : 'text-text-tertiary hover:text-white'
          }`}
        >
          Holdings
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'history' ? 'text-accent border-b-2 border-accent' : 'text-text-tertiary hover:text-white'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tab === 'holdings' ? (
          <div className="p-4 space-y-3">
            {/* Total value */}
            <div className="bg-surface rounded-xl p-4 border border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Portfolio Value</div>
              <div className="text-2xl font-bold text-white mt-1">
                ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* SOL Balance */}
            <div className="flex items-center justify-between py-2 px-1 border-b border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-linear-to-br from-accent/20 to-accent/5 flex items-center justify-center text-[10px] font-bold text-accent border border-accent/20">
                  S
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">SOL</div>
                  <div className="text-[11px] text-text-tertiary">
                    {solBalance.toFixed(4)} SOL
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-white">
                  ${(solBalance * (tokenPrices.find(t => t.symbol === 'SOL')?.price || 150)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {loading && holdings.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : holdings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-3xl mb-3 opacity-30">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-text-tertiary">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div className="text-sm text-text-tertiary font-medium">No holdings yet</div>
                <div className="text-xs text-text-tertiary mt-1">Start trading to build your portfolio</div>
              </div>
            ) : (
              holdings.map((h) => (
                <button
                  key={h.mint}
                  onClick={() => onSelectToken(h.mint)}
                  className="w-full flex items-center justify-between py-2 px-1 hover:bg-white/5 rounded-lg transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TokenLogo token={{ address: h.mint, symbol: h.symbol, logoURI: h.logoURI || undefined }} size={28} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{h.symbol}</div>
                      <div className="text-[11px] text-text-tertiary">
                        {h.balance.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">
                      ${h.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {h.pnl !== null && (
                      <div className={`text-[11px] font-semibold ${h.pnl >= 0 ? 'text-green' : 'text-red'}`}>
                        {h.pnl >= 0 ? '+' : ''}{h.pnl.toFixed(2)} ({h.pnlPercent?.toFixed(1)}%)
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {loading && trades.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : trades.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-3xl mb-3 opacity-30">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-text-tertiary">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <div className="text-sm text-text-tertiary font-medium">No trades yet</div>
                <div className="text-xs text-text-tertiary mt-1">Your trade history will appear here</div>
              </div>
            ) : (
              trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <TokenLogo token={{ address: trade.tokenAddress, symbol: trade.tokenSymbol, logoURI: trade.tokenLogoURI ?? undefined }} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{trade.tokenSymbol}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        trade.type === 'buy' ? 'text-green bg-green/10' : 'text-red bg-red/10'
                      }`}>
                        {trade.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-tertiary">
                      {trade.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })} @ ${trade.priceUsd.toFixed(4)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-white">
                      ${trade.solAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-text-tertiary">{timeAgo(Math.floor(trade.timestamp / 1000))}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
