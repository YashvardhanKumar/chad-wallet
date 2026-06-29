'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { supabase } from '@/app/lib/supabase';
import { Token } from '@/app/components/trading/TrendingList';
import { getMainnetRpcUrl } from '@/app/lib/solanaRpc';
import {
  upsertUser,
  getWatchlistAddresses,
  addToWatchlist,
  removeFromWatchlist
} from '@/app/lib/tradeHistory';
import Portfolio from '@/app/components/trading/Portfolio';

interface TradingContextType {
  walletAddress: string | undefined;
  selectedToken: Token | null;
  setSelectedToken: (token: Token | null) => void;
  tokens: Token[];
  setTokens: React.Dispatch<React.SetStateAction<Token[]>>;
  tokensLoading: boolean;
  cryptoTokens: Token[];
  graduatedTokens: Token[];
  bondingTokens: Token[];
  heldTokens: Token[];
  solBalance: number | null;
  setSolBalance: React.Dispatch<React.SetStateAction<number | null>>;
  verifiedSet: Set<string>;
  dbUser: any;
  watchlistAddresses: string[];
  setWatchlistAddresses: React.Dispatch<React.SetStateAction<string[]>>;
  toggleWatchlist: (token: Token) => Promise<void>;
  solPrice: number;
  showPortfolio: boolean;
  setShowPortfolio: React.Dispatch<React.SetStateAction<boolean>>;
  portfolioSummary: { totalValue: number; totalPnl: number } | null;
  ready: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const { user, authenticated, ready, logout, login } = usePrivy();
  const { wallets } = useSolanaWallets();
  const walletAddress = wallets[0]?.address;

  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [cryptoTokens, setCryptoTokens] = useState<Token[]>([]);
  const [graduatedTokens, setGraduatedTokens] = useState<Token[]>([]);
  const [bondingTokens, setBondingTokens] = useState<Token[]>([]);
  const [heldTokens, setHeldTokens] = useState<Token[]>([]);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [verifiedSet, setVerifiedSet] = useState<Set<string>>(new Set());
  const [dbUser, setDbUser] = useState<any>(null);
  const [watchlistAddresses, setWatchlistAddresses] = useState<string[]>([]);
  const [solPrice, setSolPrice] = useState<number>(150);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [portfolioSummary, setPortfolioSummary] = useState<{ totalValue: number; totalPnl: number } | null>(null);

  // Sync Privy user to Supabase users table
  useEffect(() => {
    if (authenticated && user && walletAddress) {
      const u = user as any;
      const displayName = u.username || 
                          u.twitter?.username || 
                          u.google?.name || 
                          (walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : '');
      const avatarUrl = u.twitter?.profilePictureUrl || 
                        u.google?.picture || 
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${walletAddress}`;
      upsertUser(walletAddress, {
        privy_did: user.id,
        displayName,
        avatarUrl,
      });
    }
  }, [authenticated, user, walletAddress]);

  // Fetch dbUser profile
  useEffect(() => {
    if (walletAddress) {
      async function fetchDbUser() {
        try {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('wallet_address', walletAddress)
            .maybeSingle();
          if (data) setDbUser(data);
        } catch (e) {
          console.error('Failed to fetch dbUser:', e);
        }
      }
      fetchDbUser();
    } else {
      const frame = requestAnimationFrame(() => setDbUser(null));
      return () => cancelAnimationFrame(frame);
    }
  }, [walletAddress]);

  // Verification batch
  useEffect(() => {
    if (tokens.length === 0) return;
    const allAddresses = [...new Set(
      [tokens, cryptoTokens, graduatedTokens, bondingTokens, heldTokens]
        .flatMap(arr => arr.filter(Boolean).map(t => t.address))
    )];
    if (allAddresses.length === 0) return;
    fetch(`/api/verify-batch?addresses=${allAddresses.join(',')}`)
      .then(r => r.json())
      .then(d => { if (d.verified) setVerifiedSet(new Set(d.verified)); })
      .catch(() => {});
  }, [tokens, cryptoTokens, graduatedTokens, bondingTokens, heldTokens]);

  // Fetch SOL price from Jupiter once on mount
  useEffect(() => {
    async function fetchSolPrice() {
      try {
        const res = await fetch('https://api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112');
        if (res.ok) {
          const data = await res.json();
          const tokenInfo = data['So11111111111111111111111111111111111111112'];
          const price = tokenInfo?.price || tokenInfo?.usdPrice;
          if (price) {
            setSolPrice(Number(price));
          }
        }
      } catch (e) {
        console.warn('Failed to fetch SOL price from Jupiter in context:', e);
      }
    }
    fetchSolPrice();
  }, []);

  // Fetch SOL balance once on mount
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
        console.warn('Failed to fetch SOL balance for context:', e);
      }
    }
    
    fetchSolBalance();
  }, [walletAddress]);

  // Fetch tokens list
  useEffect(() => {
    async function fetchTokens() {
      setTokensLoading(true);
      try {
        const res = await fetch('/api/tokens?limit=25');
        const data = await res.json();
        if (data.tokens?.length > 0) {
          const mappedTokens = data.tokens.map((t: any) => ({
            address: t.token?.address || t.address,
            symbol: t.token?.symbol || t.symbol,
            name: t.token?.name || t.name,
            logoURI: t.token?.info?.imageLargeUrl || t.logoURI,
            price: parseFloat(t.priceUSD || t.price || '0'),
            priceChange24h: parseFloat(t.change24 || t.priceChange24h || '0'),
            volume24h: parseFloat(t.volume24h || '0'),
            marketCap: parseFloat(t.marketCap || '0'),
            age: t.age || undefined,
            isVerified: t.isVerified || false
          }));
          const list = mappedTokens.slice(0, 25);
          setTokens(list);
          setSelectedToken((prev) => prev || list[0]);
        }
      } catch {
        console.error('Failed to fetch live tokens in context');
      }
      setTokensLoading(false);
    }
    fetchTokens();
  }, []);

  // Fetch sub lists
  useEffect(() => {
    async function fetchCryptoTokens() {
      try {
        const res = await fetch('/api/crypto');
        const data = await res.json();
        if (data.tokens?.length > 0) setCryptoTokens(data.tokens);
      } catch {}
    }
    async function fetchGraduated() {
      try {
        const res = await fetch('/api/graduated');
        const data = await res.json();
        if (data.tokens?.length > 0) setGraduatedTokens(data.tokens);
      } catch {}
    }
    async function fetchBonding() {
      try {
        const res = await fetch('/api/bonding');
        const data = await res.json();
        if (data.tokens?.length > 0) setBondingTokens(data.tokens);
      } catch {}
    }
    async function fetchHeld() {
      try {
        const res = await fetch('/api/held');
        const data = await res.json();
        if (data.tokens?.length > 0) {
          const mappedTokens = data.tokens.map((t: any) => ({
            address: t.token?.address || t.address,
            symbol: t.token?.symbol || t.symbol,
            name: t.token?.name || t.name,
            logoURI: t.token?.info?.imageLargeUrl || t.logoURI,
            price: parseFloat(t.priceUSD || t.price || '0'),
            priceChange24h: parseFloat(t.change24 || t.priceChange24h || '0'),
            volume24h: parseFloat(t.volume24h || '0'),
            marketCap: parseFloat(t.marketCap || '0'),
            age: t.age || undefined,
            isVerified: t.isVerified || false
          }));
          setHeldTokens(mappedTokens);
        }
      } catch {}
    }

    fetchCryptoTokens();
    fetchGraduated();
    fetchBonding();
    fetchHeld();
  }, []);

  // Load watchlist on auth
  useEffect(() => {
    if (!walletAddress) return;
    getWatchlistAddresses(walletAddress).then(setWatchlistAddresses);
  }, [walletAddress]);

  const toggleWatchlist = useCallback(async (token: Token) => {
    if (!walletAddress) return;
    const isWatchlisted = watchlistAddresses.includes(token.address);
    if (isWatchlisted) {
      await removeFromWatchlist(walletAddress, token.address);
      setWatchlistAddresses(prev => prev.filter(a => a !== token.address));
    } else {
      await addToWatchlist(walletAddress, token);
      setWatchlistAddresses(prev => [...prev, token.address]);
    }
  }, [walletAddress, watchlistAddresses]);

  return (
    <TradingContext.Provider
      value={{
        walletAddress,
        selectedToken,
        setSelectedToken,
        tokens,
        setTokens,
        tokensLoading,
        cryptoTokens,
        graduatedTokens,
        bondingTokens,
        heldTokens,
        solBalance,
        setSolBalance,
        verifiedSet,
        dbUser,
        watchlistAddresses,
        setWatchlistAddresses,
        toggleWatchlist,
        solPrice,
        showPortfolio,
        setShowPortfolio,
        portfolioSummary,
        ready,
        login,
        logout,
      }}
    >
      {children}
      {walletAddress && (
        <Portfolio
          walletAddress={walletAddress}
          tokenPrices={tokens.map(t => ({ address: t.address, symbol: t.symbol, name: t.name, logoURI: t.logoURI, price: t.price }))}
          onSummaryChange={setPortfolioSummary}
          onClose={() => {}}
          onSelectToken={() => {}}
          hidden
        />
      )}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
}
