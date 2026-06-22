'use client';

import { useState } from 'react';
import Image from 'next/image';

interface TokenLogoProps {
  token: {
    address: string;
    symbol: string;
    logoURI?: string;
  };
  size?: number;
}

export default function TokenLogo({ token, size = 36 }: TokenLogoProps) {
  const [error, setError] = useState(false);

  if (!token.logoURI || error) {
    return (
      <div 
        style={{ width: size, height: size, fontSize: Math.max(10, size / 2.5) }} 
        className="rounded-full bg-surface flex items-center justify-center font-bold text-accent shrink-0 border border-border"
      >
        {token.symbol.charAt(0)}
      </div>
    );
  }

  return (
    <Image
      src={token.logoURI}
      alt={token.symbol}
      width={size}
      height={size}
      className="rounded-full shrink-0 object-cover bg-surface"
      unoptimized
      onError={() => setError(true)}
    />
  );
}
