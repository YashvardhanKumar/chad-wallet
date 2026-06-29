'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection } from '@solana/web3.js';
import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  compileTransaction,
  getTransactionEncoder,
  address,
  blockhash as toBlockhash,
  createNoopSigner,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import bs58 from 'bs58';

import {
  FiEdit3,
  FiX,
  FiCalendar,
  FiClock,
  FiRepeat,
  FiGift,
  FiPlus,
  FiCopy,
  FiCheck,
  FiDollarSign,
  FiUserPlus,
  FiHeart,
  FiMessageSquare,
} from 'react-icons/fi';
import { FaXTwitter, FaTwitter, FaDiscord } from 'react-icons/fa6';
import { FaCheckCircle, FaUserCheck, FaChevronUp, FaChevronDown } from 'react-icons/fa';

import { supabase } from '@/app/lib/supabase';
import {
  upsertUser,
  getUserByUsername,
  getUserByWallet,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowsCount,
  getTrades,
  getHoldings,
  HoldingRecord,
  TradeRecord,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlistAddresses,
} from '@/app/lib/tradeHistory';
import { shortenAddress, timeAgo } from '@/app/lib/constants';
import { getMainnetRpcUrl } from '@/app/lib/solanaRpc';
import TokenLogo from '@/app/components/trading/TokenLogo';
import TrendingList from '@/app/components/trading/TrendingList';
import NavbarSearch from '@/app/components/trading/NavbarSearch';
import ProfileDropdown from '@/app/components/trading/ProfileDropdown';
import Portfolio from '@/app/components/trading/Portfolio';
import TraderHoverCard, { hashToUsername, Avatar as TraderAvatar, getProfilePic } from '@/app/components/trading/TraderHoverCard';
import { createChart, ColorType, LineType } from 'lightweight-charts';

interface ChartDataPoint {
  time: number;
  value: number;
}

function generateChartData(
  walletAddress: string,
  endValue: number,
  startValue: number,
  pointsCount: number,
  timeRange: '24H' | '7D' | '30D' | 'ALL'
): ChartDataPoint[] {
  const hash = walletAddress.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const data: ChartDataPoint[] = [];
  const now = Math.floor(Date.now() / 1000);
  
  let step = 3600; // default 1 hour for 24H
  if (timeRange === '7D') step = 3600 * 4; // 4 hours
  else if (timeRange === '30D') step = 3600 * 12; // 12 hours
  else if (timeRange === 'ALL') step = 3600 * 24; // 1 day

  let seed = hash;
  const lcg = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < pointsCount; i++) {
    const t = now - (pointsCount - 1 - i) * step;
    const progress = i / (pointsCount - 1 || 1);
    const interp = startValue + (endValue - startValue) * progress;
    
    const envelope = Math.sin(progress * Math.PI);
    const fluctuationRange = Math.abs(endValue) * 0.15;
    const noise = (lcg() - 0.5) * fluctuationRange * envelope;
    
    const val = Math.max(0, interp + noise);
    data.push({
      time: t,
      value: val
    });
  }
  return data;
}

function PortfolioChart({
  data,
  startValue,
  timeRange,
  onHover,
}: {
  data: ChartDataPoint[];
  startValue: number;
  timeRange: '24H' | '7D' | '30D' | 'ALL';
  onHover: (value: number | null, change: number | null, timeStr: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const activeSeriesRef = useRef<any>(null);
  const inactiveSeriesRef = useRef<any>(null);
  const lastHoveredIndexRef = useRef<number>(-1);
  const isUpdatingRef = useRef<boolean>(false);
  const dataRef = useRef<ChartDataPoint[]>(data);
  const startValueRef = useRef<number>(startValue);
  const timeRangeRef = useRef<string>(timeRange);
  const onHoverRef = useRef<any>(onHover);

  // Keep refs up-to-date to avoid dependency changes inside the crosshair subscriber
  useEffect(() => {
    dataRef.current = data;
    startValueRef.current = startValue;
    timeRangeRef.current = timeRange;
    onHoverRef.current = onHover;
  }, [data, startValue, timeRange, onHover]);

  // 1. Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9899a3',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      width: containerRef.current.clientWidth,
      height: 200,
      timeScale: {
        visible: false,
      },
      rightPriceScale: {
        visible: false,
      },
      handleScale: false,
      handleScroll: false,
      crosshair: {
        vertLine: {
          visible: true,
          style: 1, // dotted
          color: '#cbd0eb2a',
          width: 1,
        },
        horzLine: {
          visible: false,
        },
      },
    });

    const isPositive = dataRef.current.length > 0 ? (dataRef.current[dataRef.current.length - 1].value >= startValueRef.current) : true;
    const activeColor = isPositive ? '#21c95e' : '#ff622e';
    const activeGradientTop = isPositive ? 'rgba(33, 201, 94, 0.2)' : 'rgba(255, 98, 46, 0.2)';

    const activeSeries = chart.addAreaSeries({
      lineColor: activeColor,
      topColor: activeGradientTop,
      bottomColor: 'rgba(0, 0, 0, 0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      lineType: LineType.Curved,
    });

    const inactiveSeries = chart.addAreaSeries({
      lineColor: '#474b52',
      topColor: 'rgba(71, 75, 82, 0.05)',
      bottomColor: 'rgba(0, 0, 0, 0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      lineType: LineType.Curved,
    });

    activeSeriesRef.current = activeSeries;
    inactiveSeriesRef.current = inactiveSeries;
    chartRef.current = chart;

    // Set initial data
    activeSeries.setData(dataRef.current as any);
    inactiveSeries.setData([]);
    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (isUpdatingRef.current) return;

      const currentData = dataRef.current;
      const currentStart = startValueRef.current;
      const currentTimeRange = timeRangeRef.current;
      const currentOnHover = onHoverRef.current;

      if (!param || param.time === undefined || param.point === undefined) {
        if (lastHoveredIndexRef.current !== -1) {
          lastHoveredIndexRef.current = -1;
          isUpdatingRef.current = true;
          try {
            activeSeriesRef.current?.setData(currentData as any);
            inactiveSeriesRef.current?.setData([]);
          } finally {
            isUpdatingRef.current = false;
          }
          currentOnHover?.(null, null, null);
        }
      } else {
        const hoveredTime = param.time as number;
        const hoveredIndex = currentData.findIndex(d => Number(d.time) === Number(hoveredTime));
        if (hoveredIndex !== lastHoveredIndexRef.current) {
          lastHoveredIndexRef.current = hoveredIndex;
          if (hoveredIndex !== -1) {
            const item = currentData[hoveredIndex];
            const val = item.value;
            const change = val - currentStart;
            
            const date = new Date(hoveredTime * 1000);
            let timeStr = '';
            if (currentTimeRange === '24H') {
              timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            } else {
              timeStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            }

            isUpdatingRef.current = true;
            try {
              activeSeriesRef.current?.setData(currentData.slice(0, hoveredIndex + 1) as any);
              inactiveSeriesRef.current?.setData(currentData.slice(hoveredIndex) as any);
            } finally {
              isUpdatingRef.current = false;
            }
            currentOnHover?.(val, change, timeStr);
          } else {
            isUpdatingRef.current = true;
            try {
              activeSeriesRef.current?.setData(currentData as any);
              inactiveSeriesRef.current?.setData([]);
            } finally {
              isUpdatingRef.current = false;
            }
            currentOnHover?.(null, null, null);
          }
        }
      }
    });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // 2. Update chart data when props change without destroying the chart
  const lastDataRef = useRef<ChartDataPoint[]>([]);

  useEffect(() => {
    const hasChanged = data.length !== lastDataRef.current.length ||
      data.some((d, idx) => d.time !== lastDataRef.current[idx]?.time || d.value !== lastDataRef.current[idx]?.value);

    if (hasChanged && activeSeriesRef.current && chartRef.current) {
      lastDataRef.current = data;
      
      const isPositive = data.length > 0 ? (data[data.length - 1].value >= startValue) : true;
      const lineColor = isPositive ? '#21c95e' : '#ff622e';
      const topColor = isPositive ? 'rgba(33, 201, 94, 0.2)' : 'rgba(255, 98, 46, 0.2)';
      
      activeSeriesRef.current.applyOptions({ lineColor, topColor });
      
      isUpdatingRef.current = true;
      try {
        activeSeriesRef.current.setData(data as any);
        inactiveSeriesRef.current?.setData([]);
      } finally {
        isUpdatingRef.current = false;
      }
      
      chartRef.current.timeScale().fitContent();
      lastHoveredIndexRef.current = -1;
    }
  }, [data, startValue]);

  return <div ref={containerRef} className="w-full h-full" />;
}

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

interface HistoricalPoint {
  time: number;
  valueUsd: number;
  valueSol: number;
}

function getHistoricalPortfolio(
  trades: TradeRecord[],
  holdings: HoldingRecord[],
  currentSolBalance: number,
  trendingTokens: Token[],
  currentSolPrice: number,
  timeRange: '24H' | '7D' | '30D' | 'ALL'
): HistoricalPoint[] {
  const now = Math.floor(Date.now() / 1000);
  let duration = 24 * 3600;
  let pointsCount = 24;
  if (timeRange === '7D') {
    duration = 7 * 24 * 3600;
    pointsCount = 42;
  } else if (timeRange === '30D') {
    duration = 30 * 24 * 3600;
    pointsCount = 60;
  } else if (timeRange === 'ALL') {
    duration = 90 * 24 * 3600;
    pointsCount = 90;
  }

  const startTime = now - duration;
  const step = duration / (pointsCount - 1);

  const sortedTrades = [...trades].sort((a, b) => b.timestamp - a.timestamp);
  const tokenPrices: Record<string, number> = {};
  trendingTokens.forEach(t => {
    tokenPrices[t.address.toLowerCase()] = t.price;
  });
  
  const balances: Record<string, number> = {};
  holdings.forEach(h => {
    balances[h.tokenAddress.toLowerCase()] = h.balance;
  });
  let solBalance = currentSolBalance;

  const points: HistoricalPoint[] = [];
  let tradeIdx = 0;

  for (let i = pointsCount - 1; i >= 0; i--) {
    const gridTime = startTime + i * step;

    while (tradeIdx < sortedTrades.length && sortedTrades[tradeIdx].timestamp > gridTime) {
      const trade = sortedTrades[tradeIdx];
      const addr = trade.tokenAddress.toLowerCase();
      const amt = trade.amount;
      const solAmt = trade.solAmount;

      if (trade.type === 'buy') {
        balances[addr] = (balances[addr] || 0) - amt;
        solBalance += solAmt;
      } else {
        balances[addr] = (balances[addr] || 0) + amt;
        solBalance -= solAmt;
      }
      tradeIdx++;
    }

    let totalUsd = solBalance * currentSolPrice;
    
    Object.entries(balances).forEach(([addr, bal]) => {
      if (bal <= 0) return;
      
      const tokenTrades = trades.filter(t => t.tokenAddress.toLowerCase() === addr);
      let priceUsd = tokenPrices[addr] || 0;
      if (tokenTrades.length > 0) {
        let closestTrade = tokenTrades[0];
        let minDiff = Math.abs(closestTrade.timestamp - gridTime);
        tokenTrades.forEach(t => {
          const diff = Math.abs(t.timestamp - gridTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestTrade = t;
          }
        });
        priceUsd = closestTrade.priceUsd;
      }
      totalUsd += bal * priceUsd;
    });

    const totalSol = currentSolPrice > 0 ? totalUsd / currentSolPrice : 0;

    points.unshift({
      time: Math.round(gridTime),
      valueUsd: totalUsd,
      valueSol: totalSol,
    });
  }

  // Ensure unique, strictly sorted integer timestamps
  const finalPoints: HistoricalPoint[] = [];
  let lastTime = 0;
  points.forEach(p => {
    if (p.time > lastTime) {
      finalPoints.push(p);
      lastTime = p.time;
    }
  });

  return finalPoints;
}

function formatPriceWithSubscript(price: number): React.ReactNode {
  if (price === 0) return '0.00 USDC';
  if (price >= 0.01) {
    return `${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDC`;
  }
  
  const str = price.toFixed(10);
  const match = str.match(/\.0+/);
  if (match) {
    const zeroCount = match[0].length - 1;
    if (zeroCount > 2) {
      const rest = str.slice(match[0].length + 1).replace(/0+$/, '');
      const digits = rest.slice(0, 4);
      return (
        <span>
          0.0<sub>{zeroCount}</sub>{digits} USDC
        </span>
      );
    }
  }
  return `${price.toLocaleString('en-US', { maximumFractionDigits: 6 })} USDC`;
}

function formatAmount(amount: number, symbol: string): string {
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}M ${symbol}`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M ${symbol}`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K ${symbol}`;
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${symbol}`;
}

function formatMCap(mcap: number): string {
  if (mcap >= 1e9) return `${(mcap / 1e9).toFixed(1)}B USDC`;
  if (mcap >= 1e6) return `${(mcap / 1e6).toFixed(1)}M USDC`;
  if (mcap >= 1e3) return `${(mcap / 1e3).toFixed(1)}K USDC`;
  return `${mcap.toFixed(0)} USDC`;
}

import { useTrading } from '@/app/context/TradingContext';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { linkTwitter, authenticated, login, user } = usePrivy();
  const { wallets } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const {
    walletAddress: viewerWalletAddress,
    tokens: trendingTokens,
    tokensLoading: trendingLoading,
    verifiedSet,
    watchlistAddresses,
    toggleWatchlist: onToggleWatchlist,
    solPrice,
    solBalance,
    dbUser,
    setSelectedToken
  } = useTrading();

  const initialRenderRef = useRef(true);
  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      setSelectedToken(null);
    }
  }, [setSelectedToken]);

  const calculateAvgHoldTime = () => {
    if (trades.length === 0) return 'No hold time';
    
    const groups: { [key: string]: TradeRecord[] } = {};
    trades.forEach((t) => {
      if (!groups[t.tokenAddress]) groups[t.tokenAddress] = [];
      groups[t.tokenAddress].push(t);
    });

    let totalHoldTimeMs = 0;
    let holdCount = 0;

    Object.values(groups).forEach((tokenTrades) => {
      const sorted = [...tokenTrades].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      let currentBuyTime: number | null = null;

      sorted.forEach((t) => {
        const tTime = t.timestamp || 0;
        if (t.type === 'buy') {
          if (currentBuyTime === null) {
            currentBuyTime = tTime;
          }
        } else if (t.type === 'sell') {
          if (currentBuyTime !== null) {
            totalHoldTimeMs += (tTime - currentBuyTime);
            holdCount++;
            currentBuyTime = null;
          }
        }
      });
    });

    if (holdCount === 0) return 'No sell trades';
    
    const avgMs = totalHoldTimeMs / holdCount;
    const avgSeconds = avgMs / 1000;
    if (avgSeconds < 60) return `${Math.round(avgSeconds)}s avg. hold`;
    const avgMinutes = avgSeconds / 60;
    if (avgMinutes < 60) return `${Math.round(avgMinutes)}m avg. hold`;
    const avgHours = avgMinutes / 60;
    if (avgHours < 24) return `${Math.round(avgHours)}h avg. hold`;
    const avgDays = avgHours / 24;
    return `${Math.round(avgDays)}d avg. hold`;
  };

  const usernameParam = params.username as string;
  const cleanUsername = usernameParam.startsWith('@') ? usernameParam.slice(1) : usernameParam;

  // Profile data state
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isViewerFollowing, setIsViewerFollowing] = useState(false);

  // Profile lists state
  const [holdings, setHoldings] = useState<HoldingRecord[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [theses, setTheses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'positions' | 'trades' | 'theses'>('positions');
  const [filterTradeType, setFilterTradeType] = useState<'all' | 'buy' | 'sell'>('all');
  const [showDust, setShowDust] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Uploading state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Send cash state
  const [sendAmount, setSendAmount] = useState('');
  const [isSendingCash, setIsSendingCash] = useState(false);
  const [sendSuccessSig, setSendSuccessSig] = useState('');

  // Sidebar Discovery (Trending List)
  const [topTraders, setTopTraders] = useState<{ owner: string; total_value: number; pnl: number }[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<{ totalValue: number; totalPnl: number } | null>(null);

  const [followingWallets, setFollowingWallets] = useState<Record<string, boolean>>({});
  const [dbProfilesMap, setDbProfilesMap] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch('/api/leaderboard?limit=10&duration=7d')
      .then(r => r.json())
      .then(async (d) => {
        if (d.entries?.length) {
          setTopTraders(d.entries);
          // Fetch real usernames/profiles from DB for these wallets
          const wallets = d.entries.map((e: any) => e.owner);
          const { data: dbProfiles } = await supabase
            .from('users')
            .select('wallet_address, username, display_name, avatar_url')
            .in('wallet_address', wallets);
            
          if (dbProfiles) {
            const profileMap: Record<string, any> = {};
            dbProfiles.forEach((p: any) => {
              profileMap[p.wallet_address.toLowerCase()] = p;
            });
            setDbProfilesMap(profileMap);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleFollowTopTraderToggle = async (traderWallet: string) => {
    if (!authenticated) return login();
    if (!viewerWalletAddress) return;
    
    const isCurrentlyFollowing = followingWallets[traderWallet];
    if (isCurrentlyFollowing) {
      await unfollowUser(viewerWalletAddress, traderWallet);
      setFollowingWallets(prev => ({ ...prev, [traderWallet]: false }));
    } else {
      await followUser(viewerWalletAddress, traderWallet);
      setFollowingWallets(prev => ({ ...prev, [traderWallet]: true }));
    }
  };

  useEffect(() => {
    if (viewerWalletAddress && topTraders.length > 0) {
      topTraders.forEach(async (trader) => {
        const following = await isFollowing(viewerWalletAddress, trader.owner);
        setFollowingWallets(prev => ({ ...prev, [trader.owner]: following }));
      });
    }
  }, [viewerWalletAddress, topTraders]);

  const handleLikeThesis = async (thesisId: string, currentHearts: number) => {
    setTheses((prev) =>
      prev.map((t) => (t.id === thesisId ? { ...t, hearts: (t.hearts || 0) + 1 } : t))
    );
    try {
      await supabase
        .from('theses')
        .update({ hearts: currentHearts + 1 })
        .eq('id', thesisId);
    } catch (e) {
      console.warn('Failed to like thesis in DB:', e);
    }
  };

  const [profileSolBalance, setProfileSolBalance] = useState<number | null>(null);

  const [chartTimeRange, setChartTimeRange] = useState<'24H' | '7D' | '30D' | 'ALL'>('24H');
  const [currency, setCurrency] = useState<'USDC' | 'SOL'>('USDC');
  const [positionTab, setPositionTab] = useState<'open' | 'closed'>('open');
  const [swapsTab, setSwapsTab] = useState<'all' | 'buy' | 'sell'>('all');
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [hoveredChange, setHoveredChange] = useState<number | null>(null);
  const [hoveredTimeStr, setHoveredTimeStr] = useState<string | null>(null);

  // Fetch SOL balance for profile owner's Cash Balance — once on mount
  useEffect(() => {
    if (!profileUser?.wallet_address) return;
    
    async function fetchProfileSolBalance() {
      try {
        const rpcUrl = getMainnetRpcUrl();
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [profileUser.wallet_address],
          }),
        });
        const data = await res.json();
        if (data.result !== undefined) {
          setProfileSolBalance(data.result.value / 1e9);
        }
      } catch (e) {
        console.warn('Failed to fetch profile owner SOL balance:', e);
      }
    }
    
    fetchProfileSolBalance();
  }, [profileUser?.wallet_address]);

  // Copy address state
  const [copied, setCopied] = useState(false);

  // Check if profile belongs to logged-in viewer
  const isOwnProfile =
    viewerWalletAddress &&
    profileUser &&
    viewerWalletAddress.toLowerCase() === profileUser.wallet_address.toLowerCase();

  // 1. Fetch profile user metadata
  const fetchProfileUser = async () => {
    setLoadingProfile(true);
    try {
      let matchedUser = await getUserByUsername(cleanUsername);

      // Fallback: Check if cleanUsername is a wallet address
      if (!matchedUser && cleanUsername.length >= 32 && cleanUsername.length <= 44) {
        matchedUser = await getUserByWallet(cleanUsername);
      }

      // If still not found, but it is viewer's own profile request (e.g. they typed their address/username)
      if (!matchedUser && viewerWalletAddress && cleanUsername.toLowerCase() === viewerWalletAddress.toLowerCase()) {
        await upsertUser(viewerWalletAddress, {
          username: cleanUsername,
          displayName: cleanUsername,
        });
        matchedUser = await getUserByWallet(viewerWalletAddress);
      }

      if (matchedUser) {
        setProfileUser(matchedUser);
        setEditUsername(matchedUser.username || '');
        setEditDisplayName(matchedUser.display_name || '');
        setEditBio(matchedUser.bio || '');
        setEditAvatarUrl(matchedUser.avatar_url || '');
        setEditBannerUrl(matchedUser.banner_url || '');

        // Fetch follows stats
        const counts = await getFollowsCount(matchedUser.wallet_address);
        setFollowersCount(counts.followers);
        setFollowingCount(counts.following);

        // Check if viewer is following
        if (viewerWalletAddress && viewerWalletAddress !== matchedUser.wallet_address) {
          const following = await isFollowing(viewerWalletAddress, matchedUser.wallet_address);
          setIsViewerFollowing(following);
        }

        // Fetch holdings, trades, and theses
        const [userHoldings, userTrades, userTheses] = await Promise.all([
          getHoldings(matchedUser.wallet_address),
          getTrades(matchedUser.wallet_address),
          supabase
            .from('theses')
            .select('*')
            .eq('user_id', matchedUser.privy_did || matchedUser.wallet_address)
            .order('created_at', { ascending: false }),
        ]);

        setHoldings(userHoldings);
        setTrades(userTrades);
        setTheses(userTheses.data || []);
      } else {
        setProfileUser(null);
      }
    } catch (e) {
      console.warn('Failed to load profile user:', e);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (cleanUsername) {
      const frame = requestAnimationFrame(() => {
        fetchProfileUser();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [cleanUsername, viewerWalletAddress]);



  // Sync linked X account from Privy
  useEffect(() => {
    if (showEditModal && user?.twitter?.username) {
      // Auto-fill X username if linked
      const tw = user.twitter.username;
      if (tw) {
        // Safe to update
      }
    }
  }, [user, showEditModal]);

  // Handle Follow / Unfollow
  const handleFollowToggle = async () => {
    if (!authenticated) return login();
    if (!viewerWalletAddress || !profileUser) return;

    if (isViewerFollowing) {
      await unfollowUser(viewerWalletAddress, profileUser.wallet_address);
      setIsViewerFollowing(false);
      setFollowersCount((prev) => Math.max(0, prev - 1));
    } else {
      await followUser(viewerWalletAddress, profileUser.wallet_address);
      setIsViewerFollowing(true);
      setFollowersCount((prev) => prev + 1);
    }
  };

  // Upload file to Cloudinary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'avatar') setIsUploadingAvatar(true);
    else setIsUploadingBanner(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', type);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      if (type === 'avatar') {
        setEditAvatarUrl(data.url);
      } else {
        setEditBannerUrl(data.url);
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      setIsUploadingBanner(false);
    }
  };

  // Save profile edits
  const handleSaveProfile = async () => {
    if (!viewerWalletAddress) return;
    setIsSaving(true);

    try {
      await upsertUser(viewerWalletAddress, {
        username: editUsername.trim() || null,
        displayName: editDisplayName.trim() || null,
        bio: editBio.trim() || null,
        avatarUrl: editAvatarUrl || null,
        bannerUrl: editBannerUrl || null,
        xUsername: user?.twitter?.username || null,
      });

      // Reload profile user
      await fetchProfileUser();
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to save profile changes:', err);
      alert('Username is already taken or invalid. Please try a different one.');
    } finally {
      setIsSaving(false);
    }
  };

  // Send Cash SOL transaction
  const handleSendCash = async () => {
    if (!authenticated) return login();
    if (!sendAmount || isNaN(Number(sendAmount))) return alert('Please enter a valid amount');
    if (!profileUser?.wallet_address) return alert('Target wallet address not found');

    const wallet = wallets[0];
    if (!wallet) return alert('Failed to connect Solana wallet. Please try again.');

    setIsSendingCash(true);
    setSendSuccessSig('');

    try {
      const connection = new Connection(getMainnetRpcUrl());
      const amountLamports = Math.floor(parseFloat(sendAmount) * 1e9);

      const senderAddress = address(wallet.address);
      const destinationAddress = address(profileUser.wallet_address);

      const { blockhash: blockhashStr, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const transferIx = getTransferSolInstruction({
        source: createNoopSigner(senderAddress),
        destination: destinationAddress,
        amount: BigInt(amountLamports),
      });

      const txMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayer(senderAddress, m),
        (m) =>
          setTransactionMessageLifetimeUsingBlockhash(
            { blockhash: toBlockhash(blockhashStr), lastValidBlockHeight: BigInt(lastValidBlockHeight) },
            m,
          ),
        (m) => appendTransactionMessageInstruction(transferIx, m),
      );

      const compiledTx = compileTransaction(txMessage);
      const encodedTx = new Uint8Array(getTransactionEncoder().encode(compiledTx));

      const result = await signAndSendTransaction({
        transaction: encodedTx,
        wallet,
        chain: 'solana:mainnet',
        options: {
          skipPreflight: true,
          uiOptions: {
            description: `Transfer ${sendAmount} SOL → ${profileUser.display_name || profileUser.username}`,
            transactionInfo: {
              title: 'Send Cash',
              action: `Transfer to ${profileUser.username}`,
            },
          },
        },
      });

      const signatureBase58 = bs58.encode(result.signature);
      setSendSuccessSig(signatureBase58);
      setSendAmount('');
      alert(`Sent successfully! Transaction signature: ${signatureBase58}`);
    } catch (err: any) {
      console.error('Send cash transaction failed:', err);
      alert(`Transaction failed: ${err.message || err}`);
    } finally {
      setIsSendingCash(false);
    }
  };

  // Copy wallet address helper
  const handleCopyAddress = () => {
    if (profileUser?.wallet_address) {
      navigator.clipboard.writeText(profileUser.wallet_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };



  // Filter dust from holdings
  const displayedHoldings = holdings.filter((h) => {
    if (!showDust && h.balance * (h.avgEntry || 0) < 0.05) return false;
    return true;
  });

  // Filter trades by type
  const displayedTrades = trades.filter((t) => {
    if (filterTradeType === 'all') return true;
    return t.type === filterTradeType;
  });

  // RESTYLING CALCULATIONS
  // RESTYLING CALCULATIONS
  const solPriceUsd = solPrice;
  const profileCashBalanceUsd = (profileSolBalance || 0) * solPriceUsd;
  const profileHoldingsValueUsd = holdings.reduce((sum, h) => {
    const priceUsd = trendingTokens.find(t => t.address === h.tokenAddress)?.price || 0;
    return sum + (h.balance * priceUsd);
  }, 0);
  const totalPortfolioValueUsd = profileCashBalanceUsd + profileHoldingsValueUsd;

  const solChangePercent24h = trendingTokens.find(t => t.symbol === 'SOL')?.priceChange24h || 0;
  const prevSolPriceUsd = solPriceUsd / (1 + solChangePercent24h / 100);
  const prevCashBalanceUsd = (profileSolBalance || 0) * prevSolPriceUsd;
  let prevHoldingsValueUsd = 0;
  holdings.forEach(h => {
    const token = trendingTokens.find(t => t.address === h.tokenAddress);
    const currentPriceUsd = token?.price || 0;
    const changePercent24h = token?.priceChange24h || 0;
    const prevPriceUsd = currentPriceUsd / (1 + changePercent24h / 100);
    prevHoldingsValueUsd += h.balance * prevPriceUsd;
  });
  const prevTotalValueUsd = prevCashBalanceUsd + prevHoldingsValueUsd;

  const diffUsd = totalPortfolioValueUsd - prevTotalValueUsd;
  const diffPercent = prevTotalValueUsd > 0 ? (diffUsd / prevTotalValueUsd) * 100 : 0;
  const isPnlPositive = diffUsd >= 0;

  const totalPortfolioValueSol = solPriceUsd > 0 ? totalPortfolioValueUsd / solPriceUsd : 0;
  const prevTotalValueSol = prevSolPriceUsd > 0 ? prevTotalValueUsd / prevSolPriceUsd : 0;
  const diffSol = totalPortfolioValueSol - prevTotalValueSol;

  const historicalPoints = useMemo(() => {
    return getHistoricalPortfolio(
      trades,
      holdings,
      profileSolBalance || 0,
      trendingTokens,
      solPriceUsd,
      chartTimeRange
    );
  }, [trades, holdings, profileSolBalance, trendingTokens, solPriceUsd, chartTimeRange]);

  const chartData = useMemo(() => {
    return historicalPoints.map(p => ({
      time: p.time,
      value: currency === 'USDC' ? p.valueUsd : p.valueSol
    }));
  }, [historicalPoints, currency]);

  const startValue = useMemo(() => {
    if (historicalPoints.length === 0) return 0;
    return currency === 'USDC' ? historicalPoints[0].valueUsd : historicalPoints[0].valueSol;
  }, [historicalPoints, currency]);

  const openPositions = holdings.filter((h) => {
    if (!showDust && h.balance * (h.avgEntry || 0) < 0.05) return false;
    return h.balance > 0;
  });

  const closedPositions = [...new Set(trades.map(t => t.tokenAddress))]
    .filter(addr => !holdings.some(h => h.tokenAddress === addr && h.balance > 0))
    .map(addr => {
      const tokenTrades = trades.filter(t => t.tokenAddress === addr);
      const firstTrade = tokenTrades[0];
      const tokenSymbol = firstTrade?.tokenSymbol || 'Token';
      const tokenName = firstTrade?.tokenName || '';
      const tokenLogoURI = firstTrade?.tokenLogoURI || '';
      
      const buys = tokenTrades.filter(t => t.type === 'buy');
      const sells = tokenTrades.filter(t => t.type === 'sell');
      const totalSolSpent = buys.reduce((sum, t) => sum + t.solAmount, 0);
      const totalTokensBought = buys.reduce((sum, t) => sum + t.amount, 0);
      const totalSolReceived = sells.reduce((sum, t) => sum + t.solAmount, 0);
      const totalTokensSold = sells.reduce((sum, t) => sum + t.amount, 0);
      
      const avgEntry = totalTokensBought > 0 ? totalSolSpent / totalTokensBought : null;
      const avgExit = totalTokensSold > 0 ? totalSolReceived / totalTokensSold : null;
      const pnlSol = totalSolReceived - totalSolSpent;
      
      return {
        tokenAddress: addr,
        tokenSymbol,
        tokenName,
        tokenLogoURI,
        avgEntry,
        avgExit,
        pnlSol,
      };
    });

  const displayValue = hoveredValue !== null ? hoveredValue : (currency === 'USDC' ? totalPortfolioValueUsd : totalPortfolioValueSol);
  const defaultChange = chartTimeRange === '24H'
    ? (currency === 'USDC' ? diffUsd : diffSol)
    : ((currency === 'USDC' ? totalPortfolioValueUsd : totalPortfolioValueSol) - startValue);
  const displayChange = hoveredChange !== null ? hoveredChange : defaultChange;
  
  const defaultTimeLabel = chartTimeRange === '24H' ? '24h' : chartTimeRange === '7D' ? '7d' : chartTimeRange === '30D' ? '30d' : 'all';
  const finalTimeLabel = hoveredTimeStr !== null ? hoveredTimeStr : defaultTimeLabel;

  const formattedPortfolioValue = displayValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: currency === 'USDC' ? 2 : 4
  });
  const [portfolioIntPart, portfolioDecPart] = formattedPortfolioValue.includes('.')
    ? formattedPortfolioValue.split('.')
    : [formattedPortfolioValue, '00'];

  const isDisplayPositive = displayChange >= 0;
  const formattedDiff = currency === 'USDC'
    ? `${isDisplayPositive ? '+' : '-'}${Math.abs(displayChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
    : `${isDisplayPositive ? '+' : '-'}${Math.abs(displayChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SOL`;
  
  const currentStartValue = chartTimeRange === '24H'
    ? (currency === 'USDC' ? prevTotalValueUsd : prevTotalValueSol)
    : startValue;
  const displayChangePercent = currentStartValue > 0 ? (displayChange / currentStartValue) * 100 : 0;
  const formattedDiffPercent = `${isDisplayPositive ? '+' : ''}${displayChangePercent.toFixed(2)}%`;
  const pnlColor = isDisplayPositive ? 'text-green' : 'text-red';

  const cashBalanceDisplay = currency === 'USDC'
    ? `${profileCashBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
    : `${(profileSolBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SOL`;

  const filteredSwaps = trades.filter((t) => {
    if (swapsTab === 'all') return true;
    return t.type === swapsTab;
  });

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-full bg-transparent text-text-primary">
        <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-svh bg-[#060510] text-[#f7f7f7] gap-4">
        <h1 className="text-2xl font-bold">User Not Found</h1>
        <p className="text-text-secondary">Could not find a user profile named @{cleanUsername}</p>
        <Link
          href="/trade"
          className="border border-bg-tertiary bg-bg-secondary px-6 py-2 rounded-xl text-sm font-semibold hover:bg-bg-tertiary transition-colors"
        >
          Go back to Trade Dashboard
        </Link>
      </div>
    );
  }  return (
    <>
      {/* Middle Column: Main Profile Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto overflow-x-hidden pb-3 pr-2 gap-4">
          <div className="flex flex-col">
            {/* Banner */}
            <div className="w-full h-30 rounded-xl bg-bg-secondary shrink-0 relative border border-bg-tertiary">
              {profileUser.banner_url ? (
                <img src={profileUser.banner_url} alt="Profile banner" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full bg-bg-secondary rounded-xl" />
              )}
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-bg-tertiary rounded-md px-2 py-2 flex items-center gap-2 font-bold text-text-primary cursor-pointer hover:opacity-80"
                  aria-label="Add a banner"
                >
                  <FiEdit3 className="size-3 text-text-primary" />
                </button>
              )}
            </div>

            {/* Avatar, name, actions row */}
            <div className="-mt-3 flex pl-1 gap-4 items-end relative shrink-0">
              <div
                className="rounded-full flex items-center justify-center shrink-0 border-4 border-bg-primary bg-bg-secondary overflow-hidden"
                style={{ height: 80, width: 80 }}
              >
                {profileUser.avatar_url ? (
                  <img src={profileUser.avatar_url} alt={profileUser.display_name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#2c264d] text-lg font-bold text-white uppercase select-none">
                    {profileUser.display_name ? profileUser.display_name.slice(0, 2) : 'CW'}
                  </div>
                )}
              </div>

              <div className="flex gap-6 justify-between flex-1">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-lg leading-5 font-semibold text-text-primary truncate" translate="no">
                      {profileUser.display_name || profileUser.username}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="leading-5 text-text-secondary text-sm truncate" translate="no">
                      @{profileUser.username}
                    </div>
                    <div className="w-px h-3 bg-bg-tertiary" />
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="flex items-center gap-1 hover:opacity-75 transition-opacity text-text-tertiary text-xs font-mono"
                    >
                      <span>{shortenAddress(profileUser.wallet_address, 6)}</span>
                      {copied ? <FiCheck className="text-green w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="flex items-center">
                    <button className="flex flex-col items-center py-2 px-4 max-[1000px]:px-1.5 max-[1000px]:py-1 rounded-lg focus-visible:opacity-80 hover:opacity-80 cursor-pointer">
                      <div className="leading-5 text-text-primary text-sm font-semibold max-[1000px]:text-xs max-[1000px]:leading-4">{followingCount}</div>
                      <div className="text-text-secondary text-xs max-[1000px]:text-[10px]">Following</div>
                    </button>
                    <div className="w-px h-full bg-bg-secondary"></div>
                    <button className="flex flex-col items-center py-2 px-4 max-[1000px]:px-1.5 max-[1000px]:py-1 rounded-lg focus-visible:opacity-80 hover:opacity-80 cursor-pointer">
                      <div className="leading-5 text-text-primary text-sm font-semibold max-[1000px]:text-xs max-[1000px]:leading-4">{followersCount}</div>
                      <div className="text-text-secondary text-xs max-[1000px]:text-[10px]">Followers</div>
                    </button>
                  </div>

                  <div className="flex gap-2 items-center ml-auto">
                    {isOwnProfile ? (
                      <>
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="border border-bg-tertiary min-w-29 max-[1000px]:min-w-16 bg-bg-secondary rounded-lg px-4 py-1.5 max-[1000px]:px-2 max-[1000px]:py-1 max-[1000px]:text-xs font-bold cursor-pointer shrink-0 flex items-center justify-center text-text-primary hover:opacity-80"
                        >
                          Edit profile
                        </button>
                        <button
                          className="border border-bg-tertiary bg-bg-secondary rounded-lg p-1.5 max-[1000px]:p-1 cursor-pointer shrink-0 flex items-center justify-center text-text-primary hover:opacity-80"
                          aria-label="Referrals"
                        >
                          <FiGift className="w-5 h-5 max-[1000px]:w-4 max-[1000px]:h-4 text-text-primary" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleFollowToggle}
                        className={`border border-bg-tertiary min-w-29 max-[1000px]:min-w-16 rounded-lg px-4 py-1.5 max-[1000px]:px-2 max-[1000px]:py-1 max-[1000px]:text-xs font-bold cursor-pointer shrink-0 flex items-center justify-center hover:opacity-80 transition-colors ${
                          isViewerFollowing ? 'bg-bg-secondary text-text-primary' : 'bg-accent-primary text-text-primary border-none'
                        }`}
                      >
                        {isViewerFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Bio */}
            {profileUser.bio && (
              <p className="text-sm text-text-primary font-normal mt-3 whitespace-pre-wrap leading-relaxed max-w-2xl bg-bg-secondary/40 p-3 rounded-lg border border-bg-tertiary/40">
                {profileUser.bio}
              </p>
            )}

            {/* Stats Row */}
            <div className="flex gap-4 items-center pr-4 pt-2 shrink-0">
              <div className="flex gap-1 items-center">
                <FiClock className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs font-normal text-text-secondary">{calculateAvgHoldTime()}</span>
              </div>
              <div className="flex gap-1 items-center">
                <FiRepeat className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs font-normal text-text-secondary">{trades.length} trades</span>
              </div>
              <div className="flex gap-1 items-center">
                <FiCalendar className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs font-normal text-text-secondary">
                  Joined{' '}
                  {profileUser.created_at
                    ? new Date(profileUser.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recently'}
                </span>
              </div>
            </div>
          </div>

          {/* Grid Layout: Left Columns (Graph & Positions) and Right Columns (Theses & Swaps) */}
          <div className="flex-1 pt-4 border-t border-bg-tertiary flex flex-col xl:flex-row gap-6 min-h-0">
            {/* Left side: Portfolio values, tab selector, lightweight graph, cash balance, positions list */}
            <div className="flex flex-col flex-1 min-w-0 gap-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[28px] font-medium tracking-[0.56px] leading-none">
                      {currency === 'USDC' ? (
                        <>
                          <span className="text-text-primary" {...(isOwnProfile ? { 'data-balance': true } : {})}>{portfolioIntPart}<span className="text-text-secondary">.{portfolioDecPart} USDC</span></span>
                        </>
                      ) : (
                        <span className="text-text-primary" {...(isOwnProfile ? { 'data-balance': true } : {})}>
                          {displayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SOL
                        </span>
                      )}
                    </span>
                    <div className="h-4.25">
                      <div className="flex gap-2 items-center">
                        <span className={`text-sm font-semibold ${pnlColor}`} {...(isOwnProfile ? { 'data-balance': true } : {})}>
                          {formattedDiff} ({formattedDiffPercent})
                        </span>
                        <span className="text-[14px] font-medium text-text-secondary">{finalTimeLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center">
                    {/* Currency selection tabs */}
                    <div className="relative inline-flex items-center rounded-lg p-0.5 border border-bg-tertiary select-none bg-bg-primary">
                      <div
                        className="absolute top-0.5 bottom-0.5 rounded-md bg-bg-tertiary-solid transition-all duration-200"
                        style={{
                          left: currency === 'USDC' ? '2px' : '38px',
                          width: '36px'
                        }}
                      />
                      {(['USDC', 'SOL'] as const).map((curr) => (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => setCurrency(curr)}
                          className={`relative z-10 flex items-center justify-center py-1 text-xs font-bold transition-colors cursor-pointer ${
                            currency === curr ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'
                          }`}
                          style={{ width: 36 }}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>

                    {/* Time range selector */}
                    <div role="tablist" aria-label="Time range" className="relative inline-flex items-center rounded-lg p-0.5 border border-bg-tertiary">
                      <div
                        className="absolute top-0.5 bottom-0.5 rounded-md bg-bg-tertiary-solid transition-all duration-200"
                        style={{
                          left: chartTimeRange === '24H' ? '2px' : chartTimeRange === '7D' ? '38px' : chartTimeRange === '30D' ? '74px' : '110px',
                          width: '36px'
                        }}
                      />
                      {(['24H', '7D', '30D', 'ALL'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          role="tab"
                          aria-selected={chartTimeRange === r}
                          onClick={() => setChartTimeRange(r)}
                          className={`relative z-10 flex items-center justify-center py-1 text-xs font-bold transition-colors cursor-pointer ${
                            chartTimeRange === r ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'
                          }`}
                          style={{ width: 36 }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full relative animate-fade-in" style={{ height: 200, opacity: 1 }} {...(isOwnProfile ? { 'data-balance': true } : {})}>
                  <PortfolioChart
                    data={chartData}
                    startValue={currentStartValue}
                    timeRange={chartTimeRange}
                    onHover={(val, chg, timeStr) => {
                      setHoveredValue(val);
                      setHoveredChange(chg);
                      setHoveredTimeStr(timeStr);
                    }}
                  />
                </div>
              </div>

              {/* Cash Balance Display */}
              <div className="flex items-center py-2 justify-between border-t border-b border-bg-tertiary/20">
                <div className="flex flex-1 gap-3 items-center min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-tertiary">
                    <FiDollarSign className="size-5 text-text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-xs text-text-secondary">Cash balance</div>
                    <div className="text-lg text-white font-medium animate-fade-in" translate="no" {...(isOwnProfile ? { 'data-balance': true } : {})}>
                      {cashBalanceDisplay}
                    </div>
                  </div>
                </div>
                {isOwnProfile && (
                  <div className="flex gap-2 items-center">
                    <button className="bg-bg-secondary text-sm font-bold border border-bg-tertiary rounded-lg py-2 px-3 flex items-center justify-center cursor-pointer hover:bg-bg-tertiary transition-colors text-white">
                      Withdraw
                    </button>
                    <button className="bg-accent-primary rounded-lg px-4 py-2 flex items-center justify-center cursor-pointer hover:opacity-90 text-sm font-bold text-white transition-opacity">
                      Deposit
                    </button>
                  </div>
                )}
              </div>

              {/* Positions Card */}
              <div className="flex flex-col rounded-lg border border-bg-tertiary overflow-hidden">
                <div className="p-1 pl-2 bg-bg-secondary flex items-center justify-between shrink-0 h-11 border-b border-bg-tertiary">
                  <div className="text-sm font-medium text-white flex items-center">
                    Positions
                    <span className="text-text-tertiary ml-1.5 text-sm font-medium">
                      {positionTab === 'open' ? openPositions.length : closedPositions.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {positionTab === 'open' && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setShowDust(!showDust)}
                        className="flex items-center gap-1 rounded-md p-1 hover:opacity-80 cursor-pointer text-text-secondary text-xs font-medium"
                      >
                        <span className="text-text-secondary">
                          {showDust ? (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <rect x="3" y="3" width="18" height="18" rx="2" fill="var(--color-accent-primary)" stroke="var(--color-accent-primary)" />
                              <path d="M9 12l2 2 4-4" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                            </svg>
                          )}
                        </span>
                        <span>Show dust</span>
                      </div>
                    )}
                    <div className="flex border border-bg-tertiary rounded-lg p-0.5 cursor-pointer shrink-0 select-none bg-bg-primary">
                      <button
                        type="button"
                        onClick={() => setPositionTab('open')}
                        className={`flex gap-1 items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold transition-colors duration-150 cursor-pointer ${
                          positionTab === 'open' ? 'bg-accent-primary-transparent text-accent-primary' : 'text-text-tertiary hover:text-text-secondary'
                        }`}
                      >
                        Open
                        {positionTab === 'open' && openPositions.length > 0 && (
                          <div className="relative flex items-center justify-center h-1.5 w-1.5">
                            <div className="absolute h-[18px] w-[18px] animate-pulse rounded-full bg-accent-primary/20"></div>
                            <div className="relative z-10 h-1.5 w-1.5 rounded-full bg-accent-primary"></div>
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPositionTab('closed')}
                        className={`flex items-center justify-center px-1.5 py-0.5 rounded-md text-xs font-bold transition-colors duration-150 cursor-pointer ${
                          positionTab === 'closed' ? 'bg-accent-primary-transparent text-accent-primary' : 'text-text-tertiary hover:text-text-secondary'
                        }`}
                      >
                        Closed
                      </button>
                    </div>
                  </div>
                </div>

                {positionTab === 'open' ? (
                  <div className="flex flex-col flex-1 min-h-10">
                    <div className="flex items-center gap-3 px-3 py-1 text-xs font-medium text-text-tertiary border-b border-bg-tertiary/60 shrink-0">
                      <div className="flex-1">Token</div>
                      <div className="w-40 3xl:block shrink-0 hidden">Avg. entry</div>
                      <div className="w-40 3xl:block shrink-0 hidden">Position</div>
                      <div className="w-24 shrink-0 text-right"><span className="3xl:hidden">Position</span><span className="hidden 3xl:inline">PnL</span></div>
                    </div>
                    
                    <div className="flex flex-col divide-y divide-bg-tertiary/10">
                      {openPositions.length === 0 ? (
                        <div className="text-center p-6 text-xs text-text-tertiary">No open positions</div>
                      ) : (
                        openPositions.map((h) => {
                          const tokenInfo = trendingTokens.find(t => t.address === h.tokenAddress);
                          const tokenPriceUsd = tokenInfo?.price || 0;
                          const tokenPriceSol = tokenPriceUsd / solPriceUsd;
                          const valueUsd = h.balance * tokenPriceUsd;
                          
                          const avgEntrySol = h.avgEntry || 0;
                          const avgEntryUsd = avgEntrySol * solPriceUsd;
                          
                          const pnlUsd = avgEntrySol > 0 ? (tokenPriceSol - avgEntrySol) * h.balance * solPriceUsd : 0;
                          const pnlPercent = avgEntrySol > 0 ? ((tokenPriceSol - avgEntrySol) / avgEntrySol) * 100 : 0;
                          
                          const isPnlPositive = pnlUsd >= 0;
                          const itemPnlColor = isPnlPositive ? 'text-green' : 'text-red';
                          const pnlArrow = isPnlPositive ? '▲' : '▼';
                          
                          const marketCap = tokenInfo?.marketCap || 0;
                          const formattedMc = marketCap >= 1e9 ? `${(marketCap / 1e9).toFixed(1)}B` : marketCap >= 1e6 ? `${(marketCap / 1e6).toFixed(1)}M` : marketCap >= 1e3 ? `${(marketCap / 1e3).toFixed(1)}K` : `${marketCap.toFixed(0)}`;
                          
                          const entryMc = tokenPriceSol > 0 ? marketCap * (avgEntrySol / tokenPriceSol) : 0;
                          const formattedEntryMc = entryMc >= 1e9 ? `${(entryMc / 1e9).toFixed(1)}B` : entryMc >= 1e6 ? `${(entryMc / 1e6).toFixed(1)}M` : entryMc >= 1e3 ? `${(entryMc / 1e3).toFixed(1)}K` : `${entryMc.toFixed(0)}`;

                          return (
                            <button
                              key={h.tokenAddress}
                              type="button"
                              onClick={() => router.push(`/trade/${h.tokenAddress}`)}
                              className="flex items-center gap-3 py-2 px-3 hover:bg-bg-secondary focus-visible:bg-bg-secondary w-full text-left transition-colors cursor-pointer border-none"
                            >
                              <div className="relative shrink-0 w-9 h-9">
                                {h.tokenLogoURI ? (
                                  <img className="rounded-full border border-bg-tertiary w-9 h-9 object-cover" src={h.tokenLogoURI} alt="" />
                                ) : (
                                  <div className="rounded-full border border-bg-tertiary w-9 h-9 flex items-center justify-center bg-[#2c264d] text-xs font-bold text-white">
                                    {h.tokenSymbol.slice(0, 2)}
                                  </div>
                                )}
                                {verifiedSet.has(h.tokenAddress) && (
                                  <div className="absolute flex items-center justify-center" style={{ bottom: -3, right: -3 }}>
                                    <svg className="w-4 h-4 text-accent-primary" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col gap-px items-start flex-1 min-w-0" translate="no">
                                <div className="text-sm font-semibold text-white truncate w-full">{h.tokenSymbol}</div>
                                <div className="flex items-center gap-1 text-xs text-text-secondary truncate w-full">
                                  <div className="contents 3xl:hidden">
                                    {formatAmount(h.balance, h.tokenSymbol)}
                                  </div>
                                  <div className="hidden 3xl:contents">
                                    <div className="text-[10px] font-bold px-1 py-px border border-bg-tertiary rounded-sm text-text-tertiary">MC</div>
                                    ${formattedMc}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="w-40 shrink-0 flex-col items-start hidden 3xl:flex" translate="no">
                                <div className="text-sm text-white font-mono font-medium">
                                  {formattedEntryMc ? `${formattedEntryMc} MC` : '--'}
                                </div>
                                <div className="text-xs text-text-tertiary font-mono">
                                  {formatPriceWithSubscript(avgEntryUsd)}
                                </div>
                              </div>
                              
                              <div className="w-40 shrink-0 flex-col items-start hidden 3xl:flex" translate="no">
                                <div className="text-sm text-white font-mono font-medium" {...(isOwnProfile ? { 'data-balance': true } : {})}>
                                  {valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                                </div>
                                <div className="text-xs text-text-tertiary font-mono">
                                  {formatAmount(h.balance, h.tokenSymbol)}
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end gap-px w-24 shrink-0 font-mono">
                                <div className="contents 3xl:hidden">
                                  <div className="text-sm text-white font-medium" {...(isOwnProfile ? { 'data-balance': true } : {})}>
                                    {valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                                  </div>
                                  <div className={`flex gap-0.5 items-center ${itemPnlColor}`} translate="no">
                                    <div style={{ fontSize: 8 }}>{pnlArrow}</div>
                                    <div style={{ fontSize: 12 }}>{Math.abs(pnlPercent).toFixed(2)}%</div>
                                  </div>
                                </div>
                                <div className="hidden 3xl:contents">
                                  <div className={`flex gap-0.5 items-center ${itemPnlColor}`} translate="no">
                                    <div className="text-sm font-semibold">{isPnlPositive ? '+' : '-'}</div>
                                    <div className="text-sm font-semibold" {...(isOwnProfile ? { 'data-balance': true } : {})}>
                                      {Math.abs(pnlUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                                    </div>
                                  </div>
                                  <div className={`flex gap-0.5 items-center ${itemPnlColor}`} translate="no">
                                    <div style={{ fontSize: 8 }}>{pnlArrow}</div>
                                    <div className="text-xs text-text-tertiary">{Math.abs(pnlPercent).toFixed(2)}%</div>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 min-h-10">
                    <div className="flex items-center gap-3 px-3 py-1 text-xs font-medium text-text-tertiary border-b border-bg-tertiary/60 shrink-0">
                      <div className="flex-1">Token</div>
                      <div className="w-40 3xl:block shrink-0 hidden">Avg. entry</div>
                      <div className="w-40 3xl:block shrink-0 hidden">Avg. exit</div>
                      <div className="w-24 shrink-0 text-right"><span className="3xl:hidden">Realized</span><span className="hidden 3xl:inline">Realized PnL</span></div>
                    </div>
                    
                    <div className="flex flex-col divide-y divide-bg-tertiary/10">
                      {closedPositions.length === 0 ? (
                        <div className="text-center p-6 text-xs text-text-tertiary">No closed positions</div>
                      ) : (
                        closedPositions.map((h) => {
                          const avgEntrySol = h.avgEntry || 0;
                          const avgEntryUsd = avgEntrySol * solPriceUsd;
                          const avgExitSol = h.avgExit || 0;
                          const avgExitUsd = avgExitSol * solPriceUsd;
                          
                          const pnlSol = h.pnlSol || 0;
                          const pnlUsd = pnlSol * solPriceUsd;
                          const pnlPercent = avgEntrySol > 0 ? (pnlSol / avgEntrySol) * 100 : 0;
                          
                          const isRealizedPositive = pnlSol >= 0;
                          const itemPnlColor = isRealizedPositive ? 'text-green' : 'text-red';
                          const pnlArrow = isRealizedPositive ? '▲' : '▼';

                          return (
                            <button
                              key={h.tokenAddress}
                              type="button"
                              onClick={() => router.push(`/trade/${h.tokenAddress}`)}
                              className="flex items-center gap-3 py-2 px-3 hover:bg-bg-secondary focus-visible:bg-bg-secondary w-full text-left transition-colors cursor-pointer border-none"
                            >
                              <div className="relative shrink-0 w-9 h-9">
                                {h.tokenLogoURI ? (
                                  <img className="rounded-full border border-bg-tertiary w-9 h-9 object-cover" src={h.tokenLogoURI} alt="" />
                                ) : (
                                  <div className="rounded-full border border-bg-tertiary w-9 h-9 flex items-center justify-center bg-[#2c264d] text-xs font-bold text-white">
                                    {h.tokenSymbol.slice(0, 2)}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col gap-px items-start flex-1 min-w-0" translate="no">
                                <div className="text-sm font-semibold text-white truncate w-full">{h.tokenSymbol}</div>
                                <div className="text-xs text-text-secondary truncate w-full">{h.tokenName || 'Closed position'}</div>
                              </div>
                              
                              <div className="w-40 shrink-0 flex-col items-start hidden 3xl:flex" translate="no">
                                <div className="text-sm text-white font-mono">
                                  {avgEntrySol ? `${avgEntrySol.toFixed(6)} SOL` : '--'}
                                </div>
                                <div className="text-xs text-text-tertiary font-mono">
                                  {formatPriceWithSubscript(avgEntryUsd)}
                                </div>
                              </div>
                              
                              <div className="w-40 shrink-0 flex-col items-start hidden 3xl:flex" translate="no">
                                <div className="text-sm text-white font-mono">
                                  {avgExitSol ? `${avgExitSol.toFixed(6)} SOL` : '--'}
                                </div>
                                <div className="text-xs text-text-tertiary font-mono">
                                  {formatPriceWithSubscript(avgExitUsd)}
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end gap-px w-24 shrink-0 font-mono">
                                <div className="contents 3xl:hidden">
                                  <div className="text-sm text-white font-medium" {...(isOwnProfile ? { 'data-balance': true } : {})}>
                                    {pnlUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                                  </div>
                                  <div className={`flex gap-0.5 items-center ${itemPnlColor}`} translate="no">
                                    <div style={{ fontSize: 8 }}>{pnlArrow}</div>
                                    <div style={{ fontSize: 12 }}>{Math.abs(pnlPercent).toFixed(2)}%</div>
                                  </div>
                                </div>
                                <div className="hidden 3xl:contents">
                                  <div className={`flex gap-0.5 items-center ${itemPnlColor}`} translate="no">
                                    <div className="text-sm font-semibold">{isRealizedPositive ? '+' : '-'}</div>
                                    <div className="text-sm font-semibold" {...(isOwnProfile ? { 'data-balance': true } : {})}>
                                      {Math.abs(pnlUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                                    </div>
                                  </div>
                                  <div className={`flex gap-0.5 items-center ${itemPnlColor}`} translate="no">
                                    <div style={{ fontSize: 8 }}>{pnlArrow}</div>
                                    <div className="text-xs text-text-tertiary">{Math.abs(pnlPercent).toFixed(2)}%</div>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Theses and swaps */}
            <div className="flex flex-col flex-1 min-w-0 gap-4">
              {/* Thesis list */}
              {theses.length === 0 ? (
                <div className="text-center p-8 text-xs text-text-tertiary border border-bg-tertiary rounded-xl bg-bg-secondary/40">
                  No thesis posted yet
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {theses.map((t) => {
                    const tokenInfo = trendingTokens.find(tok => tok.address === t.token_address);
                    const tradeInfo = trades.find(tr => tr.tokenAddress === t.token_address);
                    const tokenSymbol = tokenInfo?.symbol || tradeInfo?.tokenSymbol || 'Token';
                    const tokenLogo = tokenInfo?.logoURI || tradeInfo?.tokenLogoURI || '';
                    const isVerified = verifiedSet.has(t.token_address);

                    return (
                      <div
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/trade/${t.token_address}`)}
                        className="rounded-xl flex flex-col items-start ring ring-bg-tertiary gap-2 bg-bg-secondary p-2 cursor-pointer hover:opacity-80 transition-all w-full text-left"
                      >
                        <div className="flex items-center gap-1.5 w-full">
                          <div className="flex items-center gap-1.5">
                            <div className="relative shrink-0" style={{ width: 24, height: 24 }}>
                              {tokenLogo ? (
                                <img className="rounded-full border border-bg-tertiary w-6 h-6 object-cover" src={tokenLogo} alt={tokenSymbol} />
                              ) : (
                                <div className="rounded-full border border-bg-tertiary w-6 h-6 flex items-center justify-center bg-[#2c264d] text-[10px] text-white font-bold">
                                  {tokenSymbol.slice(0, 2)}
                                </div>
                              )}
                              {isVerified && (
                                <div className="absolute flex items-center justify-center" style={{ bottom: -2, right: -2 }}>
                                  <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="currentColor" className="text-accent-primary">
                                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="text-sm font-semibold text-white">{tokenSymbol}</div>
                          </div>
                          <div className="rounded-sm px-1 py-0.5 bg-accent-primary-transparent text-accent-primary text-[10px] font-bold">Thesis</div>
                          <div className="rounded-sm px-1 py-0.5 bg-bg-tertiary text-text-secondary text-[10px] font-bold">Most Liked</div>
                          <span className="text-[10px] text-text-tertiary ml-auto font-mono">
                            {timeAgo(t.created_at)}
                          </span>
                        </div>
                        
                        <p className="text-sm font-normal text-white">
                          <span>{t.content}</span>
                        </p>
                        
                        {t.image_url && (
                          <div className="relative rounded-lg overflow-hidden max-h-60 mt-1 w-full border border-bg-tertiary/40">
                            <img src={t.image_url} alt="Thesis media" className="object-cover w-full h-full max-h-60" />
                          </div>
                        )}
                        
                        <div className="flex gap-4 items-center">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeThesis(t.id, t.hearts || 0);
                            }}
                            className="flex items-center cursor-pointer h-4 min-w-4 w-auto gap-1 text-text-tertiary hover:text-red transition-colors"
                          >
                            <div className="p-2 -m-2 active:scale-75 transition-transform duration-150">
                              <FiHeart className="w-4 h-4 transition-colors text-text-tertiary hover:text-red" />
                            </div>
                            <span className="text-xs min-w-2 transition-all text-text-tertiary">{t.hearts || 0}</span>
                          </div>
                          
                          <div className="flex gap-1 items-center">
                            <FiMessageSquare className="w-4 h-4 text-text-tertiary" />
                            <div className="text-xs text-text-tertiary">2 newer</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Swaps list card */}
              <div className="flex flex-col flex-1 rounded-lg border border-bg-tertiary bg-[#0d0b1a] overflow-hidden">
                <div className="p-2 pl-3 bg-bg-secondary flex items-center shrink-0 rounded-t-lg border-b border-bg-tertiary">
                  <div className="flex gap-3 text-sm font-semibold">
                    <button
                      onClick={() => setSwapsTab('all')}
                      className={`cursor-pointer transition-colors ${
                        swapsTab === 'all' ? 'text-white' : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      All swaps
                    </button>
                    <button
                      onClick={() => setSwapsTab('buy')}
                      className={`cursor-pointer transition-colors ${
                        swapsTab === 'buy' ? 'text-white' : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      Buys
                    </button>
                    <button
                      onClick={() => setSwapsTab('sell')}
                      className={`cursor-pointer transition-colors ${
                        swapsTab === 'sell' ? 'text-white' : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      Sells
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[minmax(0,10rem)_3rem_1fr] large-desktop:grid-cols-[minmax(0,10rem)_4rem_5rem_1fr] 2xl:grid-cols-[minmax(0,10rem)_4rem_5rem_7rem_1fr] items-center gap-3 px-3 py-1 text-xs text-text-tertiary border-b border-bg-tertiary/60 shrink-0">
                  <div>Token</div>
                  <div>Action</div>
                  <div>Amount</div>
                  <div className="hidden 2xl:block">MCap</div>
                  <div className="hidden large-desktop:block text-right">Time</div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-bg-tertiary/10">
                  {filteredSwaps.length === 0 ? (
                    <div className="text-center py-10 text-xs text-text-tertiary">No swaps yet</div>
                  ) : (
                    filteredSwaps.map((trade) => {
                      const isBuy = trade.type === 'buy';
                      const swapColor = isBuy ? 'rgb(33, 201, 94)' : 'rgb(255, 98, 46)';
                      const swapBgColor = isBuy ? 'rgba(33, 201, 94, 0.2)' : 'rgba(255, 98, 46, 0.2)';
                      
                      const tokenInfo = trendingTokens.find(t => t.address === trade.tokenAddress);
                      const mcap = tokenInfo?.marketCap || (trade.priceUsd * 1e9); // fallback estimation
                      const formattedMcap = formatMCap(mcap);

                      return (
                        <button
                          key={trade.id}
                          type="button"
                          onClick={() => router.push(`/trade/${trade.tokenAddress}`)}
                          className="grid grid-cols-[minmax(0,10rem)_3rem_1fr] large-desktop:grid-cols-[minmax(0,10rem)_4rem_5rem_1fr] 2xl:grid-cols-[minmax(0,10rem)_4rem_5rem_7rem_1fr] items-center gap-3 px-3 py-2 hover:bg-bg-secondary cursor-pointer text-left w-full transition-colors border-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative shrink-0 w-6 h-6">
                              {trade.tokenLogoURI ? (
                                <img src={trade.tokenLogoURI} alt="" className="rounded-full border border-bg-tertiary w-6 h-6 object-cover" />
                              ) : (
                                <div className="rounded-full border border-bg-tertiary w-6 h-6 flex items-center justify-center bg-bg-tertiary text-[10px] text-white font-bold">
                                  {trade.tokenSymbol.slice(0, 2)}
                                </div>
                              )}
                            </div>
                            <div className="text-sm truncate font-medium text-white">{trade.tokenSymbol}</div>
                          </div>
                          
                          <div className="justify-self-start">
                            <div
                              className="w-fit rounded-sm py-px px-1 text-xs font-bold uppercase"
                              style={{ color: swapColor, backgroundColor: swapBgColor }}
                            >
                              {trade.type}
                            </div>
                          </div>
                          
                          <div className="text-sm font-mono text-white" {...(isOwnProfile ? { 'data-balance': true } : {})}>
                            {(trade.solAmount * solPriceUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                          </div>
                          
                          <div className="hidden 2xl:block text-sm text-text-secondary font-mono">
                            {formattedMcap} MC
                          </div>
                          
                          <div className="hidden large-desktop:block text-xs text-text-tertiary text-right font-mono">
                            {timeAgo(trade.timestamp)}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Send Cash widget & Follow Top Traders list */}
        <div className="hidden xl:flex flex-col w-80 pr-4 gap-3 shrink-0">
          {/* Send Cash Container */}
          {!isOwnProfile && (
            <div className="bg-[#0d0b1a] border border-bg-tertiary p-4 rounded-xl flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between bg-bg-secondary rounded-lg p-2.5 px-3.5 border border-bg-tertiary/60">
                <span className="font-bold text-white text-sm">Send SOL</span>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <div
                    className="rounded-full flex items-center justify-center shrink-0 border border-bg-tertiary bg-[#2c264d] overflow-hidden"
                    style={{ width: 22, height: 22 }}
                  >
                    {profileUser.avatar_url ? (
                      <img src={profileUser.avatar_url} alt={profileUser.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-white uppercase font-bold">
                        {profileUser.display_name ? profileUser.display_name.slice(0, 1) : 'CW'}
                      </span>
                    )}
                  </div>
                  <span className="text-white" translate="no">
                    {profileUser.display_name || profileUser.username}
                  </span>
                </div>
              </div>

              {/* Enter Amount Input */}
              <div className="bg-bg-secondary p-3 rounded-xl flex items-center text-2xl gap-0.5 border border-bg-tertiary/60 focus-within:border-accent-primary">
                <div className="flex flex-1 min-w-0 items-center gap-1">
                  <span className="text-text-tertiary text-lg font-mono">SOL</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-text-tertiary text-white text-xl font-mono text-right"
                  />
                </div>
              </div>

              <button
                onClick={handleSendCash}
                disabled={isSendingCash || !sendAmount}
                className="w-full bg-accent-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed border border-bg-tertiary rounded-xl h-11 flex items-center justify-center cursor-pointer text-white font-bold transition-opacity"
              >
                {isSendingCash ? 'Processing...' : 'Send'}
              </button>
            </div>
          )}

          {/* Follow Top Traders Widget identical to fomo.html */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center px-2">
              <FiUserPlus className="w-5 h-5 text-text-tertiary" />
              <span className="font-medium text-text-primary text-sm">Follow top traders</span>
            </div>
            
            {topTraders.length === 0 ? (
              <div className="py-6 text-center border border-bg-tertiary rounded-xl bg-bg-secondary/40">
                <span className="text-xs text-text-tertiary">No trader data available</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1 animate-fade-in">
                {topTraders.map((trader, i) => {
                  const dbProfile = dbProfilesMap[trader.owner.toLowerCase()];
                  const displayName = dbProfile?.display_name || dbProfile?.username || hashToUsername(trader.owner, i).username;
                  const handle = dbProfile?.username ? `@${dbProfile.username}` : hashToUsername(trader.owner, i).handle;
                  const avatarUrl = dbProfile?.avatar_url || getProfilePic(trader.owner);
                  const isFollowingTrader = followingWallets[trader.owner];

                  return (
                    <div key={trader.owner} className="flex gap-3 items-center p-2">
                      <Link
                        className="flex gap-3 items-center flex-1 min-w-0"
                        href={`/profile/${dbProfile?.username || trader.owner}`}
                      >
                        <div className="relative shrink-0" style={{ width: 36, height: 36 }}>
                          <div className="absolute inset-0">
                            <TraderAvatar addr={trader.owner} index={i} size={36} />
                          </div>
                          <img
                            className="rounded-full shrink-0 object-cover w-9 h-9 border border-bg-tertiary relative z-10"
                            src={avatarUrl}
                            alt={displayName}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-medium text-text-primary truncate leading-[1.2]" translate="no">
                            {displayName}
                          </span>
                          <span className="text-xs font-medium text-text-secondary truncate leading-[1.2]" translate="no">
                            {handle}
                          </span>
                        </div>
                      </Link>
                      
                      <button
                        type="button"
                        onClick={() => handleFollowTopTraderToggle(trader.owner)}
                        className={`shrink-0 px-2 py-1.5 rounded-md text-xs font-bold cursor-pointer min-w-18 text-center overflow-hidden transition-colors ${
                          isFollowingTrader
                            ? 'bg-bg-secondary text-text-primary border border-bg-tertiary hover:bg-bg-tertiary'
                            : 'bg-accent-primary text-text-primary hover:opacity-80'
                        }`}
                      >
                        <span className="inline-block animate-flip-up">
                          {isFollowingTrader ? 'Following' : 'Follow'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      {/* Edit Profile Modal Dialog */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative outline-none w-104 bg-[#0d0b1a] rounded-3xl border border-bg-tertiary p-4 flex flex-col gap-4">
            {/* Close Modal Button */}
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute -top-11 right-0 p-2 text-white hover:bg-bg-tertiary rounded-full border border-bg-tertiary bg-bg-primary/60 backdrop-blur-sm transition-colors cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-lg leading-none font-semibold text-white">Edit your profile</h2>

            {/* Hidden uploads inputs */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'avatar')}
            />
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'banner')}
            />

            {/* Banner & Avatar controls preview */}
            <div className="flex flex-col items-start pb-8 relative shrink-0">
              {/* Banner Area */}
              <div className="relative w-full rounded-xl overflow-hidden h-[104px] bg-[#1a162b] border border-bg-tertiary">
                {editBannerUrl ? (
                  <img src={editBannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-bg-secondary" />
                )}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <button
                    type="button"
                    disabled={isUploadingBanner}
                    onClick={() => bannerInputRef.current?.click()}
                    className="bg-bg-tertiary rounded-md p-1.5 flex items-center justify-center cursor-pointer hover:opacity-85"
                  >
                    <FiEdit3 className="w-3.5 h-3.5 text-text-primary" />
                  </button>
                </div>
              </div>

              {/* Avatar Area */}
              <div className="absolute bottom-0 left-2">
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative cursor-pointer group rounded-full border-2 border-[#0d0b1a]"
                >
                  <div
                    className="rounded-full flex items-center justify-center shrink-0 bg-[#2c264d] overflow-hidden"
                    style={{ height: 60, width: 60 }}
                  >
                    {editAvatarUrl ? (
                      <img src={editAvatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-white uppercase">
                        {editDisplayName ? editDisplayName.slice(0, 1) : 'CW'}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#0d0b1a]/40 group-hover:bg-[#0d0b1a]/60 transition-colors">
                    <FiEdit3 className="w-4 h-4 text-text-primary" />
                  </div>
                </button>
              </div>
            </div>

            {/* Edit fields inputs */}
            <div className="flex flex-col gap-2.5">
              {/* Username Input */}
              <div className="flex flex-col gap-1">
                <div className="bg-bg-tertiary rounded-xl p-2.5 flex flex-col gap-1 border focus-within:border-text-tertiary border-transparent">
                  <label className="text-xs text-text-tertiary font-bold">Username</label>
                  <div className="flex items-center gap-px">
                    <span className="text-sm text-text-secondary font-mono">@</span>
                    <input
                      type="text"
                      maxLength={25}
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="text-sm text-text-primary bg-transparent outline-none w-full border-none focus:ring-0"
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>

              {/* Display Name Input */}
              <div className="flex flex-col gap-1">
                <div className="bg-bg-tertiary rounded-xl p-2.5 flex flex-col gap-1 border focus-within:border-text-tertiary border-transparent">
                  <label className="text-xs text-text-tertiary font-bold">Display name</label>
                  <input
                    type="text"
                    maxLength={25}
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="text-sm text-text-primary bg-transparent outline-none w-full border-none focus:ring-0"
                    placeholder="Display name"
                  />
                </div>
              </div>

              {/* Bio Textarea Input */}
              <div className="flex flex-col gap-1">
                <div className="bg-bg-tertiary rounded-xl p-2.5 flex flex-col gap-1 border focus-within:border-text-tertiary border-transparent">
                  <label className="text-xs text-text-tertiary font-bold">Bio</label>
                  <textarea
                    rows={2}
                    maxLength={160}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="text-sm text-text-primary bg-transparent outline-none w-full resize-none border-none focus:ring-0"
                    placeholder="Add a bio"
                  />
                </div>
                <div className="flex justify-between px-1">
                  <div />
                  <p className="text-[10px] text-text-tertiary">
                    {editBio.length}/160
                  </p>
                </div>
              </div>

              {/* Link X Account Action button */}
              <button
                type="button"
                onClick={linkTwitter}
                className="bg-bg-tertiary rounded-lg p-2.5 flex items-center gap-2 cursor-pointer hover:bg-bg-secondary transition-colors"
              >
                <FaXTwitter className="w-4 h-4 text-accent-primary shrink-0" />
                <span className="text-xs font-bold text-accent-primary">
                  {user?.twitter?.username ? `Linked: @${user.twitter.username}` : 'Link X account'}
                </span>
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveProfile}
              disabled={isSaving || !editUsername.trim() || !editDisplayName.trim()}
              className="bg-accent-primary border border-bg-tertiary rounded-xl h-11 flex items-center justify-center cursor-pointer text-white font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mt-2"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Always-mounted hidden Portfolio to compute summary for navbar */}
      <Portfolio
        walletAddress={viewerWalletAddress}
        tokenPrices={trendingTokens.map(t => ({ address: t.address, symbol: t.symbol, name: t.name, logoURI: t.logoURI, price: t.price }))}
        onSummaryChange={setPortfolioSummary}
        onClose={() => {}}
        onSelectToken={() => {}}
        hidden
      />
    </>
  );
}
