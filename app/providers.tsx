'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { getMainnetRpcSubscriptionUrl, getMainnetRpcUrl } from '@/app/lib/solanaRpc';

function AuthRedirect() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/trade');
    }
  }, [ready, authenticated, router]);

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
      {children}
    </PrivyProvider>
  );
}
