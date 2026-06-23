const MAINNET_RPC_URL = 'https://solana-rpc.publicnode.com';

export function getMainnetRpcUrl() {
  const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
  if (!rpcUrl || rpcUrl.includes('devnet')) return MAINNET_RPC_URL;
  return rpcUrl;
}

export function getMainnetRpcSubscriptionUrl() {
  return getMainnetRpcUrl().replace('https://', 'wss://');
}
