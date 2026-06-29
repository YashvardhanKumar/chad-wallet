'use client';

import * as HoverCard from '@radix-ui/react-hover-card';
import { SiX } from 'react-icons/si';
import { ReactNode } from 'react';

export function hashToUsername(addr: string, index: number): { username: string; handle: string } {
  const hash = addr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const prefixes = ['', 'real_', 'its_', 'x_', 'o_', 'degen_', 'alpha_', 'mega_', 'super_', 'ultra_'];
  const mid = ['crypto', 'sol', 'moon', 'star', 'wave', 'ape', 'bull', 'wolf', 'king', 'wise',
    'shadow', 'phantom', 'neon', 'blaze', 'frost', 'storm', 'thunder', 'cosmo', 'nova', 'zeta',
    'Pure', 'Dark', 'Big', 'Fast', 'Gold', 'Iron', 'Blue', 'Red', 'Zero', 'Mega',
    'Lucky', 'Alpha', 'Beta', 'Brave', 'Chad', 'Dumb', 'Epic', 'Fat', 'Giga', 'Huge',
    'Pixel', 'Rune', 'Void', 'Wise', 'Zen', 'Arc', 'Nox', 'Onyx', 'Vex', 'Zion'];
  const ends = ['er', 'or', 'ist', 'ian', 'ken', 'man', 'bot', 'cat', 'dog', 'fox',
    '_', 'x', 'z', 'io', 'ex', '_,', 'ix', 'on', 'us', '', '', '', ''];

  const p = prefixes[hash % prefixes.length];
  const m = mid[(hash * 7 + index * 3) % mid.length];
  const e = ends[(hash * 13 + index * 5) % ends.length];
  const suffix = hash % 3 === 0 ? (hash % 100).toString() : '';
  const username = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase() + e + suffix;
  const handle = p + username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return { username: username.slice(0, 18), handle: '@' + handle.slice(0, 18) };
}

export function getProfileData(addr: string): { bio: string; following: number; followers: number } {
  const hash = addr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bios = [
    'winner', 'degen since day one', 'solana maxi', 'early af', 'gm',
    'here for the tech', 'number go up', 'bags packed', 'full port',
    'risk management? never heard of her', 'lfg', 'don\'t rug me bro',
    'floor is lava', 'moon or bust', 'just chilling',
  ];
  return {
    bio: bios[hash % bios.length],
    following: (hash * 7) % 500 + 1,
    followers: (hash * 13) % 50000 + 100,
  };
}

export function getProfilePic(addr: string): string {
  const hash = addr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `https://prod-fomo-profile-pics.s3.amazonaws.com/${hash.toString(16).padStart(32, '0')}.jpg`;
}

export function Avatar({ addr, index, size }: { addr: string; index: number; size: number }) {
  const hash = addr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = (hash * 7 + index * 37) % 360;
  const bg = `hsl(${hue}, 60%, 55%)`;
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 text-white font-bold"
      style={{ height: size, width: size, backgroundColor: bg, fontSize: size * 0.4 }}
    >
      {addr.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function PnlDisplay({ value }: { value: number }) {
  const isPositive = value >= 0;
  const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <span className={`text-sm font-medium ${isPositive ? 'text-green' : 'text-red'}`}>
      {isPositive ? '+' : '-'}{formatted} SOL
    </span>
  );
}

interface TraderHoverCardProps {
  owner: string;
  totalValue: number;
  pnl: number;
  index: number;
  children: ReactNode;
}

export default function TraderHoverCard({ owner, totalValue, pnl, index, children }: TraderHoverCardProps) {
  const { username, handle } = hashToUsername(owner, index);
  const profile = getProfileData(owner);

  return (
    <HoverCard.Root openDelay={300} closeDelay={100}>
      <HoverCard.Trigger asChild>
        {children}
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="right"
          align="center"
          sideOffset={8}
          className="z-50 rounded-2xl border text-text-primary outline-hidden w-70 bg-bg-secondary border-bg-tertiary shadow-xl p-3"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div className="relative shrink-0" style={{ width: 40, height: 40 }}>
                <div className="absolute inset-0">
                  <Avatar addr={owner} index={index} size={40} />
                </div>
                <img
                  className="rounded-full shrink-0 object-cover relative z-10"
                  src={getProfilePic(owner)}
                  style={{ width: 40, height: 40 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <button
                type="button"
                className="min-w-20 overflow-hidden rounded-lg px-2 py-1 text-xs font-bold bg-accent-primary text-text-primary cursor-pointer hover:opacity-80"
              >
                Follow
              </button>
            </div>
            <div className="flex flex-col gap-0.5 px-0.5">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm text-text-primary" translate="no">{username}</span>
                <a
                  href={`https://x.com/${handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${username}'s X profile`}
                  className="flex items-center justify-center rounded-sm bg-bg-tertiary p-0.5 hover:opacity-80"
                >
                  <SiX className="h-3 w-3 text-text-primary" />
                </a>
              </div>
              <span className="text-xs text-text-secondary" translate="no">{handle}</span>
            </div>
            <p className="m-0 line-clamp-2 px-0.5 text-sm leading-tight text-text-primary">{profile.bio}</p>
            <div className="flex flex-wrap items-center gap-2 px-0.5">
              <div className="flex items-center gap-1 overflow-hidden">
                <span className="text-xs font-bold text-text-primary">{profile.following}</span>
                <span className="text-xs text-text-secondary">following</span>
              </div>
              <div className="flex items-center gap-1 overflow-hidden">
                <span className="text-xs font-bold text-text-primary">{profile.followers >= 1000 ? `${(profile.followers / 1000).toFixed(1)}K` : profile.followers}</span>
                <span className="text-xs text-text-secondary">followers</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-bg-tertiary px-3 py-2 ring ring-bg-tertiary">
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">Portfolio</span>
              <span className="text-sm tabular-nums text-text-primary" translate="no">
                 {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SOL
               </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-text-secondary">7d PnL</span>
                <PnlDisplay value={pnl} />
              </div>
            </div>
          </div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}