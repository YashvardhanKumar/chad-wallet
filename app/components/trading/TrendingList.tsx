'use client';

import { useState } from 'react';
import TokenLogo from './TokenLogo';
import { formatPrice, formatMarketCap } from '@/app/lib/constants';

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

interface TrendingListProps {
  tokens: Token[];
  selectedAddress: string;
  onSelect: (token: Token) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  isLoading?: boolean;
}

export default function TrendingList({ tokens, selectedAddress, onSelect, onLoadMore, isLoadingMore, isLoading }: TrendingListProps) {
  const [activeTab, setActiveTab] = useState('Trending');

  const sortedTokens = [...tokens].sort((a, b) => {
    switch (activeTab) {
      case 'Gainers':
        return b.priceChange24h - a.priceChange24h;
      case 'Most held':
        return b.marketCap - a.marketCap;
      case 'Trending':
        return b.volume24h - a.volume24h;
      case 'Verified':
      default:
        return 0; // Default order
    }
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      onLoadMore?.();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 pt-3 px-4 pb-2 border-b border-border/50">
        <div className="flex items-center gap-4 mb-3">
          <h2 className="font-semibold text-sm flex items-center gap-1.5 text-white">
            <span className="text-orange-500">🔥</span> Tokens
          </h2>
        </div>
        <div className="flex gap-1">
          {['Verified', 'Trending', 'Most held', 'Gainers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-white/5 font-medium'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Token list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" onScroll={handleScroll}>
        {sortedTokens.map((token) => (
          <button
            key={token.address}
            onClick={() => onSelect(token)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-border/30 last:border-0 ${
              selectedAddress === token.address ? 'bg-white/5' : ''
            }`}
          >
            <div className="relative">
              <TokenLogo token={token} size={36} />
              {/* Optional verified badge could go here */}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[13px] tracking-tight truncate text-white">{token.symbol}</div>
              <div className="text-[12px] text-text-tertiary font-medium">{formatMarketCap(token.marketCap)}</div>
            </div>
            
            <div className="text-right flex-shrink-0">
              <div className="text-[13px] font-medium text-white">{formatPrice(token.price)}</div>
              <div
                className={`text-[11px] font-semibold mt-0.5 ${
                  token.priceChange24h >= 0 ? 'text-green' : 'text-red'
                }`}
              >
                {token.priceChange24h >= 0 ? '▲' : '▼'} {Math.abs(token.priceChange24h).toFixed(2)}%
              </div>
            </div>
          </button>
        ))}

        {isLoading && tokens.length === 0 && (
          <div className="px-4 py-8 text-center">
            <div className="animate-pulse space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-surface rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {!isLoading && tokens.length === 0 && (
          <div className="px-5 py-10 text-center">
            <div className="text-sm font-semibold text-white">Live tokens unavailable</div>
            <div className="mt-2 text-xs leading-5 text-text-tertiary">
              Connect BirdEye to load real-time Solana market data.
            </div>
          </div>
        )}

        {isLoadingMore && (
          <div className="py-4 flex justify-center">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}
