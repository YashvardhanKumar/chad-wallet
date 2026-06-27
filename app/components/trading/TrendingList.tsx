'use client';

import { useState } from 'react';
import TokenLogo from './TokenLogo';
import Leaderboard from './Leaderboard';
import { formatPrice, formatMarketCap } from '@/app/lib/constants';

export interface Token {
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
  age?: string;
}

interface TrendingListProps {
  tokens: Token[];
  selectedAddress: string;
  onSelect: (token: Token) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  isLoading?: boolean;
}

const FILTER_TABS = ['Watchlist', 'Crypto', 'Trending', 'Most held', 'Gainers', 'Graduated', 'Bonding'] as const;

const NAV_TABS = ['Alerts', 'Tokens', 'Leaderboard', 'Feed'] as const;

export default function TrendingList({ tokens, selectedAddress, onSelect, onLoadMore, isLoadingMore, isLoading }: TrendingListProps) {
  const [activeFilter, setActiveFilter] = useState<string>('Trending');
  const [activeNav, setActiveNav] = useState<string>('Tokens');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredTokens = [...tokens].filter((token) => {
    if (activeFilter === 'Graduated') return token.graduated === true;
    if (activeFilter === 'Bonding') return token.bonding !== undefined && !token.graduated;
    return true;
  });

  const sortedTokens = filteredTokens.sort((a, b) => {
    switch (activeFilter) {
      case 'Gainers':
        return b.priceChange24h - a.priceChange24h;
      case 'Most held':
        return b.marketCap - a.marketCap;
      default:
        return b.volume24h - a.volume24h;
    }
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      onLoadMore?.();
    }
  };

  return (
    <div className="flex shrink-0 transition-[width] pb-2 duration-100 ease-out overflow-hidden w-70 2xl:w-85">
      <div className="flex gap-3 flex-1 min-h-0 min-w-0">
        <div className="flex flex-col flex-1 gap-3 min-h-0 min-w-0">
          <div className="flex flex-1 flex-col rounded-xl border border-bg-tertiary min-h-0 min-w-0 pb-2">
            {/* Nav header */}
            <div className="p-2 pl-3 rounded-t-xl bg-bg-secondary flex items-center shrink-0">
              <div className="relative flex-1 min-w-0">
                <div className="no-scrollbar overflow-x-auto overflow-y-hidden flex items-center gap-2 text-sm font-medium">
                  {NAV_TABS.map((tab, i) => (
                    <span key={tab} className="contents">
                      {i > 0 && <div className="w-px h-4 bg-bg-tertiary" />}
                      <button
                        onClick={() => setActiveNav(tab)}
                        className={`flex-none text-left whitespace-nowrap transition-colors ${
                          activeNav === tab
                            ? 'text-text-primary'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {tab === 'Alerts' ? (
                          <span className="flex items-center justify-start gap-1">
                            <span className="relative flex items-center justify-center shrink-0">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                              </svg>
                            </span>
                            <span>{tab}</span>
                          </span>
                        ) : (
                          tab
                        )}
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="text-text-tertiary hover:text-text-primary focus:outline-none p-1"
                  title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="w-3 h-3">
                    <path d="M7.25609 11.911C7.58193 12.2369 7.58193 12.7636 7.25609 13.0894C7.09359 13.2519 6.88023 13.3336 6.6669 13.3336C6.45357 13.3336 6.24021 13.2519 6.07771 13.0894L0.244375 7.25609C-0.0814583 6.93026 -0.0814583 6.40354 0.244375 6.07771L6.07771 0.244375C6.40354 -0.0814583 6.93026 -0.0814583 7.25609 0.244375C7.58193 0.570208 7.58193 1.09693 7.25609 1.42276L2.01195 6.6669L7.25609 11.911ZM7.84529 6.6669L13.0894 1.42276C13.4153 1.09693 13.4153 0.570208 13.0894 0.244375C12.7636 -0.0814583 12.2369 -0.0814583 11.911 0.244375L6.07771 6.07771C5.75187 6.40354 5.75187 6.93026 6.07771 7.25609L11.911 13.0894C12.0735 13.2519 12.2869 13.3336 12.5002 13.3336C12.7136 13.3336 12.9269 13.2519 13.0894 13.0894C13.4153 12.7636 13.4153 12.2369 13.0894 11.911L7.84529 6.6669Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Filter pills - only for Tokens nav */}
            {activeNav === 'Tokens' && (
              <div className="relative shrink-0">
                <div className="no-scrollbar overflow-x-auto overflow-y-hidden cursor-grab flex gap-2 px-3 pt-2 pb-1 whitespace-nowrap">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={`inline-flex h-6 items-center justify-center border border-bg-tertiary rounded-md px-1.5 text-xs font-bold leading-none shrink-0 whitespace-nowrap transition-colors ${
                        activeFilter === tab
                          ? 'bg-bg-tertiary-solid text-text-primary'
                          : 'text-text-secondary hover:bg-bg-tertiary focus:bg-bg-tertiary'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-bg-primary to-transparent" />
              </div>
            )}

            {/* Content area */}
            {activeNav === 'Leaderboard' ? (
              <div className="flex-1 min-h-0 overflow-hidden">
                <Leaderboard onSelectWallet={(wallet) => console.log('Selected wallet:', wallet)} />
              </div>
            ) : activeNav === 'Tokens' ? (
            <div className="flex flex-1 flex-col pt-1 overflow-y-scroll overflow-x-hidden px-2 min-h-0 gap-px" onScroll={handleScroll}>
              {sortedTokens.map((token) => {
                const isSelected = selectedAddress === token.address;
                return (
                  <div key={token.address} className="grid transition-[grid-template-rows,opacity] duration-150 ease-out grid-rows-[1fr] opacity-100">
                    <div className="overflow-hidden">
                      <a
                        onClick={(e) => { e.preventDefault(); onSelect(token); }}
                        href="#"
                        className={`flex items-center gap-3 p-2 py-2 rounded-lg cursor-pointer group min-w-0 transition-colors ${
                          isSelected
                            ? 'bg-bg-tertiary-solid'
                            : 'hover:bg-bg-tertiary focus-visible:bg-bg-tertiary'
                        }`}
                      >
                        {/* Token icon */}
                        <div className="relative shrink-0" style={{ width: 36, height: 36 }}>
                          <TokenLogo token={token} size={36} />
                          {token.graduated && (
                            <div className="absolute flex items-center justify-center" style={{ bottom: -3, right: -3 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" fill="#FF6B00" stroke="var(--background)" strokeWidth="2"/>
                                <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Name + price */}
                        <div className="flex flex-col flex-1 min-w-0 gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm leading-4 truncate">{token.symbol}</span>
                          </div>
                          <div className="flex gap-1.5 items-center text-xs text-text-secondary">
                            {formatPrice(token.price)}
                          </div>
                        </div>

                        {/* MC + change */}
                        <div className="flex flex-col gap-0.5 items-end tabular-nums shrink-0">
                          <div className="text-sm leading-4">
                            <span>{formatMarketCap(token.marketCap)}</span> MC
                          </div>
                          <div className="flex gap-0.75 items-center" style={{ lineHeight: '16px' }}>
                            <div style={{ color: token.priceChange24h >= 0 ? 'rgb(33,201,94)' : 'rgb(255,98,46)', fontWeight: 400, fontSize: 6 }}>
                              {token.priceChange24h >= 0 ? '▲' : '▼'}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: token.priceChange24h >= 0 ? 'rgb(33,201,94)' : 'rgb(255,98,46)' }}>
                              {Math.abs(token.priceChange24h).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </a>
                    </div>
                  </div>
                );
              })}

              {isLoading && tokens.length === 0 && (
                <div className="px-2 py-4">
                  <div className="animate-pulse space-y-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-12 bg-bg-tertiary rounded-lg" />
                    ))}
                  </div>
                </div>
              )}

              {!isLoading && tokens.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <div className="text-sm font-semibold text-text-primary">Live tokens unavailable</div>
                  <div className="mt-2 text-xs leading-5 text-text-tertiary">
                    Connect BirdEye to load real-time Solana market data.
                  </div>
                </div>
              )}

              {isLoadingMore && (
                <div className="py-4 flex justify-center">
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
                {activeNav === 'Alerts' ? 'Alerts coming soon' : 'Feed coming soon'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
