'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, formatPercentChange } from '@/app/lib/constants';

interface BannerToken {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
  priceChange24h: number;
}

interface TokenBannerProps {
  direction?: 'left' | 'right';
}

export default function TokenBanner({ direction = 'left' }: TokenBannerProps) {
  const [tokens, setTokens] = useState<BannerToken[]>([]);

  useEffect(() => {
    async function fetchTokens() {
      try {
        const res = await fetch('/api/tokens?limit=20');
        const data = await res.json();
        if (data.tokens && data.tokens.length > 0) {
          setTokens(data.tokens);
        }
      } catch {
        setTokens([]);
      }
    }

    fetchTokens();
  }, []);

  if (tokens.length === 0) {
    return (
      <div className="h-14 animate-pulse" style={{ backgroundColor: 'rgba(204, 255, 0, 0.04)' }} />
    );
  }

  const displayTokens = [...tokens, ...tokens];

  return (
    <div className="relative overflow-hidden bg-[#cf0] text-black">
      <div className={direction === 'left' ? 'marquee-track-reverse' : 'marquee-track'}>
        {displayTokens.map((token, i) => (
          <Link
            key={`${token.address}-${i}`}
            href={`/trade/${token.address}`}
            className="flex shrink-0 items-center gap-2 px-3 py-2 transition-colors hover:opacity-75"
            style={{ color: 'var(--cw-banner-text)' }}
          >
            {token.logoURI ? (
              <Image
                src={token.logoURI}
                alt={token.symbol}
                width={24}
                height={24}
                className="rounded-full border border-black/10 object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-black/20 text-xs font-bold object-cover">
                {token.symbol.charAt(0)}
              </div>
            )}
            <span className="font-black uppercase text-black">${token.symbol}</span>
            <span
              className={`whitespace-nowrap font-bold text-black`}
            >
              {token.priceChange24h >= 0 ? '+' : ''}{formatPercentChange(token.priceChange24h)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
