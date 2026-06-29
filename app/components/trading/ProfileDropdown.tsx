'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiUser, FiCopy, FiCheck, FiLogOut, FiEye, FiEyeOff } from 'react-icons/fi';
import { shortenAddress } from '@/app/lib/constants';
import { useBlurBalance } from '@/app/lib/BlurBalanceContext';

interface ProfileDropdownProps {
  ready: boolean;
  authenticated: boolean;
  walletAddress?: string;
  dbUser?: any;
  portfolioSummary?: { totalValue: number; totalPnl: number } | null;
  onLogin: () => void;
  onLogout: () => void | Promise<void>;
}

export default function ProfileDropdown({
  ready,
  authenticated,
  walletAddress,
  dbUser,
  portfolioSummary,
  onLogin,
  onLogout,
}: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const { isBlurred, toggleBlur } = useBlurBalance();
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearTimer();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(false), 150);
  };

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  const handleLogout = async () => {
    setOpen(false);
    await onLogout();
    router.push('/');
  };

  const avatarColor = walletAddress
    ? `hsl(${walletAddress.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360}, 60%, 55%)`
    : '#2c264d';

  if (!ready) return null;

  if (!authenticated) {
    return (
      <button
        onClick={onLogin}
        className="flex gap-2 items-center min-w-[104px] text-accent-primary text-sm font-bold"
      >
        Connect
      </button>
    );
  }

  return (
    <div
      className="relative"
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={`/profile/${dbUser?.username || walletAddress}`}
        className="flex gap-2 items-center min-w-[104px] cursor-pointer no-underline"
        onClick={() => setOpen(false)}
      >
        <div className="flex flex-col flex-1 text-left">
          {portfolioSummary ? (
            <>
              <div className="text-sm text-white font-medium tabular-nums" data-balance>
                {portfolioSummary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} SOL
              </div>
              <div className={`text-xs font-medium tabular-nums ${portfolioSummary.totalPnl >= 0 ? 'text-green' : 'text-red'}`} data-balance>
                {portfolioSummary.totalPnl >= 0 ? '+' : ''}{portfolioSummary.totalPnl.toFixed(4)} SOL
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-white font-medium truncate max-w-24">
                {dbUser?.display_name || shortenAddress(walletAddress || '', 4)}
              </div>
              <div className="flex gap-1 items-center tabular-nums">
                <div className="flex gap-0.5 items-center" style={{ lineHeight: '16px' }}>
                  <div className="text-xs font-medium text-text-secondary">--</div>
                </div>
              </div>
            </>
          )}
        </div>
        <div
          className="rounded-full flex items-center justify-center shrink-0 overflow-hidden"
          style={{
            height: 32,
            width: 32,
            backgroundColor: avatarColor,
          }}
        >
          {dbUser?.avatar_url ? (
            <img src={dbUser.avatar_url} alt={dbUser.display_name} className="w-full h-full object-cover rounded-full" />
          ) : (
            walletAddress ? walletAddress.slice(0, 2).toUpperCase() : 'CW'
          )}
        </div>
      </Link>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-bg-tertiary bg-[#0d0b1a] shadow-xl z-50 p-1.5 overflow-hidden"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
            <Link
              href={`/profile/${dbUser?.username || walletAddress}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
            >
              <FiUser className="w-4 h-4 text-text-secondary" />
              Profile
            </Link>

            <button
              onClick={handleCopy}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-primary hover:bg-bg-secondary transition-colors w-full cursor-pointer"
            >
              {copied ? (
                <FiCheck className="w-4 h-4 text-green" />
              ) : (
                <FiCopy className="w-4 h-4 text-text-secondary" />
              )}
              {copied ? 'Copied!' : 'Copy Address'}
            </button>

            <button
              onClick={toggleBlur}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-primary hover:bg-bg-secondary transition-colors w-full cursor-pointer"
            >
              {isBlurred ? (
                <FiEyeOff className="w-4 h-4 text-text-secondary" />
              ) : (
                <FiEye className="w-4 h-4 text-text-secondary" />
              )}
              {isBlurred ? 'Show Balances' : 'Hide Balances'}
            </button>

            <div className="h-px bg-bg-tertiary mx-2 my-1" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red hover:bg-bg-secondary transition-colors w-full cursor-pointer"
            >
              <FiLogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
      )}
    </div>
  );
}
