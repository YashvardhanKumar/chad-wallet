'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import TraderHoverCard, { Avatar, PnlDisplay, hashToUsername, getProfileData } from './TraderHoverCard';

interface LeaderboardEntry {
  owner: string;
  total_value: number;
  pnl: number;
}

interface Token {
  address: string;
  symbol: string;
  logoURI: string;
}

type Duration = '24h' | '7d' | '30d' | 'all';

interface LeaderboardProps {
  onSelectWallet?: (wallet: string) => void;
}

function durationLabel(d: Duration): string {
  switch (d) {
    case '24h': return '24H';
    case '7d': return '7D';
    case '30d': return '30D';
    case 'all': return 'ALL';
  }
}

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 0) {
    return (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#FFD700" stroke="#B8960F" strokeWidth="1" />
        <circle cx="12" cy="12" r="8" fill="#FFC000" />
        <text x="12" y="16" textAnchor="middle" fill="#8B6914" fontWeight="bold" fontSize="11">1</text>
      </svg>
    );
  }
  if (rank === 1) {
    return (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#C0C0C0" stroke="#A0A0A0" strokeWidth="1" />
        <circle cx="12" cy="12" r="8" fill="#D0D0D0" />
        <text x="12" y="16" textAnchor="middle" fill="#707070" fontWeight="bold" fontSize="11">2</text>
      </svg>
    );
  }
  if (rank === 2) {
    return (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#CD7F32" stroke="#A0622E" strokeWidth="1" />
        <circle cx="12" cy="12" r="8" fill="#D4956A" />
        <text x="12" y="16" textAnchor="middle" fill="#6B4226" fontWeight="bold" fontSize="11">3</text>
      </svg>
    );
  }
  return (
    <div className="w-5 text-center text-xs text-text-secondary shrink-0">
      {rank + 1}.
    </div>
  );
}

function TokenStack({ tokens, walletAddr }: { tokens: any[]; walletAddr: string }) {
  const hash = (walletAddr || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pick = [...tokens].sort((a, b) => {
    const aAddr = a.address || a.token?.address || '';
    const bAddr = b.address || b.token?.address || '';
    const ha = aAddr.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    const hb = bAddr.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    return Math.abs(ha - hash) - Math.abs(hb - hash);
  });
  const show = pick.slice(0, 3);
  const remaining = pick.length > 3 ? pick.length - 3 : 0;

  return (
    <div className="flex flex-row items-center">
      {show.map((token, i) => (
        <div
          key={token.address || token.token?.address || i}
          className="rounded-full border-2 border-bg-primary bg-bg-secondary overflow-hidden shrink-0"
          style={{ width: 18, height: 18, marginLeft: i === 0 ? 0 : -5.6 }}
        >
          {(token.logoURI || token.token?.info?.imageLargeUrl) ? (
            <img
              className="w-full h-full rounded-full object-cover"
              src={token.logoURI || token.token?.info?.imageLargeUrl}
              alt=""
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-bg-tertiary" />
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className="rounded-full border border-bg-primary bg-bg-secondary flex items-center justify-center overflow-hidden shrink-0 text-text-secondary font-medium"
          style={{ width: 23, height: 23, marginLeft: -8, fontSize: 8 }}
        >
          {remaining}+
        </div>
      )}
    </div>
  );
}

export default function Leaderboard({ onSelectWallet }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [trendingTokens, setTrendingTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState<Duration>('24h');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [walletsInfo, setWalletsInfo] = useState<any>({});
  const { user } = usePrivy();
  const connectedWallet = user?.wallet?.address;

  // Fetch trending tokens for stack rings
  useEffect(() => {
    fetch('/api/tokens?limit=20')
      .then(r => r.json())
      .then(d => { if (d.tokens?.length) setTrendingTokens(d.tokens); })
      .catch(() => {});
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?limit=50&duration=${duration}`);
      const data = await res.json();
      setEntries(data.entries || []);
      
      const walletsRes = await fetch(`/api/wallets`);
      const walletsData = await walletsRes.json();
      if (walletsData.wallets) {
        setWalletsInfo(walletsData.wallets);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
    setIsLoading(false);
  }, [duration]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleSelectWallet = (wallet: string) => {
    setSelectedWallet(selectedWallet === wallet ? null : wallet);
    onSelectWallet?.(wallet);
  };

  const connectedRank = connectedWallet
    ? entries.findIndex((e) => e.owner.toLowerCase() === connectedWallet.toLowerCase())
    : -1;
  const connectedEntry = connectedRank >= 0 ? entries[connectedRank] : null;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      {/* Time filter pills */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        {(['24h', '7d', '30d', 'all'] as Duration[]).map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`inline-flex h-6 w-8 items-center justify-center rounded-md border text-xs font-bold leading-none transition-colors ${
              duration === d
                ? 'border-bg-tertiary-solid bg-bg-tertiary text-text-primary'
                : 'border-bg-tertiary-solid text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary focus:bg-bg-tertiary'
            }`}
          >
            {d.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Your rank card */}
      {connectedWallet && (
        <div className="mx-3 border-b border-dashed border-bg-tertiary py-2 flex items-center gap-2">
          <Avatar addr={connectedWallet} index={0} size={36} />
          <div className="flex flex-col items-start flex-1">
            <div className="text-xs text-text-secondary">Your rank</div>
            <div className="flex items-center gap-1">
              <span className="text-accent-primary font-bold">#</span>
              <span className="font-bold text-sm">
                {connectedRank >= 0 ? connectedRank + 1 : '--'}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-xs text-text-secondary">{durationLabel(duration)} PnL</div>
            <div className="flex gap-0.5 items-center" style={{ lineHeight: '20px' }}>
              {connectedEntry ? (
                <PnlDisplay value={connectedEntry.pnl} />
              ) : (
                <span className="text-sm font-medium text-text-tertiary">--</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      <div className="flex flex-col gap-px min-h-0 overflow-y-scroll overflow-x-hidden flex-1 px-2">
        {isLoading ? (
          <div className="px-2 py-4">
            <div className="animate-pulse space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-14 bg-bg-tertiary rounded-lg" />
              ))}
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="text-sm font-semibold text-text-primary">Leaderboard unavailable</div>
            <div className="mt-2 text-xs leading-5 text-text-tertiary">
              Leaderboard data will appear here when available.
            </div>
          </div>
        ) : (
          entries.map((entry, index) => {
            const { username, handle } = hashToUsername(entry.owner, index);
            const isSelected = selectedWallet === entry.owner;
            return (
              <div key={entry.owner} className="relative">
                <TraderHoverCard owner={entry.owner} totalValue={entry.total_value} pnl={entry.pnl} index={index}>
                  <a
                    onClick={(e) => { e.preventDefault(); handleSelectWallet(entry.owner); }}
                    href="#"
                    className={`flex gap-2.5 items-center px-2 py-1.5 rounded-lg min-w-0 transition-colors ${
                      isSelected
                        ? 'bg-bg-tertiary-solid'
                        : 'hover:bg-bg-secondary focus-visible:bg-bg-secondary'
                    }`}
                  >
                    <MedalIcon rank={index} />
                    <Avatar addr={entry.owner} index={index} size={36} />
                    <div className="flex flex-col justify-between gap-0.5 min-w-0 shrink flex-1">
                      <div className="truncate text-sm leading-5" translate="no">{username}</div>
                      <div className="text-text-secondary text-xs truncate leading-4" translate="no">
                        <span>{handle}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end h-12 gap-1 justify-center shrink-0">
                      <PnlDisplay value={entry.pnl} />
                      {trendingTokens.length > 0 && (
                        <TokenStack tokens={trendingTokens} walletAddr={entry.owner} />
                      )}
                    </div>
                  </a>
                </TraderHoverCard>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
