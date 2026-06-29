'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatMarketCap } from '@/app/lib/constants';
import Image from 'next/image';

interface SearchToken {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
  priceChange24h: number;
  marketCap: number;
}

export default function TokenSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchToken[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/tokens?limit=10')
      .then((r) => r.json())
      .then((d) => {
        if (d.tokens) setResults(d.tokens);
      })
      .catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const debouncedQuery = setTimeout(async () => {
      if (!query.trim()) {
        const res = await fetch('/api/tokens?limit=10');
        const d = await res.json();
        setResults(d.tokens || []);
        return;
      }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.tokens || []);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(debouncedQuery);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const panelId = 'token-search-panel';
  const inputId = 'token-search-input';

  return (
    <div className="fixed inset-x-0 top-0 z-110 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <div ref={panelRef} className="w-full max-w-[min(28rem,calc(100vw-2rem))]">
        <form onSubmit={(e) => e.preventDefault()}>
          <label className="sr-only" htmlFor={inputId}>Search tokens</label>
          <div className="flex h-12 items-center gap-3 rounded-t-[1.75rem] border border-[color-mix(in_srgb,var(--cw-header-border)_72%,transparent)] border-b-transparent bg-[color-mix(in_srgb,var(--cw-surface)_82%,var(--cw-bg-app))] px-4 text-(--cw-header-text-primary) shadow-[0_22px_36px_-30px_rgba(0,0,0,0.95)] transition-[border-color,box-shadow,border-radius] duration-200 focus-within:border-[color-mix(in_srgb,var(--cw-hover-accent)_28%,var(--cw-header-border))] focus-within:shadow-[0_26px_44px_-30px_rgba(0,0,0,0.98)]">
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5 shrink-0 text-(--cw-header-text-secondary)" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              id={inputId}
              placeholder="Search by token or address"
              autoComplete="off"
              spellCheck="false"
              aria-controls={panelId}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-(--cw-header-text-primary) placeholder:text-[color-mix(in_srgb,var(--cw-header-text-secondary)_88%,transparent)] focus:outline-none focus:ring-0 sm:text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            />
            <button
              type="button"
              aria-label="Close token search"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-(--cw-header-text-primary) transition-colors hover:bg-[color-mix(in_srgb,var(--cw-header-text-primary)_10%,transparent)]"
            >
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-[18px] w-[18px]" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </form>

        <div
          id={panelId}
          className="overflow-hidden rounded-b-2xl border border-[color-mix(in_srgb,var(--cw-header-border)_72%,transparent)] border-t-transparent bg-[color-mix(in_srgb,var(--cw-bg-app)_88%,black)] shadow-[0_34px_60px_-34px_rgba(0,0,0,1)] backdrop-blur"
        >
          <div className="max-h-[min(28rem,calc(100vh-10rem))] overflow-y-auto p-2">
            <div className="grid gap-1">
              {results.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-(--cw-text-secondary)">
                  No tokens found
                </div>
              ) : (
                results.map((token) => (
                  <Link
                    key={token.address}
                    href={`/tokens/solana/${token.address}?timeFrame=1D`}
                    onClick={onClose}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                  >
                    {token.logoURI ? (
                      <Image
                        alt={`${token.name} logo`}
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-full bg-white/10 object-cover"
                        src={token.logoURI}
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-white">
                        {token.name}
                      </span>
                      <span className="block truncate text-xs font-semibold uppercase text-white/50">
                        {token.symbol}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-bold text-white">
                        {formatMarketCap(token.marketCap)}
                      </span>
                      <span
                        className={`block text-xs font-bold ${
                          token.priceChange24h >= 0
                            ? 'text-emerald-300'
                            : 'text-red-300'
                        }`}
                      >
                        {token.priceChange24h >= 0 ? '+' : ''}
                        {token.priceChange24h.toFixed(2)}%
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
