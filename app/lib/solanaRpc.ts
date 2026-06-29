const MAINNET_RPC_URL = 'https://solana-rpc.publicnode.com';

export function getRawMainnetRpcUrl() {
  const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
  if (!rpcUrl || rpcUrl.includes('devnet')) return MAINNET_RPC_URL;
  return rpcUrl;
}

export function getMainnetRpcUrl() {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/rpc`;
  }
  return getRawMainnetRpcUrl();
}

export function getMainnetRpcSubscriptionUrl() {
  return getRawMainnetRpcUrl().replace('https://', 'wss://');
}
