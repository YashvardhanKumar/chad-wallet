// App constants
export const APP_NAME = 'ChadWallet';
export const APP_DESCRIPTION = 'Find the next 100x memecoins. Trade trending Solana tokens 24/7.';
export const APP_TAGLINE = 'the only wallet you need.';

export const STORE_LINKS = {
  android: 'https://play.google.com/store/apps/details?id=xyz.chadwallet.www',
  ios: 'https://apps.apple.com/us/app/chadwallet/id6757367474',
};

export const SOCIAL_LINKS = {
  twitter: 'https://x.com/chadwallet',
  website: 'https://chadwallet.xyz',
};

// Feature cards for the landing page
export const FEATURES = [
  {
    tag: 'TRADING',
    title: 'Buy & sell trending tokens',
    description: 'Trade memecoins and trending Solana tokens in seconds. No complexity, just tap and trade.',
    image: '/images/screenshots/buy-sell.png',
  },
  {
    tag: 'KOL TRACKING',
    title: 'Follow KOL traders',
    description: 'Track what the smartest traders are buying and selling. Copy their moves in real-time.',
    image: '/images/screenshots/kol.png',
  },
  {
    tag: 'LAUNCH',
    title: 'Launch a memecoin from a tweet',
    description: 'Spot a viral tweet? Launch a token directly from the app and be first.',
    image: '/images/screenshots/launch.png',
  },
  {
    tag: 'DISCOVER',
    title: 'Catch early trends on X',
    description: 'Real-time memecoin feed. See trending tokens before they explode.',
    image: '/images/screenshots/memecoin.png',
  },
  {
    tag: 'PORTFOLIO',
    title: 'Manage your assets',
    description: 'Send, receive, deposit, and withdraw. Full portfolio management built-in.',
    image: '/images/screenshots/portfolio.png',
  },
  {
    tag: 'RELAUNCH',
    title: 'Relaunch a memecoin',
    description: 'See a dead token with potential? Relaunch it and give it a second life.',
    image: '/images/screenshots/relaunch.png',
  },
];

// Format helpers
export function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  // For very small prices, use subscript notation like the app
  const str = price.toFixed(12);
  const match = str.match(/^0\.(0+)/);
  if (match) {
    const zeroCount = match[1].length;
    const significantDigits = str.slice(match[0].length, match[0].length + 4);
    return `$0.0${zeroCount > 1 ? '₍' + zeroCount + '₎' : ''}${significantDigits}`;
  }
  return `$${price.toFixed(8)}`;
}

export function formatMarketCap(mc: number): string {
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`;
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(2)}M`;
  if (mc >= 1e3) return `$${(mc / 1e3).toFixed(2)}K`;
  return `$${mc.toFixed(2)}`;
}

export function formatPercentChange(change: number): string {
  const sign = change >= 0 ? '▲' : '▼';
  return `${sign} ${Math.abs(change).toFixed(2)}%`;
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
