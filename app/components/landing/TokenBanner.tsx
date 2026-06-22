'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, formatPercentChange, KNOWN_TOKENS } from '@/app/lib/constants';

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
        } else {
          setFallbackTokens();
        }
      } catch {
        setFallbackTokens();
      }
    }

    function setFallbackTokens() {
      setTokens(
        KNOWN_TOKENS.map((t) => ({
          address: t.address,
          symbol: t.symbol,
          name: t.name,
          logoURI: t.logoURI,
          price: Math.random() * 200,
          priceChange24h: (Math.random() - 0.4) * 40,
        }))
      );
    }

    fetchTokens();
  }, []);

  if (tokens.length === 0) {
    return (
      <div className="h-14 bg-surface/50 animate-pulse" />
    );
  }

  // Duplicate tokens for seamless loop
  const displayTokens = [...tokens, ...tokens];

  return (
    <div className="relative overflow-hidden bg-surface/50 border-y border-border">
      <div className={direction === 'left' ? 'marquee-track' : 'marquee-track-reverse'}>
        {displayTokens.map((token, i) => (
          <Link
            key={`${token.address}-${i}`}
            href={`/trade/${token.address}`}
            className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0"
          >
            {token.logoURI ? (
              <Image
                src={token.logoURI}
                alt={token.symbol}
                width={28}
                height={28}
                className="rounded-full"
                unoptimized
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                {token.symbol.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-sm whitespace-nowrap">{token.symbol}</span>
            <span className="text-text-secondary text-sm whitespace-nowrap">{formatPrice(token.price)}</span>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                token.priceChange24h >= 0 ? 'text-green' : 'text-red'
              }`}
            >
              {formatPercentChange(token.priceChange24h)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
