'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { getMainnetRpcSubscriptionUrl, getMainnetRpcUrl } from '@/app/lib/solanaRpc';
import { BlurBalanceProvider } from '@/app/lib/BlurBalanceContext';

import { TradingProvider } from '@/app/context/TradingContext';

function AuthRedirect() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && authenticated && pathname === '/') {
      router.push('/trade');
    }
  }, [ready, authenticated, pathname, router]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'clxxxxxxxxxxxxxxx'}
      config={{
        loginMethods: ['google'],
        appearance: {
          theme: 'dark',
          accentColor: '#10B981',
          logo: '/images/logo-dark.png',
        },
        solana: {
          rpcs: {
            'solana:mainnet': {
              rpc: createSolanaRpc(getMainnetRpcUrl()),
              rpcSubscriptions: createSolanaRpcSubscriptions(getMainnetRpcSubscriptionUrl()),
            },
          },
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'all-users',
          },
        },
      }}
    >
      <AuthRedirect />
      <BlurBalanceProvider>
        <TradingProvider>
          {children}
        </TradingProvider>
      </BlurBalanceProvider>
    </PrivyProvider>
  );
}
