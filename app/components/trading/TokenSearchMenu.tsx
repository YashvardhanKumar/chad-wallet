'use client';

import { FaCheckCircle } from 'react-icons/fa';
import TokenLogo from './TokenLogo';
import { shortenAddress, formatPrice, formatMarketCap } from '@/app/lib/constants';

export interface SearchToken {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  isVerified?: boolean;
}

interface TokenSearchMenuProps {
  query: string;
  tokens: SearchToken[];
  verifiedSet: Set<string>;
  onSelectToken: (token: SearchToken) => void;
}

export default function TokenSearchMenu({
  query,
  tokens,
  verifiedSet,
  onSelectToken,
}: TokenSearchMenuProps) {
  return (
    <div className="overflow-hidden opacity-100 transition-[max-height,opacity] duration-150 ease-out">
      <div className="flex min-h-[280px] max-h-[440px] flex-col overflow-y-auto">
        {!query && (
          <div className="flex h-9 shrink-0 items-center px-2 text-xs font-semibold text-text-secondary">
            Trending tokens
          </div>
        )}

        {query && (
          <div className="flex h-9 shrink-0 items-center gap-1 px-2">
            <button className="rounded-md border border-bg-tertiary-solid bg-bg-tertiary px-1.5 py-0.5 text-xs font-bold text-text-primary">
              All
            </button>
            <button className="rounded-md border border-bg-tertiary-solid px-1.5 py-0.5 text-xs font-bold text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary">
              Tokens
            </button>
            <button className="rounded-md border border-bg-tertiary-solid px-1.5 py-0.5 text-xs font-bold text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary">
              Users
            </button>
          </div>
        )}

        {tokens.length > 0 ? (
          tokens.map((token) => (
            <TokenSearchMenuRow
              key={token.address}
              token={token}
              isVerified={verifiedSet.has(token.address) || !!token.isVerified}
              onSelect={() => onSelectToken(token)}
            />
          ))
        ) : (
          <div className="px-4 py-4 text-center text-sm text-text-tertiary">
            No tokens found
          </div>
        )}
      </div>
    </div>
  );
}

function TokenSearchMenuRow({
  token,
  isVerified,
  onSelect,
}: {
  token: SearchToken;
  isVerified: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="block w-full rounded-lg text-left hover:bg-bg-tertiary/60 focus:bg-bg-tertiary/60 focus:outline-none"
    >
      <div className="flex shrink-0 items-center gap-3 px-2 py-2">
        <div className="relative h-9 w-9 shrink-0">
          <TokenLogo token={token} size={36} />
          {isVerified && (
            <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center">
              <FaCheckCircle className="h-3.5 w-3.5 text-green" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-text-primary">{token.symbol}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <span className="max-w-24 truncate">{token.name}</span>
            <span className="hidden text-xs text-text-tertiary lg:block">
              {shortenAddress(token.address, 4)}
            </span>
          </div>
        </div>

        <div className="hidden w-22 shrink-0 items-center gap-1.5 text-xs lg:flex">
          <div className="rounded-sm border border-bg-tertiary px-1 py-px text-[10px] font-bold text-text-tertiary">
            MC
          </div>
          <div className="text-text-primary">{formatMarketCap(token.marketCap)}</div>
        </div>

        <div className="w-18 shrink-0 text-right text-xs">
          <span className="font-mono tabular-nums text-text-primary">{formatPrice(token.price)}</span>
        </div>

        <div className="w-14 shrink-0">
          <span className={`text-xs ${token.priceChange24h >= 0 ? 'text-green' : 'text-red'}`}>
            {token.priceChange24h >= 0 ? '+' : ''}
            {token.priceChange24h.toFixed(2)}%
          </span>
        </div>
      </div>
    </button>
  );
}
