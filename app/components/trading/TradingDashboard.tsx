'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets, useCreateWallet } from '@privy-io/react-auth/solana';
import TokenLogo from './TokenLogo';
import TrendingList from './TrendingList';
import TokenInfo from './TokenInfo';
import TradePanel from './TradePanel';
import Portfolio from './Portfolio';
import { upsertUser } from '@/app/lib/tradeHistory';
import { getMainnetRpcUrl } from '@/app/lib/solanaRpc';

interface Token {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
}

export default function TradingDashboard({ initialAddress }: { initialAddress?: string }) {
  const { authenticated, login, logout, ready, user } = usePrivy();
  const { wallets } = useSolanaWallets();
  const { createWallet } = useCreateWallet();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [tokensLoading, setTokensLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [solBalanceLoading, setSolBalanceLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<'chart' | 'trade' | 'portfolio'>('chart');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileTokens, setShowMobileTokens] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);

  // Extract wallet address for static dependency checking
  const walletAddress = wallets[0]?.address;

  // Sync Privy user to Supabase users table
  useEffect(() => {
    if (authenticated && user && walletAddress) {
      upsertUser(walletAddress, { privy_did: user.id });
    }
  }, [authenticated, user, walletAddress]);

  // Poll SOL balance for Cash Balance calculation
  useEffect(() => {
    if (!walletAddress) return;
    
    async function fetchSolBalance() {
      setSolBalanceLoading(true);
      try {
        const rpcUrl = getMainnetRpcUrl();
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [walletAddress],
          }),
        });
        const data = await res.json();
        if (data.result !== undefined) {
          setSolBalance(data.result.value / 1e9);
        }
      } catch (e) {
        console.error('Failed to fetch SOL balance for dashboard:', e);
      }
      setSolBalanceLoading(false);
    }
    
    fetchSolBalance();
    const interval = setInterval(fetchSolBalance, 15000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  useEffect(() => {
    async function fetchTokens() {
      setTokensLoading(true);
      try {
        const res = await fetch('/api/tokens?limit=20');
        const data = await res.json();
        if (data.tokens?.length > 0) {
          setTokens(data.tokens);
          if (initialAddress) {
            const found = data.tokens.find((t: Token) => t.address === initialAddress);
            if (found) setSelectedToken(found);
            else setSelectedToken(data.tokens[0]);
          } else {
            setSelectedToken(data.tokens[0]);
          }
        } else {
          setTokens([]);
          setSelectedToken(null);
        }
      } catch {
        console.error('Failed to fetch live tokens');
        setTokens([]);
        setSelectedToken(null);
      }
      setTokensLoading(false);
    }
    
    fetchTokens();
  }, [initialAddress]);

  // Handle Search
  useEffect(() => {
    if (!searchQuery) {
      // No synchronous setState — schedule the clear via microtask
      // so it doesn't cascade during the effect body
      const frame = requestAnimationFrame(() => setSearchResults([]));
      return () => cancelAnimationFrame(frame);
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (!cancelled) setSearchResults(data.tokens || []);
      } catch (e) {
        console.error('Search failed', e);
      }
      if (!cancelled) setIsSearching(false);
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const loadMoreTokens = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextOffset = offset + 20;
      const res = await fetch(`/api/tokens?limit=20&offset=${nextOffset}`);
      const data = await res.json();
      if (data.tokens?.length > 0) {
        setTokens(prev => {
          const newTokens = data.tokens.filter(
            (newToken: Token) => !prev.some((t) => t.address === newToken.address)
          );
          return [...prev, ...newTokens];
        });
        setOffset(nextOffset);
      } else {
        setHasMore(false);
      }
    } catch {
      console.error('Failed to load more tokens');
    }
    setIsLoadingMore(false);
  };

  return (
    <div className="bg-background flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      {/* Top bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-3 lg:px-6 glass shrink-0">
        <div className="flex items-center gap-2 lg:gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/images/logo-dark.png" alt="ChadWallet" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-lg hidden sm:block tracking-tight">ChadWallet</span>
          </Link>

          {/* Mobile: token list toggle */}
          <button
            onClick={() => setShowMobileTokens(!showMobileTokens)}
            className="lg:hidden p-2 text-text-secondary hover:text-white"
            title="Toggle token list"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          {/* Mobile: search toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="lg:hidden p-2 text-text-secondary hover:text-white"
            title="Search tokens"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
            </svg>
          </button>

          {/* Desktop search */}
          <div className="hidden md:flex items-center relative w-72 xl:w-96 z-50">
             <span className="absolute left-3 text-text-tertiary">
               {isSearching ? (
                 <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
               ) : (
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
               )}
             </span>
             <input 
               type="text" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="Search for tokens..." 
               className="w-full bg-surface border border-border rounded-lg pl-10 pr-10 py-1.5 text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary" 
             />
             <span className="absolute right-3 text-xs text-text-tertiary bg-white/5 px-1.5 rounded font-mono">⌘K</span>

             {searchQuery && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-border rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                 {searchResults.length > 0 ? (
                   searchResults.map((token) => (
                     <button
                       key={token.address}
                       onClick={() => {
                         setSelectedToken(token);
                         setSearchQuery('');
                         setTokens(prev => {
                           if (!prev.some(t => t.address === token.address)) {
                             return [token, ...prev];
                           }
                           return prev;
                         });
                       }}
                       className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-border/50 last:border-0"
                     >
                       <TokenLogo token={token} size={28} />
                       <div className="flex-1 min-w-0">
                         <div className="font-semibold text-sm truncate text-white">{token.name}</div>
                         <div className="text-xs text-text-tertiary truncate">{token.symbol}</div>
                       </div>
                     </button>
                   ))
                 ) : (
                   <div className="px-4 py-4 text-sm text-text-tertiary text-center">
                     {isSearching ? 'Searching...' : 'No tokens found'}
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden lg:flex items-center gap-4 mr-4 text-sm">
            <div className="text-right">
              <div className="text-text-secondary text-xs">Cash balance</div>
              <div className="font-semibold text-white flex items-center gap-1.5 justify-end">
                {solBalanceLoading ? (
                  <span className="w-16 h-4 bg-surface rounded animate-pulse inline-block" />
                ) : (
                  `$${(solBalance !== null 
                    ? solBalance * (tokens.find(t => t.symbol === 'SOL' || t.address === 'So11111111111111111111111111111111111111112')?.price || 150)
                    : 0
                  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                )}
              </div>
            </div>
          </div>
          {ready && (
            authenticated ? (
              <div className="flex items-center gap-2 lg:gap-3">
                {wallets.length === 0 ? (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          await createWallet();
                        } catch (e) {
                          console.error("Failed to create wallet", e);
                          login();
                        }
                      }}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold px-3 py-1.5 rounded-lg text-xs border border-red-500/30 transition-colors cursor-pointer"
                    >
                      Create wallet
                    </button>
                    <button
                      onClick={() => setShowPortfolio(true)}
                      className="hidden lg:flex text-xs text-accent hover:text-accent-hover px-2 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors font-semibold items-center gap-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                      </svg>
                      <span>Portfolio</span>
                    </button>
                    <button
                      onClick={logout}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors font-semibold flex items-center gap-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
                      <span className="text-xs text-text-secondary hidden sm:block">Connected</span>
                    </div>
                    <button
                      onClick={() => setShowPortfolio(true)}
                      className="hidden lg:flex text-xs text-accent hover:text-accent-hover px-2 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors font-semibold items-center gap-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                      </svg>
                      <span>Portfolio</span>
                    </button>
                    <button
                      onClick={logout}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors font-semibold flex items-center gap-1"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={login}
                className="bg-accent hover:bg-accent-hover text-black font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                Connect Wallet
              </button>
            )
          )}
        </div>
      </header>

      {/* Mobile search bar (shown when toggled) */}
      {showMobileSearch && (
        <div className="lg:hidden px-3 py-2 border-b border-border bg-surface/50">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tokens..."
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-text-tertiary"
              autoFocus
            />
          </div>
          {searchQuery && (
            <div className="mt-2 max-h-60 overflow-y-auto bg-[#1A1A1A] border border-border rounded-lg">
              {searchResults.length > 0 ? (
                searchResults.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => {
                      setSelectedToken(token);
                      setSearchQuery('');
                      setShowMobileSearch(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-border/50 last:border-0"
                  >
                    <TokenLogo token={token} size={24} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate text-white">{token.name}</div>
                      <div className="text-xs text-text-tertiary truncate">{token.symbol}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-text-tertiary text-center">
                  {isSearching ? 'Searching...' : 'No tokens found'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main trading layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Trending tokens list - hidden on mobile unless toggled */}
        <div className={`
          ${showMobileTokens ? 'fixed inset-0 top-14 z-40 lg:static lg:inset-auto' : 'hidden lg:flex'}
          lg:w-[300px] xl:w-[320px] lg:border-r border-border flex-col shrink-0 min-h-0 bg-surface/90 lg:bg-surface/30 backdrop-blur-sm lg:backdrop-blur-none
        `}>
          <div className="flex items-center justify-between px-4 py-3 lg:hidden border-b border-border">
            <span className="font-semibold text-sm text-white">Tokens</span>
            <button
              onClick={() => setShowMobileTokens(false)}
              className="p-1 text-text-tertiary hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <TrendingList
            tokens={tokens}
            selectedAddress={selectedToken?.address || ''}
            onSelect={(token) => {
              setSelectedToken(token);
              setShowMobileTokens(false);
            }}
            onLoadMore={loadMoreTokens}
            isLoadingMore={isLoadingMore}
            isLoading={tokensLoading}
          />
        </div>

        {/* Overlay for mobile token list */}
        {showMobileTokens && (
          <div
            className="fixed inset-0 top-14 z-30 bg-black/50 lg:hidden"
            onClick={() => setShowMobileTokens(false)}
          />
        )}

        {/* Middle: Token info & chart */}
        <div className="flex-1 overflow-y-auto custom-scrollbar hidden lg:block">
          {selectedToken ? (
            <TokenInfo key={selectedToken.address} token={selectedToken} />
          ) : (
            <div className="flex items-center justify-center h-full text-text-tertiary">
              Select a token to view details
            </div>
          )}
        </div>

        {/* Mobile: single panel view */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar lg:hidden ${mobileTab === 'portfolio' ? 'hidden' : ''}`}>
          {mobileTab === 'chart' ? (
            selectedToken ? (
              <TokenInfo key={selectedToken.address} token={selectedToken} />
            ) : (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                Select a token to view details
              </div>
            )
          ) : (
            <TradePanel key={selectedToken?.address} token={selectedToken} />
          )}
        </div>

        {/* Right: Buy & Sell panel - desktop */}
        <div className="hidden lg:flex w-80 xl:w-[360px] border-l border-border flex-col shrink-0 bg-surface/30">
          <TradePanel key={selectedToken?.address} token={selectedToken} />
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="lg:hidden flex border-t border-border bg-surface">
        <button
          onClick={() => setMobileTab('chart')}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            mobileTab === 'chart'
              ? 'text-accent border-t-2 border-accent -mt-px'
              : 'text-text-tertiary hover:text-white'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Chart
        </button>
        <button
          onClick={() => setMobileTab('trade')}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            mobileTab === 'trade'
              ? 'text-accent border-t-2 border-accent -mt-px'
              : 'text-text-tertiary hover:text-white'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Trade
        </button>
        <button
          onClick={() => setMobileTab('portfolio')}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            mobileTab === 'portfolio'
              ? 'text-accent border-t-2 border-accent -mt-px'
              : 'text-text-tertiary hover:text-white'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          Portfolio
        </button>
      </div>

      {/* Desktop: Portfolio overlay panel */}
      {showPortfolio && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 hidden lg:block"
            onClick={() => setShowPortfolio(false)}
          />
          <div className="fixed top-14 right-0 bottom-0 z-50 w-96 bg-[#1A1A1A] border-l border-border shadow-2xl flex-col hidden lg:flex animate-in slide-in-from-right duration-200">
            <Portfolio
              walletAddress={wallets[0]?.address}
              tokenPrices={tokens.map(t => ({ address: t.address, symbol: t.symbol, name: t.name, logoURI: t.logoURI, price: t.price }))}
              onClose={() => setShowPortfolio(false)}
              onSelectToken={(addr) => {
                const token = tokens.find(t => t.address === addr);
                if (token) {
                  setSelectedToken(token);
                  setShowPortfolio(false);
                }
              }}
            />
          </div>
        </>
      )}

      {/* Mobile: Portfolio full panel */}
      {mobileTab === 'portfolio' && (
        <div className="fixed inset-x-0 top-14 bottom-12 z-20 bg-background lg:hidden">
          <Portfolio
            walletAddress={wallets[0]?.address}
            tokenPrices={tokens.map(t => ({ address: t.address, symbol: t.symbol, name: t.name, logoURI: t.logoURI, price: t.price }))}
            onClose={() => setMobileTab('chart')}
            onSelectToken={(addr) => {
              const token = tokens.find(t => t.address === addr);
              if (token) {
                setSelectedToken(token);
                setMobileTab('chart');
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
