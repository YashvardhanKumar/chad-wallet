'use client';

import { useState, useEffect, useCallback } from 'react';
import { shortenAddress } from '@/app/lib/constants';
import { usePrivy } from '@privy-io/react-auth';

interface LeaderboardEntry {
  owner: string;
  total_value: number;
}

type Duration = '24h' | '7d' | '30d' | 'all';

interface LeaderboardProps {
  onSelectWallet?: (wallet: string) => void;
}

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 0) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#FFD700" stroke="#B8960F" strokeWidth="1" />
        <path d="M12 6L14.2 8.8L17.5 9.2L15 11.4L15.6 14.6L12 13L8.4 14.6L9 11.4L6.5 9.2L9.8 8.8L12 6Z" fill="#FFF8DC" />
      </svg>
    );
  }
  if (rank === 1) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#C0C0C0" stroke="#A0A0A0" strokeWidth="1" />
        <path d="M12 6L14.2 8.8L17.5 9.2L15 11.4L15.6 14.6L12 13L8.4 14.6L9 11.4L6.5 9.2L9.8 8.8L12 6Z" fill="#F0F0F0" />
      </svg>
    );
  }
  if (rank === 2) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#CD7F32" stroke="#A0622E" strokeWidth="1" />
        <path d="M12 6L14.2 8.8L17.5 9.2L15 11.4L15.6 14.6L12 13L8.4 14.6L9 11.4L6.5 9.2L9.8 8.8L12 6Z" fill="#F5DEB3" />
      </svg>
    );
  }
  return (
    <span className="w-[18px] inline-flex items-center justify-center text-[11px] font-semibold text-text-tertiary">
      {rank + 1}
    </span>
  );
}

function AvatarPlaceholder({ address, index }: { address: string; index: number }) {
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = (hash * 7 + index * 37) % 360;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 border-2 border-bg-secondary"
      style={{ backgroundColor: `hsl(${hue}, 60%, 40%)` }}
    >
      {address.slice(0, 2).toUpperCase()}
    </div>
  );
}

function PnlValue({ value }: { value: number }) {
  const isPositive = value >= 0;
  const formatted = value >= 1e6
    ? `${isPositive ? '+' : '-'}$${(Math.abs(value) / 1e6).toFixed(2)}M`
    : value >= 1e3
    ? `${isPositive ? '+' : '-'}$${(Math.abs(value) / 1e3).toFixed(2)}K`
    : `${isPositive ? '+' : '-'}$${Math.abs(value).toFixed(2)}`;
  return (
    <span className={`text-[13px] font-semibold ${isPositive ? 'text-green' : 'text-red'}`}>
      {formatted}
    </span>
  );
}

export default function Leaderboard({ onSelectWallet }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState<Duration>('all');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const { user } = usePrivy();
  const connectedWallet = user?.wallet?.address;

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?limit=50&duration=${duration}`);
      const data = await res.json();
      setEntries(data.entries || []);
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
    <div className="h-full flex flex-col bg-bg-secondary rounded-xl overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-bg-tertiary">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-yellow-400 text-sm">🏆</span>
          <h2 className="font-semibold text-[13px] text-text-primary">Leaderboard</h2>
        </div>
        <div className="relative shrink-0">
          <div className="no-scrollbar overflow-x-auto overflow-y-hidden cursor-grab flex gap-2 px-3 pt-2 pb-1 whitespace-nowrap">
            {(['24h', '7d', '30d', 'all'] as Duration[]).map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`inline-flex h-6 items-center justify-center border border-bg-tertiary rounded-md px-1.5 text-xs font-bold leading-none shrink-0 whitespace-nowrap transition-colors ${
                  duration === d
                    ? 'bg-bg-tertiary-solid text-text-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary focus:bg-bg-tertiary'
                }`}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-bg-primary to-transparent" />
        </div>
      </div>

      {/* Your rank card */}
      {connectedWallet && (
        <div className="shrink-0 px-4 py-3 border-b border-bg-tertiary">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0">
              {connectedWallet.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-text-tertiary font-medium">Your rank</div>
              <div className="font-bold text-[13px] text-text-primary truncate">
                {connectedRank >= 0 ? `#${connectedRank + 1}` : '--'}
              </div>
            </div>
            {connectedEntry && (
              <PnlValue value={connectedEntry.total_value} />
            )}
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="px-4 py-8">
            <div className="animate-pulse space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-bg-tertiary rounded-lg" />
              ))}
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-sm font-semibold text-text-primary">Leaderboard unavailable</div>
            <div className="mt-2 text-xs leading-5 text-text-tertiary">
              Leaderboard data will appear here when available.
            </div>
          </div>
        ) : (
          entries.map((entry, index) => {
            const isSelected = selectedWallet === entry.owner;
            return (
              <button
                key={entry.owner}
                onClick={() => handleSelectWallet(entry.owner)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-left ${
                  isSelected ? 'bg-white/[0.06]' : ''
                }`}
              >
                {/* Rank / medal */}
                <div className="w-5 flex justify-center shrink-0">
                  <MedalIcon rank={index} />
                </div>

                {/* Overlapping token avatars (3 circles) */}
                <div className="relative w-[52px] h-8 shrink-0">
                  <div className="absolute left-0 top-0 z-30">
                    <AvatarPlaceholder address={entry.owner} index={0} />
                  </div>
                  <div className="absolute left-4 top-0 z-20">
                    <AvatarPlaceholder address={entry.owner} index={1} />
                  </div>
                  <div className="absolute left-8 top-0 z-10">
                    <AvatarPlaceholder address={entry.owner} index={2} />
                  </div>
                </div>

                {/* Wallet address */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13px] text-text-primary truncate">
                    {shortenAddress(entry.owner, 4)}
                  </div>
                </div>

                {/* PnL value */}
                <div className="text-right shrink-0">
                  <PnlValue value={entry.total_value} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
