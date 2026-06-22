import { Metadata } from 'next';
import TradingDashboard from '@/app/components/trading/TradingDashboard';

type Props = {
  params: Promise<{ address: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  return {
    title: `Trade ${address.slice(0, 8)}... | ChadWallet`,
    description: `Trade this Solana token on ChadWallet`,
  };
}

export default async function TokenTradePage({ params }: Props) {
  const { address } = await params;
  return <TradingDashboard initialAddress={address} />;
}
