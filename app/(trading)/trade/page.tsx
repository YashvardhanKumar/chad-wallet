import { Metadata } from 'next';
import TradingDashboard from '@/app/components/trading/TradingDashboard';

export const metadata: Metadata = {
  title: 'Trade | ChadWallet',
  description: 'Trade trending Solana tokens. Real-time charts, live trades, and instant buy/sell.',
};

export default function TradePage() {
  return <TradingDashboard />;
}
