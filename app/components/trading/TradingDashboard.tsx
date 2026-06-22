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
  const { authenticated, login, logout, ready } = usePrivy();
  const { wallets } = useSolanaWallets();
  const { createWallet } = useCreateWallet();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    async function fetchTokens() {
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
          setFallbackTokens();
        }
      } catch {
        console.error('Failed to fetch tokens, using fallback');
        setFallbackTokens();
      }
    }

    function setFallbackTokens() {
      // Import KNOWN_TOKENS here or just use a static list
      import('@/app/lib/constants').then(({ KNOWN_TOKENS }) => {
        const fallback = KNOWN_TOKENS.map((t) => ({
          address: t.address,
          symbol: t.symbol,
          name: t.name,
          logoURI: t.logoURI,
          price: Math.random() * 200,
          priceChange24h: (Math.random() - 0.4) * 40,
          volume24h: Math.random() * 10000000,
          marketCap: Math.random() * 100000000,
        }));
        setTokens(fallback);
        setSelectedToken(fallback.find((t) => t.address === initialAddress) || fallback[0]);
      });
    }
    
    fetchTokens();
  }, [initialAddress]);

  // Handle Search
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.tokens || []);
      } catch (e) {
        console.error('Search failed', e);
      }
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 lg:px-6 glass shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo-dark.png" alt="ChadWallet" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-lg hidden sm:block tracking-tight">ChadWallet</span>
          </Link>
          <div className="hidden md:flex items-center relative w-96 z-50">
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

             {/* Search Dropdown */}
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
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-4 mr-4 text-sm">
            <div className="text-right">
              <div className="text-text-secondary text-xs">Cash balance</div>
              <div className="font-semibold">$0.00</div>
            </div>
          </div>
          {ready && (
            authenticated ? (
              <div className="flex items-center gap-3">
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
                      No Solana wallet found. Please reconnect or create a wallet.
                    </button>
                    <button
                      onClick={logout}
                      className="text-xs text-text-tertiary hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
                      <span className="text-sm text-text-secondary hidden sm:block">Connected</span>
                    </div>
                    <button
                      onClick={logout}
                      className="text-xs text-text-tertiary hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Disconnect
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

      {/* Main trading layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Trending tokens list */}
        <div className="w-full lg:w-[300px] xl:w-[320px] border-b lg:border-b-0 lg:border-r border-border flex flex-col shrink-0 min-h-0 bg-surface/30">
          <TrendingList
            tokens={tokens}
            selectedAddress={selectedToken?.address || ''}
            onSelect={(token) => setSelectedToken(token)}
            onLoadMore={loadMoreTokens}
            isLoadingMore={isLoadingMore}
          />
        </div>

        {/* Middle: Token info & chart */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {selectedToken ? (
            <TokenInfo key={selectedToken.address} token={selectedToken} />
          ) : (
            <div className="flex items-center justify-center h-full text-text-tertiary">
              Select a token to view details
            </div>
          )}
        </div>

        {/* Right: Buy & Sell panel */}
        <div className="w-full lg:w-80 xl:w-[360px] border-l border-border flex flex-col shrink-0 bg-surface/30">
          <TradePanel key={selectedToken?.address} token={selectedToken} />
        </div>
      </div>
    </div>
  );
}
