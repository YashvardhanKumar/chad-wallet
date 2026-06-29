'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';
import TokenSearchMenu, { SearchToken } from './TokenSearchMenu';

interface NavbarSearchProps {
  trendingTokens: SearchToken[];
  verifiedSet: Set<string>;
  onSelectToken?: (token: SearchToken) => void;
  className?: string;
  autoFocus?: boolean;
}

export default function NavbarSearch({
  trendingTokens,
  verifiedSet,
  onSelectToken,
  className = 'relative mt-1 hidden h-12 min-w-[320px] w-[400px] md:block lg:w-[640px]',
  autoFocus = false,
}: NavbarSearchProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchToken[]>([]);
  const [searchVerifiedSet, setSearchVerifiedSet] = useState<Set<string>>(new Set());

  const closeSearch = useCallback(() => {
    setSearchQuery('');
    setSearchFocused(false);
    searchInputRef.current?.blur();
  }, []);

  useEffect(() => {
    if (autoFocus) {
      searchInputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (!searchQuery) {
      const frame = requestAnimationFrame(() => setSearchResults([]));
      return () => cancelAnimationFrame(frame);
    }

    let cancelled = false;
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (!cancelled) {
          setSearchResults((data.tokens || []).map(mapSearchToken));
        }
      } catch (err) {
        console.warn('Failed to fetch search results:', err);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounce);
    };
  }, [searchQuery]);

  useEffect(() => {
    const visibleTokens = searchQuery ? searchResults : trendingTokens.slice(0, 5);
    const unverifiedAddresses = visibleTokens
      .map((token) => token.address)
      .filter((address) => address && !verifiedSet.has(address));

    if (unverifiedAddresses.length === 0) {
      const frame = requestAnimationFrame(() => setSearchVerifiedSet(new Set()));
      return () => cancelAnimationFrame(frame);
    }

    let cancelled = false;
    const unique = [...new Set(unverifiedAddresses)];
    fetch(`/api/verify-batch?addresses=${unique.join(',')}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled && d.verified) {
          setSearchVerifiedSet(new Set(d.verified));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [searchQuery, searchResults, trendingTokens, verifiedSet]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTypingTarget =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTypingTarget) {
        if (e.key === 'Escape' && searchFocused) {
          closeSearch();
          e.preventDefault();
        }
        return;
      }

      if (e.key === '/' || (e.metaKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === 'Escape') {
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSearch, searchFocused]);

  const handleSelect = (token: SearchToken) => {
    closeSearch();
    if (onSelectToken) {
      onSelectToken(token);
      return;
    }
    router.push(`/trade?address=${token.address}`);
  };

  const visibleTokens = searchQuery ? searchResults : trendingTokens.slice(0, 5);
  const combinedVerifiedSet = new Set([...verifiedSet, ...searchVerifiedSet]);
  const isActive = searchFocused || Boolean(searchQuery);

  return (
    <div className={className}>
      {isActive && (
        <button
          type="button"
          aria-label="Close search"
          className="fixed inset-0 z-40 bg-base-alpha-shadow-7"
          onClick={closeSearch}
        />
      )}

      <div className="absolute top-0 left-1/2 z-50 flex w-full -translate-x-1/2 flex-col">
        <div className="relative">
          {isActive && (
            <div className="pointer-events-none absolute -inset-2 rounded-2xl border border-bg-tertiary/80 bg-bg-secondary/40 backdrop-blur-sm" />
          )}

          <div className="relative z-10 flex flex-col">
            <div
              className={`flex h-12 cursor-text items-center gap-2 rounded-xl border border-bg-tertiary px-3 transition-colors hover:bg-bg-secondary ${
                isActive ? 'bg-bg-secondary' : 'bg-transparent'
              }`}
              onClick={() => searchInputRef.current?.focus()}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <FiSearch className="h-4 w-4 shrink-0 text-text-tertiary" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  placeholder="Search for tokens or traders..."
                  className="h-full min-w-0 flex-1 bg-transparent text-sm font-normal leading-none text-text-primary outline-none placeholder:text-text-tertiary"
                />
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      .readText()
                      .then((text) => {
                        if (text) setSearchQuery(text);
                      })
                      .catch(() => {});
                  }}
                  className="rounded-sm bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-bold text-text-secondary hover:text-text-primary"
                >
                  Paste
                </button>
                <div className="min-w-5 rounded-sm bg-bg-tertiary px-1.5 py-0.5 text-center text-[10px] font-bold text-text-secondary">
                  {isActive ? 'ESC' : '/'}
                </div>
              </div>
            </div>

            {isActive && (
              <TokenSearchMenu
                query={searchQuery}
                tokens={visibleTokens}
                verifiedSet={combinedVerifiedSet}
                onSelectToken={handleSelect}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function mapSearchToken(t: any): SearchToken {
  return {
    address: t.address,
    symbol: t.symbol,
    name: t.name,
    logoURI: t.logoURI || t.info?.imageLargeUrl || '',
    price: parseFloat(t.priceUSD || t.price || '0'),
    priceChange24h: parseFloat(t.change24 || t.priceChange24h || '0'),
    volume24h: parseFloat(t.volume24h || '0'),
    marketCap: parseFloat(t.marketCap || '0'),
    isVerified: t.isVerified || false,
  };
}
