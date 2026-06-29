'use client';

import React, { memo, useState, useEffect } from 'react';

interface TradingViewWidgetProps {
  tokenAddress: string;
  tokenSymbol: string;
}

function TradingViewWidget({ tokenAddress }: TradingViewWidgetProps) {
  const [embedUrl, setEmbedUrl] = useState<string>(
    `https://dexscreener.com/solana/${tokenAddress}?embed=1&theme=dark`
  );

  useEffect(() => {
    let active = true;
    async function getSolPair() {
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
        if (!res.ok) return;
        const data = await res.json();
        const pairs = data.pairs || [];
        // Filter for Solana chain and SOL quote currency
        const solPairs = pairs.filter(
          (p: any) =>
            p.chainId === 'solana' &&
            (p.quoteToken?.symbol === 'SOL' || p.quoteToken?.address === 'So11111111111111111111111111111111111111112')
        );

        if (solPairs.length > 0) {
          // Sort by liquidity USD descending
          solPairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
          const bestPair = solPairs[0].pairAddress;
          if (active && bestPair) {
            setEmbedUrl(`https://dexscreener.com/solana/${bestPair}?embed=1&theme=dark&trades=0&info=0`);
          }
        } else if (pairs.length > 0) {
          // Fallback to highest liquidity pair if no SOL pair exists
          pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
          const bestPair = pairs[0].pairAddress;
          if (active && bestPair) {
            setEmbedUrl(`https://dexscreener.com/solana/${bestPair}?embed=1&theme=dark&trades=0&info=0`);
          }
        }
      } catch (e) {
        console.error('Failed to fetch pair from DexScreener API:', e);
      }
    }

    getSolPair();
    return () => {
      active = false;
    };
  }, [tokenAddress]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#060510]">
      <iframe
        key={embedUrl}
        src={embedUrl}
        className="absolute left-0 w-full border-0"
        style={{
          top: '0px',
          height: 'calc(100% + 38px)', // 38px bottom crop
        }}
        title="TradingView Financial Chart"
        allowFullScreen
      />
    </div>
  );
}

export default memo(TradingViewWidget);
