'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTrading } from '@/app/context/TradingContext';
import NavbarSearch from '@/app/components/trading/NavbarSearch';
import SplitTokenLists from '@/app/components/trading/SplitTokenLists';
import ProfileDropdown from '@/app/components/trading/ProfileDropdown';
import { FiMenu, FiSearch, FiX } from 'react-icons/fi';

export default function TradingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
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
    verifiedSet,
    dbUser,
    watchlistAddresses,
    toggleWatchlist,
    solPrice,
    setShowPortfolio,
    portfolioSummary,
    ready,
    login,
    logout,
  } = useTrading();

  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileTokens, setShowMobileTokens] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chart' | 'trade' | 'portfolio'>('chart');

  return (
    <div className="pt-2 pl-4 w-dvw min-h-svh h-svh flex flex-col gap-3 max-h-svh overflow-hidden pb-6">
      <div className="pr-4">
        {/* Persistent Top Bar */}
        <header className="h-14 flex items-center justify-between bg-bg-primary shrink-0 relative overflow-visible z-50">
          {/* Left: Logo */}
          <div className="flex gap-6 items-center min-w-0 flex-1">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/images/logo-dark.png" alt="ChadWallet" width={24} height={24} className="rounded-lg" />
              <span className="font-bold text-lg hidden sm:block tracking-tight">ChadWallet</span>
            </Link>
            <button
              onClick={() => setShowMobileTokens(!showMobileTokens)}
              className="lg:hidden p-2 text-text-secondary hover:text-text-primary"
              title="Toggle token list"
            >
              <FiMenu className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Center: Search Bar */}
          <NavbarSearch
            trendingTokens={tokens}
            verifiedSet={verifiedSet}
            onSelectToken={(token) => {
              setSelectedToken(token);
              setTokens(prev => {
                if (!prev.some(t => t.address === token.address)) {
                  return [token, ...prev];
                }
                return prev;
              });
              router.push(`/trade/${token.address}`);
            }}
          />

          {/* Mobile: Search Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-2 text-text-secondary hover:text-text-primary"
              title="Search tokens"
            >
              <FiSearch className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Right side: SOL Balance and Profile */}
          <div className="flex min-w-0 flex-1 justify-end">
            <div className="flex gap-2 items-stretch">
              {/* Cash balance pill */}
              <li className="hidden lg:flex relative shrink-0 flex-col items-start justify-center h-12 rounded-xl border border-bg-tertiary px-2">
                <div className="flex gap-1 items-baseline tabular-nums">
                  <span className="text-sm text-white font-medium" data-balance>
                    {solBalance !== null
                      ? `${(solBalance * solPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
                      : '--'}
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

              {/* Profile Dropdown */}
              <li className="hidden lg:flex relative shrink-0 rounded-xl h-12 hover:bg-bg-secondary px-2 py-1 border border-bg-tertiary bg-bg-primary">
                <ProfileDropdown
                  ready={ready}
                  authenticated={!!walletAddress}
                  walletAddress={walletAddress}
                  dbUser={dbUser}
                  portfolioSummary={portfolioSummary}
                  onLogin={login}
                  onLogout={logout}
                />
              </li>
            </div>
          </div>
        </header>

        {/* Mobile Search Bar overlay */}
        {showMobileSearch && (
          <div className="lg:hidden px-3 py-2 border-b border-bg-tertiary bg-surface/50">
            <NavbarSearch
              trendingTokens={tokens}
              verifiedSet={verifiedSet}
              autoFocus
              className="relative block h-12 w-full min-w-0"
              onSelectToken={(token) => {
                setSelectedToken(token);
                setShowMobileSearch(false);
                setTokens(prev => {
                  if (!prev.some(t => t.address === token.address)) {
                    return [token, ...prev];
                  }
                  return prev;
                });
                router.push(`/trade/${token.address}`);
              }}
            />
          </div>
        )}
      </div>

      {/* Main 3-Column Persistent Structure */}
      <div className="flex gap-3 2xl:gap-3 flex-1 min-h-0 pr-4">
        {/* Left Sidebar: TrendingList - persistent across pages */}
        <div className={`
          ${showMobileTokens ? 'fixed inset-0 top-14 z-40 lg:static lg:inset-auto' : 'hidden lg:flex'}
          flex-col shrink-0 min-h-0 bg-surface/90 lg:bg-surface/30 backdrop-blur-sm lg:backdrop-blur-none
        `}>
          <div className="flex items-center justify-between px-4 py-3 lg:hidden border-b border-bg-tertiary">
            <span className="font-semibold text-sm text-white">Tokens</span>
            <button
              onClick={() => setShowMobileTokens(false)}
              className="p-1 text-text-tertiary hover:text-text-primary backdrop-blur-md"
            >
              <FiX className="h-[18px] w-[18px]" />
            </button>
          </div>

          <SplitTokenLists
            tokens={tokens}
            cryptoTokens={cryptoTokens}
            graduatedTokens={graduatedTokens}
            bondingTokens={bondingTokens}
            heldTokens={heldTokens}
            verifiedSet={verifiedSet}
            selectedAddress={selectedToken?.address || ''}
            onSelect={(token) => {
              setSelectedToken(token);
              setShowMobileTokens(false);
              router.push(`/trade/${token.address}`);
            }}
            isLoading={tokensLoading}
            walletAddress={walletAddress}
            watchlistAddresses={watchlistAddresses}
            onToggleWatchlist={toggleWatchlist}
          />
        </div>

        {/* Overlay for mobile tokens list */}
        {showMobileTokens && (
          <div
            className="fixed inset-0 top-14 z-30 bg-black/50 lg:hidden"
            onClick={() => setShowMobileTokens(false)}
          />
        )}

        {/* Center & Right Sub-page Content */}
        {children}
      </div>
    </div>
  );
}
