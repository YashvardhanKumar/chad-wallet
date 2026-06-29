'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTrading } from '@/app/context/TradingContext';
import TokenInfo from '@/app/components/trading/TokenInfo';
import TradePanel from '@/app/components/trading/TradePanel';
import { FiActivity } from 'react-icons/fi';

export default function TradingDashboard({ initialAddress }: { initialAddress?: string }) {
  const router = useRouter();
  const { selectedToken, setSelectedToken, tokens } = useTrading();
  const [mobileTab, setMobileTab] = useState<'chart' | 'trade'>('chart');
  const redirectedRef = useRef(false);

  // Redirect /trade → /trade/<first_token> once tokens load
  useEffect(() => {
    if (!initialAddress && tokens.length > 0 && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace(`/trade/${tokens[0].address}`);
    }
  }, [initialAddress, tokens, router]);

  useEffect(() => {
    if (initialAddress && tokens.length > 0) {
      const found = tokens.find(t => t.address === initialAddress);
      if (found) {
        setSelectedToken(found);
      }
    }
  }, [initialAddress, tokens, setSelectedToken]);

  return (
    <>
      {/* Desktop Middle: Token info & chart */}
      <div className="flex-1 overflow-y-auto custom-scrollbar hidden lg:block">
        {selectedToken ? (
          <TokenInfo key={selectedToken.address} token={selectedToken} />
        ) : (
          <div className="flex items-center justify-center h-full text-text-tertiary">
            Select a token to view details
          </div>
        )}
      </div>

      {/* Desktop Right: Buy & Sell panel */}
      <div className="hidden lg:flex flex-col gap-4 w-75 2xl:w-90 shrink-0 pr-4 overflow-y-auto custom-scrollbar h-full">
        <TradePanel key={selectedToken?.address} token={selectedToken} />
      </div>

      {/* Mobile view */}
      <div className="flex flex-col flex-1 lg:hidden min-h-0 min-w-0 pr-4 pb-12">
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {mobileTab === 'chart' ? (
            selectedToken ? (
              <TokenInfo key={selectedToken.address} token={selectedToken} />
            ) : (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                Select a token to view details
              </div>
            )
          ) : (
            <TradePanel key={selectedToken?.address} token={selectedToken} />
          )}
        </div>

        {/* Mobile bottom tab bar */}
        <div className="absolute bottom-0 left-0 right-0 h-12 flex border-t border-bg-tertiary bg-surface z-50">
          <button
            onClick={() => setMobileTab('chart')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition-colors ${
              mobileTab === 'chart' ? 'text-accent-primary' : 'text-text-tertiary'
            }`}
          >
            <FiActivity className="h-4 w-4" />
            Chart
          </button>
          <button
            onClick={() => setMobileTab('trade')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition-colors ${
              mobileTab === 'trade' ? 'text-accent-primary' : 'text-text-tertiary'
            }`}
          >
            <FiActivity className="h-4 w-4" />
            Trade
          </button>
        </div>
      </div>
    </>
  );
}
