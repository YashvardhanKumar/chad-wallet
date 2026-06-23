'use client';

import { useState } from 'react';
import Link from 'next/link';
import WalletActionMenu from './WalletActionMenu';
import TokenSearch from './TokenSearch';

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div className="mb-0 py-3" style={{ backgroundColor: 'var(--cw-header-bg)' }}>
        <div className="relative flex items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-0.5">
              <a
                target="_blank"
                rel="noreferrer"
                aria-label="Follow ChadWallet on X"
                className="inline-flex items-center justify-center rounded-md p-2 text-[var(--cw-header-text-secondary)] transition-colors hover:text-[var(--cw-header-text-primary)]"
                href="https://x.com/intent/follow?screen_name=chadwallet"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                target="_blank"
                rel="noreferrer"
                aria-label="Join ChadWallet on Discord"
                className="inline-flex items-center justify-center rounded-md p-2 text-[var(--cw-header-text-secondary)] transition-colors hover:text-[var(--cw-header-text-primary)]"
                href="https://discord.gg/mdCjtyZ8G"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                  <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.79 13.79 0 0 0-.608 1.249 18.27 18.27 0 0 0-5.487 0 12.62 12.62 0 0 0-.617-1.249.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.23 14.23 0 0 0 1.226-1.994.076.076 0 0 0-.041-.105 13.114 13.114 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.245.198.372.292a.077.077 0 0 1-.006.128 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
            <Link
              aria-label="Go to ChadWallet home"
              className="inline-flex h-10 items-center px-1 text-xl font-black tracking-[0.03em] text-[var(--cw-header-text-primary)]"
              href="/"
            >
              ChadWallet
            </Link>
            <Link
              className="inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold tracking-[0.04em] text-[var(--cw-header-text-secondary)] transition-colors hover:text-[var(--cw-header-text-primary)] sm:text-base"
              href="/rewards"
            >
              Rewards
            </Link>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Search tokens"
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--cw-header-text-secondary)] transition-colors duration-200 hover:text-[var(--cw-header-text-primary)]"
              >
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
            <WalletActionMenu />
          </div>
        </div>
      </div>
      {searchOpen && <TokenSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}
