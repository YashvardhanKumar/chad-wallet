'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import TokenLogo from './TokenLogo';
import TrendingList from './TrendingList';
import TokenInfo from './TokenInfo';
import TradePanel from './TradePanel';
import Portfolio from './Portfolio';
import { upsertUser } from '@/app/lib/tradeHistory';
import { shortenAddress, formatPrice, formatMarketCap } from '@/app/lib/constants';
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
  bonding?: number;
  graduated?: boolean;
  dex?: string;
}

export default function TradingDashboard({ initialAddress }: { initialAddress?: string }) {
  const { authenticated, login, logout, ready, user } = usePrivy();
  const { wallets } = useSolanaWallets();
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
  const [mobileTab, setMobileTab] = useState<'chart' | 'trade' | 'portfolio'>('chart');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileTokens, setShowMobileTokens] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape' && searchFocused) {
          setSearchQuery('');
          setSearchFocused(false);
          searchInputRef.current?.blur();
          e.preventDefault();
        }
        return;
      }
      if (e.key === '/' || (e.metaKey && e.key === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        setSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchFocused]);

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
    <div className="pt-2 pl-4 w-dvw min-h-svh h-svh flex flex-col gap-3 max-h-svh overflow-hidden pb-6">
      <div className="pr-4">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between bg-bg-primary shrink-0 relative overflow-visible z-50">
        {/* Left: Logo */}
        <div className="flex gap-6 items-center min-w-0 flex-1">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/images/logo-dark.png" alt="ChadWallet" width={24} height={24} className="rounded-lg" />
            <span className="font-bold text-lg hidden sm:block tracking-tight">ChadWallet</span>
          </Link>
          <button
            onClick={() => setShowMobileTokens(!showMobileTokens)}
            className="lg:hidden p-2 text-text-secondary hover:text-white"
            title="Toggle token list"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>

        {/* Center: Search bar */}
        <div className="hidden md:block relative w-[400px] lg:w-[640px] min-w-[320px] h-12 mt-1">
          {/* Full-screen dark overlay when search is active */}
          {(searchFocused || searchQuery) && (
            <div className="fixed inset-0 z-40 bg-black/60" onClick={() => { setSearchFocused(false); setSearchQuery(''); }} />
          )}
          {/* Absolutely positioned search column, centered */}
          <div className="absolute top-0 left-1/2 z-50 flex w-full -translate-x-1/2 flex-col">
            <div className="relative">
              {/* Glow border behind search - only when focused */}
              {(searchFocused || searchQuery) && (
                <div className="pointer-events-none absolute -inset-2 rounded-2xl border border-bg-tertiary/80 bg-bg-secondary/40 backdrop-blur-sm" />
              )}
              <div className="relative z-10 flex flex-col">
                {/* Input row */}
                <div className={`flex h-12 items-center gap-2 rounded-xl border px-3 cursor-text border-bg-tertiary hover:bg-bg-secondary transition-colors ${(searchFocused || searchQuery) ? 'bg-bg-secondary' : 'bg-transparent'}`} onClick={() => searchInputRef.current?.focus()}>
                  <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <svg className="h-4 w-4 shrink-0 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
                      </svg>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                        placeholder="Search for tokens or traders..."
                        className="h-full min-w-0 flex-1 bg-transparent text-sm font-normal leading-none text-text-primary outline-none"
                      />
                    </div>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.readText().then(text => {
                          if (text) setSearchQuery(text);
                        }).catch(() => {});
                      }}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-bg-tertiary text-text-secondary hover:text-text-primary cursor-pointer"
                    >
                      Paste
                    </button>
                    <div className="text-[10px] font-bold min-w-5 text-center px-1.5 py-0.5 rounded-sm bg-bg-tertiary text-text-secondary">{(searchFocused || searchQuery) ? 'ESC' : '/'}</div>
                  </div>
                </div>

                {/* Search results dropdown */}
                {(searchFocused || searchQuery) && (
                  <div className="overflow-hidden transition-[max-height,opacity] duration-150 ease-out opacity-100">
                    <div className="flex min-h-[280px] max-h-[440px] flex-col overflow-y-auto">
                      {!searchQuery && (
                        <div className="flex h-9 shrink-0 items-center px-2 text-sm text-text-secondary">
                          Trending tokens
                        </div>
                      )}
                      {searchQuery && (
                        <div className="flex h-9 shrink-0 gap-1 items-center px-2">
                          <button className="rounded-md border border-bg-tertiary-solid px-1.5 py-0.5 text-xs font-bold bg-bg-tertiary text-text-primary">All</button>
                          <button className="rounded-md border border-bg-tertiary-solid px-1.5 py-0.5 text-xs font-bold text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors">Tokens</button>
                          <button className="rounded-md border border-bg-tertiary-solid px-1.5 py-0.5 text-xs font-bold text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors">Users</button>
                        </div>
                      )}
                      {(searchQuery ? searchResults : tokens.slice(0, 5)).length > 0 ? (
                        (searchQuery ? searchResults : tokens.slice(0, 5)).map((token) => (
                          <a
                            key={token.address}
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedToken(token);
                              setSearchQuery('');
                              setSearchFocused(false);
                              setTokens(prev => {
                                if (!prev.some(t => t.address === token.address)) {
                                  return [token, ...prev];
                                }
                                return prev;
                              });
                            }}
                            className="block rounded-lg tabular-nums hover:bg-bg-tertiary/60 focus:bg-bg-tertiary/60 focus:outline-none"
                          >
                            <div className="flex shrink-0 items-center gap-3 px-2 py-2 tabular-nums">
                              <div className="relative shrink-0" style={{ width: 36, height: 36 }}>
                                <img
                                  className="rounded-full border border-bg-tertiary"
                                  src={token.logoURI || ''}
                                  alt={token.symbol}
                                  style={{ height: 36, width: 36 }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                {!token.logoURI && (
                                  <div className="rounded-full border border-bg-tertiary bg-bg-tertiary-solid text-text-tertiary flex items-center justify-center" style={{ height: 36, width: 36, fontSize: 16 }}>?</div>
                                )}
                                <div className="absolute flex items-center justify-center" style={{ bottom: -3, right: -3 }}>
                                  <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill="#1a1a1a" stroke="#21c95e" strokeWidth="2"/>
                                    <path d="M8 12l3 3 5-5" stroke="#21c95e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              </div>
                              <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm">{token.symbol}</span>
                                  <svg width="16" height="16" className="text-text-secondary hover:text-text-primary transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0">
                                    <circle cx="12" cy="12" r="10" fill="rgba(152,153,163,0.3)"/>
                                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.5h-3v-3h3v3zm0-4.5h-3v-3h3v3zm0-4.5h-3V4.5h3v3z" fill="currentColor"/>
                                  </svg>
                                  <span className="flex items-center justify-center rounded-sm bg-bg-tertiary overflow-hidden p-0.5 text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                  </span>
                                  <span className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-text-secondary">
                                  <span className="truncate max-w-24">{token.name}</span>
                                  <span className="text-text-tertiary text-xs hidden lg:block">{token.address.slice(0, 6)}...{token.address.slice(-4)}</span>
                                </div>
                              </div>
                              <div className="hidden lg:flex items-center gap-1.5 text-xs w-22 shrink-0">
                                <div className="text-[10px] font-bold px-1 py-px border border-bg-tertiary rounded-sm text-text-tertiary">MC</div>
                                <div>{formatMarketCap(token.marketCap)}</div>
                              </div>
                              <div className="text-xs w-18 shrink-0">
                                <span className="tabular-nums">{formatPrice(token.price)}</span>
                              </div>
                              <div className="w-14 shrink-0">
                                <div className="flex gap-0.75 items-center" style={{ lineHeight: '16px' }}>
                                  <div style={{ color: token.priceChange24h >= 0 ? 'rgb(33,201,94)' : 'rgb(255,98,46)', fontWeight: 400, fontSize: 6 }}>
                                    {token.priceChange24h >= 0 ? '▲' : '▼'}
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 500, color: token.priceChange24h >= 0 ? 'rgb(33,201,94)' : 'rgb(255,98,46)' }}>
                                    {Math.abs(token.priceChange24h).toFixed(2)}%
                                  </div>
                                </div>
                              </div>
                              <div className="hidden lg:flex items-center gap-1.5 text-xs w-22 shrink-0">
                                <div className="text-[10px] font-bold px-1 py-px border border-bg-tertiary rounded-sm text-text-tertiary">VOL</div>
                                <div>{formatMarketCap(token.volume24h)}</div>
                              </div>
                            </div>
                          </a>
                        ))
                      ) : !isSearching ? (
                        <div className="px-4 py-4 text-sm text-text-tertiary text-center">
                          {searchQuery ? 'No tokens found' : 'No trending tokens'}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: search toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="p-2 text-text-secondary hover:text-white"
            title="Search tokens"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
            </svg>
          </button>
        </div>

        {/* Right side */}
        <div className="flex min-w-0 flex-1 justify-end">
          <div className="flex gap-2 items-stretch">
            {/* Cash balance pill */}
            <li className="hidden lg:flex relative shrink-0 flex-col items-start justify-center h-12 rounded-xl border border-bg-tertiary px-2">
              <div className="flex gap-1 items-baseline tabular-nums">
                <span className="text-sm">
                  ${solBalance !== null
                    ? (solBalance * (tokens.find(t => t.symbol === 'SOL' || t.address === 'So11111111111111111111111111111111111111112')?.price || 150))
                      .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '0.00'}
                </span>
                <div className="text-text-tertiary text-xs">cash</div>
              </div>
              <button
                onClick={() => setShowPortfolio(true)}
                type="button"
                className="text-accent-primary text-xs font-bold hover:opacity-80"
              >
                Deposit more
              </button>
            </li>

            {/* Profile / Connect */}
            <li className="hidden lg:flex relative shrink-0 rounded-xl h-12 hover:bg-bg-secondary px-2 py-1 border border-bg-tertiary bg-bg-primary">
              {ready && (
                authenticated ? (
                  <button
                    onClick={() => setShowPortfolio(true)}
                    className="flex gap-2 items-center min-w-[104px]"
                  >
                    <div className="flex flex-col flex-1">
                      <div className="text-sm tabular-nums text-left">{shortenAddress(walletAddress || '', 4)}</div>
                      <div className="flex gap-1 items-center tabular-nums">
                        <div className="flex gap-0.5 items-center" style={{ lineHeight: '16px' }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'rgb(152, 153, 163)' }}>--</div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="rounded-full flex items-center justify-center shrink-0"
                      style={{
                        height: 32,
                        width: 32,
                        backgroundColor: `hsl(${(walletAddress || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360}, 60%, 55%)`
                      }}
                    >
                      {walletAddress ? walletAddress.slice(0, 2).toUpperCase() : 'CW'}
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={login}
                    className="flex gap-2 items-center min-w-[104px] text-accent-primary text-sm font-bold"
                  >
                    Connect
                  </button>
                )
              )}
            </li>
          </div>
        </div>
      </header>

      {/* Mobile search bar (shown when toggled) */}
      {showMobileSearch && (
        <div className="lg:hidden px-3 py-2 border-b border-bg-tertiary bg-surface/50">
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
              className="w-full bg-background border border-bg-tertiary rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-text-tertiary"
              autoFocus
            />
          </div>
          {searchQuery && (
            <div className="mt-2 max-h-60 overflow-y-auto bg-[#1A1A1A] border border-bg-tertiary rounded-lg">
              {searchResults.length > 0 ? (
                searchResults.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => {
                      setSelectedToken(token);
                      setSearchQuery('');
                      setShowMobileSearch(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-tertiary backdrop-blur-md transition-colors text-left border-b border-bg-tertiary last:border-0"
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

      </div>
      {/* Main trading layout */}
      <div className="flex gap-3 2xl:gap-3 flex-1 min-h-0 pr-4">
        {/* Left: Trending tokens list - hidden on mobile unless toggled */}
        <div className={`
          ${showMobileTokens ? 'fixed inset-0 top-14 z-40 lg:static lg:inset-auto' : 'hidden lg:flex'}
          w-70 2xl:w-85 flex-col shrink-0 min-h-0 bg-surface/90 lg:bg-surface/30 backdrop-blur-sm lg:backdrop-blur-none
        `}>
          <div className="flex items-center justify-between px-4 py-3 lg:hidden border-b border-bg-tertiary">
            <span className="font-semibold text-sm text-white">Tokens</span>
            <button
              onClick={() => setShowMobileTokens(false)}
              className="p-1 text-text-tertiary hover:text-white backdrop-blur-md"
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
        <div className="hidden lg:flex flex-col gap-4 w-75 2xl:w-90 shrink-0">
          <div className="flex flex-col">
            <TradePanel key={selectedToken?.address} token={selectedToken} />
            {/* About section */}
            {selectedToken && (
              <div className="relative border border-bg-tertiary rounded-xl p-2 pb-4 mb-6">
                <div className="flex flex-col gap-3">
                  <div className="px-1 flex flex-col gap-1">
                    <span className="font-medium text-text-primary">About <span>{selectedToken.symbol}</span></span>
                    <div className="max-w-[900px] flex items-baseline gap-0">
                      <span className="text-xs leading-tight min-w-0 text-text-secondary">{selectedToken.name}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 px-1">
                    <div className="flex-1 flex flex-col items-center rounded-md py-1.5 border border-bg-tertiary-solid">
                      <span className="text-xs text-text-secondary">5M</span>
                      <span className="text-xs text-text-secondary">--</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center rounded-md py-1.5 border bg-bg-tertiary border-transparent">
                      <span className="text-xs text-text-secondary">1H</span>
                      <span className="text-xs text-text-secondary">--</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center rounded-md py-1.5 border border-bg-tertiary-solid">
                      <span className="text-xs text-text-secondary">4H</span>
                      <span className="text-xs text-text-secondary">--</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center rounded-md py-1.5 border border-bg-tertiary-solid">
                      <span className="text-xs text-text-secondary">1D</span>
                      <div className="flex gap-0.75 items-center" style={{ lineHeight: '16px' }}>
                        <div style={{ color: selectedToken.priceChange24h >= 0 ? 'rgb(33,201,94)' : 'rgb(255,98,46)', fontWeight: 400, fontSize: 6 }}>
                          {selectedToken.priceChange24h >= 0 ? '▲' : '▼'}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: selectedToken.priceChange24h >= 0 ? 'rgb(33,201,94)' : 'rgb(255,98,46)' }}>
                          {Math.abs(selectedToken.priceChange24h).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 px-2">
                    <div className="flex items-center gap-2 py-1">
                      <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">Network</span>
                      <div className="flex-1 border-b border-dashed border-bg-tertiary min-w-4 -translate-y-px" />
                      <span className="text-xs text-text-primary font-medium whitespace-nowrap">Solana</span>
                    </div>
                    <div className="flex items-center gap-2 py-1">
                      <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">Contract address</span>
                      <div className="flex-1 border-b border-dashed border-bg-tertiary min-w-4 -translate-y-px" />
                      <button
                        onClick={() => navigator.clipboard.writeText(selectedToken.address)}
                        className="flex items-center gap-1 shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                      >
                        <span className="text-xs text-text-primary font-medium whitespace-nowrap">{selectedToken.address.slice(0, 6)}...{selectedToken.address.slice(-6)}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-tertiary shrink-0">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Your positions */}
          <div className="flex flex-col">
            <div className="flex flex-col min-h-0 flex-1">
              <div className="flex items-center justify-between gap-2 px-2 shrink-0 mb-2">
                <div className="text-base">Your positions</div>
                <div className="flex border border-bg-tertiary rounded-lg p-0.5 bg-bg-primary">
                  <div className="flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold bg-accent-primary-transparent text-accent-primary">Open</div>
                  <div className="flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold text-text-tertiary">Closed</div>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="text-center min-h-15 flex items-center justify-center text-sm text-text-tertiary">No open positions</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="lg:hidden flex border-t border-bg-tertiary bg-surface">
        <button
          onClick={() => setMobileTab('chart')}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium backdrop-blur-md transition-colors ${
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
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium backdrop-blur-md transition-colors ${
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
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium backdrop-blur-md transition-colors ${
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
          <div className="fixed top-14 right-0 bottom-0 z-50 w-96 bg-[#1A1A1A] border-l border-bg-tertiary shadow-2xl flex-col hidden lg:flex animate-in slide-in-from-right duration-200">
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
