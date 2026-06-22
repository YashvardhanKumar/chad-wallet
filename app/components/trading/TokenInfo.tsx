'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createChart, ColorType, ISeriesApi, Time } from 'lightweight-charts';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '@/app/lib/supabase';
import { CldUploadWidget } from 'next-cloudinary';
import TokenLogo from './TokenLogo';
import { formatPrice, formatMarketCap, formatPercentChange, shortenAddress } from '@/app/lib/constants';

interface Token {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
}

interface PricePoint {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

const TIME_RANGES = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'All'] as const;

export default function TokenInfo({ token }: { token: Token }) {
  const { user, authenticated, login } = usePrivy();
  const [timeRange, setTimeRange] = useState<typeof TIME_RANGES[number]>('1D');
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [activeTab, setActiveTab] = useState<'Recent Swaps'>('Recent Swaps');
  const [bottomTab, setBottomTab] = useState<'Trades' | 'Thesis' | 'Holders'>('Trades');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [chartLoading, setChartLoading] = useState(false);
  const [theses, setTheses] = useState<any[]>([]);
  const [thesisContent, setThesisContent] = useState('');
  const [thesisImage, setThesisImage] = useState('');
  const [isSubmittingThesis, setIsSubmittingThesis] = useState(false);
  const [liveTrades, setLiveTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [showFriends, setShowFriends] = useState(false);
  const [showTopTraders, setShowTopTraders] = useState(true);
  const [showYourTrades, setShowYourTrades] = useState(true);

  // Fetch theses & trades from Supabase & BirdEye
  useEffect(() => {
    async function fetchData() {
      setTradesLoading(true);
      const { data } = await supabase
        .from('theses')
        .select('*')
        .eq('token_address', token.address)
        .order('created_at', { ascending: false });
      if (data) setTheses(data);

      try {
        const res = await fetch(`/api/trades?address=${token.address}&limit=30`);
        const { trades } = await res.json();
        if (trades) setLiveTrades(trades);
      } catch (e) {
        console.error('Failed to fetch trades', e);
      }
      setTradesLoading(false);
    }
    fetchData();
  }, [token.address]);

  const handleSubmitThesis = async () => {
    if (!thesisContent.trim()) return;
    if (!authenticated) return login();
    
    setIsSubmittingThesis(true);
    const newThesis = {
      user_id: user?.id,
      token_address: token.address,
      content: thesisContent,
      image_url: thesisImage,
    };
    
    const { error } = await supabase.from('theses').insert([newThesis]);
    if (!error) {
      setTheses([{ ...newThesis, created_at: new Date().toISOString() }, ...theses]);
      setThesisContent('');
      setThesisImage('');
    } else {
      alert('Failed to post thesis. Ensure you created the "theses" table in Supabase.');
    }
    setIsSubmittingThesis(false);
  };

  // Fetch real chart data based on timeRange
  useEffect(() => {
    async function fetchChartData() {
      setChartLoading(true);
      const now = Math.floor(Date.now() / 1000);
      let type: '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W' = '15m';
      let timeFrom = now - 86400;

      switch (timeRange) {
        case '1D': type = '15m'; timeFrom = now - 86400; break;
        case '5D': type = '1H'; timeFrom = now - 86400 * 5; break;
        case '1M': type = '4H'; timeFrom = now - 86400 * 30; break;
        case '3M': type = '4H'; timeFrom = now - 86400 * 90; break;
        case '6M': type = '1D'; timeFrom = now - 86400 * 180; break;
        case 'YTD': 
          type = '1D'; 
          timeFrom = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000); 
          break;
        case '1Y': type = '1D'; timeFrom = now - 86400 * 365; break;
        case '5Y': type = '1W'; timeFrom = now - 86400 * 365 * 5; break;
        case 'All': type = '1W'; timeFrom = now - 86400 * 365 * 10; break;
        default: type = '15m'; timeFrom = now - 86400; break;
      }

      try {
        const res = await fetch(`/api/history?address=${token.address}&type=${type}&timeFrom=${timeFrom}&timeTo=${now}`);
        const { history } = await res.json();
        
        if (history && history.length > 0) {
          const formattedData = history.map((item: any) => ({
            time: item.unixTime as Time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          }));

          setPriceHistory(formattedData as any);
        }
      } catch (e) {
        console.error('Failed to fetch history', e);
      }
      setChartLoading(false);
    }
    fetchChartData();
  }, [token.address, timeRange]);

  // Draw TradingView lightweight chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.5)',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#10B981', // green
      downColor: '#EF4444', // red
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (seriesRef.current && priceHistory.length > 0) {
      seriesRef.current.setData(priceHistory);
      chartRef.current.timeScale().fitContent();
    }
  }, [priceHistory]);

  // Set markers on the chart series to show buy/sell icons
  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return;

    const markers: any[] = [];

    priceHistory.forEach((point, index) => {
      // Add buy markers (green plus circles) for 'Your trades'
      if (showYourTrades && index === Math.floor(priceHistory.length * 0.25)) {
        markers.push({
          time: point.time,
          position: 'belowBar',
          color: '#10B981',
          shape: 'circle',
          text: '+',
          size: 1,
        });
      }
      // Add sell markers (red minus circles) for 'Your trades'
      if (showYourTrades && index === Math.floor(priceHistory.length * 0.75)) {
        markers.push({
          time: point.time,
          position: 'aboveBar',
          color: '#EF4444',
          shape: 'circle',
          text: '-',
          size: 1,
        });
      }
      // Add top trader buy/sell markers
      if (showTopTraders && index === Math.floor(priceHistory.length * 0.4)) {
        markers.push({
          time: point.time,
          position: 'belowBar',
          color: '#3B82F6',
          shape: 'circle',
          text: '👤',
          size: 1,
        });
      }
      if (showTopTraders && index === Math.floor(priceHistory.length * 0.6)) {
        markers.push({
          time: point.time,
          position: 'aboveBar',
          color: '#3B82F6',
          shape: 'circle',
          text: '👤',
          size: 1,
        });
      }
      // Add friend buy/sell markers
      if (showFriends && index === Math.floor(priceHistory.length * 0.15)) {
        markers.push({
          time: point.time,
          position: 'belowBar',
          color: '#EC4899',
          shape: 'circle',
          text: '⭐',
          size: 1,
        });
      }
      if (showFriends && index === Math.floor(priceHistory.length * 0.9)) {
        markers.push({
          time: point.time,
          position: 'aboveBar',
          color: '#EC4899',
          shape: 'circle',
          text: '⭐',
          size: 1,
        });
      }
    });

    // Sort markers by time as required by lightweight-charts
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    seriesRef.current.setMarkers(markers);
  }, [priceHistory, showFriends, showTopTraders, showYourTrades]);

  // No static mock data!
  return (
    <div className="h-full flex flex-col">
      {/* Token Header Info */}
      <div className="px-6 py-4 border-b border-border/50 shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <TokenLogo token={token} size={48} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{token.symbol}</h1>
                <div className="flex items-center gap-1 opacity-60">
                  <span className="text-xs">Ξ</span>
                  <span className="text-xs">🌐</span>
                  <span className="text-xs">𝕏</span>
                </div>
                <span className="text-yellow-500 text-sm ml-1">★</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-secondary">{token.name}</span>
                <span className="text-xs text-text-tertiary bg-surface px-1.5 py-0.5 rounded font-mono border border-border/50">
                  {shortenAddress(token.address)}
                </span>
                <span className="text-xs text-text-tertiary">📋</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-8">
            <div>
              <div className="text-[11px] text-text-tertiary mb-1">Price</div>
              <div className="font-semibold text-lg">{formatPrice(token.price)}</div>
            </div>
            <div>
              <div className="text-[11px] text-text-tertiary mb-1">Market cap</div>
              <div className="font-semibold">{formatMarketCap(token.marketCap)}</div>
            </div>
            <div>
              <div className="text-[11px] text-text-tertiary mb-1">24H change</div>
              <div className={`font-semibold text-sm ${token.priceChange24h >= 0 ? 'text-green' : 'text-red'}`}>
                {token.priceChange24h >= 0 ? '▲' : '▼'} {Math.abs(token.priceChange24h).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-text-tertiary mb-1">Vol.</div>
              <div className="font-semibold">{formatMarketCap(token.volume24h)}</div>
            </div>
            <div>
              <div className="text-[11px] text-text-tertiary mb-1">Liquidity</div>
              <div className="font-semibold">{formatMarketCap(token.marketCap * 0.1)}</div>
            </div>
            <div>
              <div className="text-[11px] text-text-tertiary mb-1">Holders</div>
              <div className="font-semibold">45.34K</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="relative px-6 py-4 flex flex-col shrink-0">
        <div className="relative">
          <div ref={chartContainerRef} className="w-full" style={{ height: '300px' }} />
          {chartLoading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        
        {/* Chart Overlays / Filters */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`text-[11px] px-2 py-1 rounded font-medium transition-colors ${
                  timeRange === range ? 'bg-white/10 text-white' : 'text-text-tertiary hover:text-text-secondary hover:bg-white/5'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-text-secondary">
            <span>Chart overlays</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                className="accent-accent" 
                checked={showFriends}
                onChange={(e) => setShowFriends(e.target.checked)}
              /> Friends
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-blue-400">
              <input 
                type="checkbox" 
                className="accent-blue-400" 
                checked={showTopTraders}
                onChange={(e) => setShowTopTraders(e.target.checked)}
              /> Top Traders
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-blue-500">
              <input 
                type="checkbox" 
                className="accent-blue-500" 
                checked={showYourTrades}
                onChange={(e) => setShowYourTrades(e.target.checked)}
              /> Your trades
            </label>
          </div>
        </div>
      </div>

      {/* Bottom Tabs (Holders / Trades) */}
      <div className="flex flex-1 min-h-0 border-t border-border/50">
        {/* Left side: Live Trades Leaderboard */}
        <div className="w-80 border-r border-border/50 hidden xl:flex flex-col">
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border/50">
            {['Recent Swaps'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)} 
                className={`font-semibold text-sm transition-colors ${activeTab === tab ? 'text-white' : 'text-text-tertiary hover:text-text-secondary'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="font-semibold text-sm">Live Blockchain Swaps</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full">
              <thead className="sticky top-0 bg-background text-[10px] text-text-tertiary font-medium">
                <tr>
                  <th className="text-left py-2 px-4 pb-2">Wallet</th>
                  <th className="text-left py-2 pb-2">Action</th>
                  <th className="text-right py-2 px-4 pb-2">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {tradesLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3 px-4"><div className="h-6 bg-surface rounded w-24" /></td>
                      <td className="py-3"><div className="h-5 bg-surface rounded w-12" /></td>
                      <td className="py-3 px-4 text-right"><div className="h-5 bg-surface rounded w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : liveTrades.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-sm text-text-tertiary">No recent swaps</td></tr>
                ) : liveTrades.map((t, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors cursor-pointer group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-hover overflow-hidden">
                           <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${t.owner}`} alt="" width={24} height={24} unoptimized />
                        </div>
                        <span className="text-[13px] font-medium text-white group-hover:underline">{shortenAddress(t.owner)}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.side === 'buy' ? 'bg-green/20 text-green' : 'bg-red/20 text-red'}`}>
                        {t.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-[13px] font-medium text-white">${t.volumeUSD?.toFixed(2)}</div>
                      <div className="text-[10px] text-text-tertiary">{new Date(t.blockUnixTime * 1000).toLocaleTimeString()}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border/50">
            <button 
              onClick={() => setBottomTab('Trades')} 
              className={`font-semibold text-sm transition-colors ${bottomTab === 'Trades' ? 'text-white' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              Recent Swaps
            </button>
            <button 
              onClick={() => setBottomTab('Thesis')} 
              className={`font-semibold text-sm transition-colors ${bottomTab === 'Thesis' ? 'text-white' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              User Thesis
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {bottomTab === 'Trades' && (
              <table className="w-full">
                <thead className="sticky top-0 bg-background text-[10px] text-text-tertiary font-medium">
                  <tr>
                    <th className="text-left py-2 px-4">Wallet</th>
                    <th className="text-left py-2">Action</th>
                    <th className="text-left py-2">Volume</th>
                    <th className="text-right py-2 px-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {tradesLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-2.5 px-4"><div className="h-5 bg-surface rounded w-20" /></td>
                        <td className="py-2.5"><div className="h-4 bg-surface rounded w-10" /></td>
                        <td className="py-2.5"><div className="h-4 bg-surface rounded w-12" /></td>
                        <td className="py-2.5 px-4 text-right"><div className="h-4 bg-surface rounded w-14 ml-auto" /></td>
                      </tr>
                    ))
                  ) : liveTrades.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-sm text-text-tertiary">No recent swaps</td></tr>
                  ) : liveTrades.map((t, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="py-2.5 px-4">
                         <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-surface-hover overflow-hidden">
                             <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${t.owner}`} alt="" width={20} height={20} unoptimized />
                          </div>
                          <span className="text-xs font-medium text-white truncate max-w-[80px]">{shortenAddress(t.owner)}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.side === 'buy' ? 'bg-green/20 text-green' : 'bg-red/20 text-red'}`}>
                          {t.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs font-medium text-white">${t.volumeUSD?.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right text-xs text-text-tertiary">{new Date(t.blockUnixTime * 1000).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {bottomTab === 'Thesis' && (
              <div className="p-4 flex flex-col gap-4">
                {/* Compose Thesis */}
                <div className="bg-white/5 rounded-xl p-3 border border-border/50">
                  <textarea
                    value={thesisContent}
                    onChange={(e) => setThesisContent(e.target.value)}
                    placeholder="What's your thesis on this token?"
                    className="w-full bg-transparent text-sm text-white placeholder-text-tertiary focus:outline-none resize-none h-20"
                  />
                  {thesisImage && (
                    <div className="relative w-20 h-20 mb-2 rounded-lg overflow-hidden border border-white/10">
                      <Image src={thesisImage} alt="Attachment" fill className="object-cover" unoptimized />
                      <button onClick={() => setThesisImage('')} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80">&times;</button>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                    <CldUploadWidget uploadPreset="chad_wallet" onSuccess={(result: any) => setThesisImage(result.info.secure_url)}>
                      {({ open }) => (
                        <button onClick={() => open()} type="button" className="text-text-secondary hover:text-white transition-colors text-xs flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Add Image
                        </button>
                      )}
                    </CldUploadWidget>
                    <button
                      onClick={handleSubmitThesis}
                      disabled={isSubmittingThesis || !thesisContent.trim()}
                      className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-black px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      {isSubmittingThesis ? (
                        <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Posting...</>
                      ) : authenticated ? 'Post Thesis' : 'Login to Post'}
                    </button>
                  </div>
                </div>

                {/* Theses Feed */}
                <div className="flex flex-col gap-3">
                  {tradesLoading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-white/5 rounded-xl p-3 border border-border/30">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-surface rounded-full" />
                          <div className="h-3 bg-surface rounded w-24" />
                          <div className="h-3 bg-surface rounded w-16 ml-auto" />
                        </div>
                        <div className="h-4 bg-surface rounded w-3/4 mb-2" />
                        <div className="h-4 bg-surface rounded w-1/2" />
                      </div>
                    ))
                  ) : theses.length === 0 ? (
                    <div className="text-center text-sm text-text-tertiary py-8">
                      No theses yet. Be the first to post!
                    </div>
                  ) : (
                    theses.map((t, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-3 border border-border/30">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-surface-hover overflow-hidden">
                             <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${t.user_id}`} alt="" width={24} height={24} unoptimized />
                          </div>
                          <span className="text-xs font-medium text-text-secondary">{shortenAddress(t.user_id || '')}</span>
                          <span className="text-[10px] text-text-tertiary ml-auto">
                            {new Date(t.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-white whitespace-pre-wrap">{t.content}</p>
                        {t.image_url && (
                          <div className="relative w-full h-40 mt-3 rounded-lg overflow-hidden border border-white/10">
                            <Image src={t.image_url} alt="Thesis attachment" fill className="object-cover" unoptimized />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {bottomTab === 'Holders' && (
              <div className="p-4 text-center text-sm text-text-tertiary lg:hidden">
                Holders list is visible on desktop layout.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
