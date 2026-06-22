'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'clxxxxxxxxxxxxxxx'}
      config={{
        loginMethods: ['google', 'apple'],
        appearance: {
          theme: 'dark',
          accentColor: '#10B981',
          logo: '/images/logo-dark.png',
        },
        solana: {
          rpcs: {
            'solana:mainnet': {
              rpc: createSolanaRpc(
                process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://api.mainnet-beta.solana.com'
              ),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                (process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://api.mainnet-beta.solana.com')
                  .replace('https://', 'wss://')
              ),
            },
            'solana:devnet': {
              rpc: createSolanaRpc(
                (process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL?.includes('devnet')
                  ? process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL
                  : undefined) || 'https://api.devnet.solana.com'
              ),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com'),
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
      {children}
    </PrivyProvider>
  );
}

