'use client';

import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

export default function WalletActionMenu() {
  const { login, logout, authenticated, ready } = usePrivy();

  return (
    <div className="relative inline-block">
      <Menu>
        <MenuButton className="inline-flex items-center justify-center rounded-md p-2 text-[var(--cw-header-text-secondary)] transition-colors hover:text-[var(--cw-header-text-primary)] disabled:cursor-not-allowed disabled:opacity-50">
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="15" r="3" />
            <circle cx="9" cy="7" r="4" />
            <path d="M10 15H6a4 4 0 0 0-4 4v2" />
            <path d="m21.7 16.4-.9-.3" />
            <path d="m15.2 13.9-.9-.3" />
            <path d="m16.6 18.7.3-.9" />
            <path d="m19.1 12.2.3-.9" />
            <path d="m19.6 18.7-.4-1" />
            <path d="m16.8 12.3-.4-1" />
            <path d="m14.3 16.6 1-.4" />
            <path d="m20.7 13.8 1-.4" />
          </svg>
        </MenuButton>
        <MenuItems
          transition
          anchor="bottom end"
          className="mt-1 w-48 origin-top-right rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 text-sm text-[var(--text-primary)] shadow-lg transition duration-100 ease-out [--anchor-gap:4px] data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {ready && authenticated ? (
            <>
              <MenuItem>
                <Link
                  href="/rewards"
                  className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 data-[focus]:bg-white/10"
                >
                  Rewards
                </Link>
              </MenuItem>
              <MenuItem>
                <button
                  onClick={logout}
                  className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 data-[focus]:bg-white/10"
                >
                  Logout
                </button>
              </MenuItem>
            </>
          ) : (
            <MenuItem>
              <button
                onClick={login}
                className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 data-[focus]:bg-white/10"
              >
                Login
              </button>
            </MenuItem>
          )}
        </MenuItems>
      </Menu>
    </div>
  );
}
