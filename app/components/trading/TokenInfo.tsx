"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { supabase } from "@/app/lib/supabase";
import { CldUploadWidget } from "next-cloudinary";
import { Group, Panel, Separator } from "react-resizable-panels";
import TokenLogo from "./TokenLogo";
import { HiMiniCheckBadge } from "react-icons/hi2";
import { getDexIcon } from "./TrendingList";
import {
  formatPrice,
  formatMarketCap,
  shortenAddress,
  timeAgo,
} from "@/app/lib/constants";
import TradingViewWidget from "./TradingViewWidget";

function getProfileColor(addr: string): string {
  if (!addr) return 'rgb(255, 111, 233)';
  const hash = addr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colors = [
    'rgb(255, 111, 233)', // pink
    'rgb(81, 106, 246)',  // blue
    'rgb(54, 211, 153)',  // green
    'rgb(255, 180, 0)',   // yellow
    'rgb(255, 76, 76)',   // red
  ];
  return colors[hash % colors.length];
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
  liquidity?: number;
  dex?: string;
}

interface PricePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface HolderRow {
  address: string;
  username: string;
  avatarUrl?: string | null;
  avgHoldTime: string;
  positionUSD: number;
  positionTokens: number;
  pnlUSD: number;
  pnlPercent: number;
  avgEntryMC: number;
  avgEntryPrice: number;
  thesis?: string;
  thesisHearts: number;
  thesisCreatedAt?: string | null;
}

const TIME_RANGES = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1H",
  "6H",
  "12H",
  "1D",
  "3D",
  "1W",
  "1M",
] as const;

export default function TokenInfo({ token }: { token: Token }) {
  const { user, authenticated, login } = usePrivy();
  const [timeRange, setTimeRange] =
    useState<(typeof TIME_RANGES)[number]>("1D");
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [chartMode, setChartMode] = useState<"price" | "mcap">("price");
  const [rawHistory, setRawHistory] = useState<any[]>([]);
  const [legendData, setLegendData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"holders" | "swaps" | "thesis">(
    "holders",
  );
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [htmlMarkers, setHtmlMarkers] = useState<
    {
      id: string;
      x: number;
      y: number;
      address?: string;
      avatarUrl: string;
      items: any[];
    }[]
  >([]);

  const [chartLoading, setChartLoading] = useState(false);
  const [theses, setTheses] = useState<any[]>([]);
  const [thesisContent, setThesisContent] = useState("");
  const [thesisImage, setThesisImage] = useState("");
  const [isSubmittingThesis, setIsSubmittingThesis] = useState(false);
  const [liveTrades, setLiveTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [holders, setHolders] = useState<HolderRow[]>([]);

  const [verified, setVerified] = useState(false);
  const [socialLinks, setSocialLinks] = useState<{
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    medium?: string;
  }>({});

  const [showMySwaps, setShowMySwaps] = useState(true);
  const [showThesisOverlay, setShowThesisOverlay] = useState(false);
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [minSize, setMinSize] = useState("");

  const [filterThesisOnly, setFilterThesisOnly] = useState(false);
  const [filterFriendsOnly, setFilterFriendsOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  const dexIcon = getDexIcon(token.dex);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(token.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  useEffect(() => {
    async function fetchData() {
      setTradesLoading(true);
      try {
        const thesisRes = await fetch(`/api/theses?address=${token.address}`);
        const { theses: fetchedTheses } = await thesisRes.json();
        setTheses(fetchedTheses);

        const holdersRes = await fetch(`/api/holders?address=${token.address}`);
        const { holders: fetchedHolders } = await holdersRes.json();

        const mappedHolders = fetchedHolders.map((h: any) => {
          const addr = h.user?.address;
          const displayName = h.user?.displayName;
          const avatarUrl = h.user?.avatarUrl;
          const holdStr =
            (h.averageHoldTimeSeconds / 86400).toFixed(1) + " days";
          const costBasis = h.costBasis || 0;
          return {
            address: addr,
            username:
              displayName ||
              (addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "Anonymous"),
            avatarUrl,
            avgHoldTime: holdStr.trim(),
            positionUSD: h.value || 0,
            positionTokens: h.humanAmount || 0,
            pnlUSD: h.pnl || 0,
            pnlPercent: costBasis !== 0 ? (h.pnl / costBasis) * 100 : 0,
            avgEntryMC: h.averageEntryMarketCap || 0,
            avgEntryPrice: h.averageEntryPrice || 0,
            thesis: h.comment?.comment,
            thesisHearts: h.comment?.numLikes || 0,
            thesisCreatedAt: h.comment?.createdAt || null,
          };
        });
        setHolders(mappedHolders);

        const tradesRes = await fetch(
          `/api/trades?address=${token.address}&limit=30`,
        );
        const { trades } = await tradesRes.json();
        setLiveTrades(trades || []);
      } catch (e) {
        console.error("Failed to fetch data", e);
      }

      try {
        const metaRes = await fetch(
          `/api/token-metadata?address=${token.address}`,
        );
        const { metadata } = await metaRes.json();
        if (metadata?.extensions) {
          setSocialLinks({
            website: metadata.extensions.website,
            twitter: metadata.extensions.twitter,
            telegram: metadata.extensions.telegram,
            discord: metadata.extensions.discord,
            medium: metadata.extensions.medium,
          });
        }
      } catch (e) {
        console.error("Failed to fetch token metadata", e);
      }

      try {
        const verifyRes = await fetch(`/api/verify?address=${token.address}`);
        const { verified: isVerified } = await verifyRes.json();
        setVerified(isVerified);
      } catch {} // ignore verification errors

      setTradesLoading(false);
    }
    fetchData();
  }, [token.address, token.price]);

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

    const { error } = await supabase.from("theses").insert([newThesis]);
    if (!error) {
      setTheses([
        { ...newThesis, created_at: new Date().toISOString() },
        ...theses,
      ]);
      setThesisContent("");
      setThesisImage("");
    } else {
      alert(
        'Failed to post thesis. Ensure you created the "theses" table in Supabase.',
      );
    }
    setIsSubmittingThesis(false);
  };

  useEffect(() => {
    async function fetchChartData() {
      setChartLoading(true);
      const now = Math.floor(Date.now() / 1000);

      try {
        const res = await fetch(
          `/api/history?address=${token.address}&type=${timeRange}&timeTo=${now}`,
        );
        const { history } = await res.json();

        if (history && history.length > 0) {
          setRawHistory(history);
        } else {
          setRawHistory([]);
        }
      } catch (e) {
        console.error("Failed to fetch history", e);
        setRawHistory([]);
      }
      setChartLoading(false);
    }
    fetchChartData();
  }, [token.address, timeRange]);

  useEffect(() => {
    if (rawHistory.length > 0) {
      const supply = token.marketCap / (token.price || 1);
      const scale = chartMode === "mcap" ? supply : 1;
      const formattedData = rawHistory.map((item: any) => ({
        time: item.unixTime,
        open: item.open * scale,
        high: item.high * scale,
        low: item.low * scale,
        close: item.close * scale,
        volume: item.volume || 0,
      }));
      // Schedule the state update to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setPriceHistory(formattedData as any);
      });
    } else {
      requestAnimationFrame(() => {
        setPriceHistory([]);
      });
    }
  }, [rawHistory, chartMode, token.marketCap, token.price]);

  // Measure chart container size dynamically
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const container = chartContainerRef.current;

    // Set initial size
    setContainerSize({
      width: container.clientWidth || 0,
      height: container.clientHeight || 380,
    });

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setContainerSize({ width, height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Recalculate htmlMarkers coordinate overlays
  useEffect(() => {
    if (
      priceHistory.length === 0 ||
      (!showThesisOverlay && !showMySwaps) ||
      containerSize.width === 0
    ) {
      requestAnimationFrame(() => {
        setHtmlMarkers([]);
      });
      return;
    }

    const times = priceHistory.map((p) => p.time as number);
    const prices = priceHistory.map((p) => p.close);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const leftOffset = 52;
    const rightOffset = 55;
    const topOffset = 38;
    const bottomOffset = 26;

    const chartWidth = containerSize.width - leftOffset - rightOffset;
    const chartHeight = containerSize.height - topOffset - bottomOffset;

    const matchedBars = new Map<number, any[]>();

    // 1. Process Theses
    if (showThesisOverlay && holders.length > 0) {
      holders.forEach((holder) => {
        if (!holder.thesis) return;

        let holderTime = maxTime;
        if (holder.thesisCreatedAt) {
          holderTime = Math.floor(
            new Date(holder.thesisCreatedAt).getTime() / 1000
          );
        } else {
          const targetValue =
            chartMode === "mcap" ? holder.avgEntryMC : holder.avgEntryPrice;
          if (targetValue && targetValue > 0) {
            let closestPoint: any = null;
            let minDiff = Infinity;
            priceHistory.forEach((point) => {
              const diff = Math.abs(point.close - targetValue);
              if (diff < minDiff) {
                minDiff = diff;
                closestPoint = point;
              }
            });
            if (closestPoint) {
              holderTime = closestPoint.time as number;
            }
          }
        }

        // Snap to closest priceHistory timestamp
        let closestPoint: any = null;
        let minDiff = Infinity;
        priceHistory.forEach((point) => {
          const diff = Math.abs((point.time as number) - holderTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestPoint = point;
          }
        });

        if (closestPoint) {
          const barTime = closestPoint.time as number;
          if (!matchedBars.has(barTime)) {
            matchedBars.set(barTime, []);
          }
          matchedBars.get(barTime)!.push({
            type: "thesis",
            address: holder.address,
            username: holder.username,
            avatarUrl: holder.avatarUrl,
            createdAt: holder.thesisCreatedAt,
            content: holder.thesis,
            thesisHearts: holder.thesisHearts,
          });
        }
      });
    }

    // 2. Process Swaps
    if (showMySwaps && liveTrades.length > 0) {
      liveTrades.forEach((trade) => {
        const tradeTime = trade.unixTime; // Unix timestamp
        // Snap to closest priceHistory timestamp
        let closestPoint: any = null;
        let minDiff = Infinity;
        priceHistory.forEach((point) => {
          const diff = Math.abs((point.time as number) - tradeTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestPoint = point;
          }
        });

        if (closestPoint) {
          const barTime = closestPoint.time as number;
          if (!matchedBars.has(barTime)) {
            matchedBars.set(barTime, []);
          }
          const formattedAmount = typeof trade.usdAmount === "number"
            ? trade.usdAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + " SOL"
            : trade.usdAmount;
          matchedBars.get(barTime)!.push({
            type: "swap",
            address: trade.userId,
            username: trade.displayName,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${trade.userId || trade.displayName}`,
            createdAt: trade.unixTime * 1000,
            content: `${trade.tradeType === "BUY" ? "Bought" : "Sold"} ${formattedAmount} of ${token.symbol}`,
            tradeType: trade.tradeType,
            amount: trade.usdAmount,
          });
        }
      });
    }

    const markersList: any[] = [];
    matchedBars.forEach((barItems, barTime) => {
      const fx = (barTime - minTime) / (maxTime - minTime || 1);

      const closestPoint = priceHistory.find(
        (p) => (p.time as number) === barTime
      );
      const priceVal = closestPoint ? closestPoint.high : minPrice;
      const fy = (priceVal - minPrice) / (maxPrice - minPrice || 1);

      // Interpolate coordinates
      const x = leftOffset + fx * chartWidth;
      const y = topOffset + (1 - fy) * chartHeight - 12;

      if (
        x >= 0 &&
        x <= containerSize.width &&
        y >= 0 &&
        y <= containerSize.height
      ) {
        const primaryItem = barItems[0];
        const avatarUrl =
          primaryItem.avatarUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${primaryItem.address || primaryItem.username}`;
        markersList.push({
          id: `marker-${barTime}`,
          x,
          y,
          address: primaryItem.address,
          avatarUrl,
          items: barItems,
        });
      }
    });

    requestAnimationFrame(() => {
      setHtmlMarkers(markersList);
    });
  }, [
    priceHistory,
    showThesisOverlay,
    showMySwaps,
    holders,
    liveTrades,
    chartMode,
    containerSize,
  ]);

  const filteredHolders = holders.filter((h) => {
    if (filterThesisOnly && !h.thesis) return false;
    if (filterFriendsOnly) return false;
    return true;
  });

  const displayedTrades = liveTrades.filter((t) => {
    if (filterFriendsOnly) return false;
    if (minSize && t.volumeUSD < parseFloat(minSize)) return false;
    return true;
  });

  return (
    <div className="lg:h-full flex flex-col">
      {/* Token Header */}
      <div className="border-b border-bg-tertiary shrink-0 mb-3">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="flex items-center gap-3 lg:gap-4">
            <div
              className="relative shrink-0"
              style={{ width: 40, height: 40 }}
            >
              <TokenLogo token={token} size={40} />
              {verified && (
                <div
                  className="absolute flex items-center justify-center"
                  style={{ bottom: -4, right: -4 }}
                >
                  <HiMiniCheckBadge size={18} className="text-blue-500" />
                </div>
              )}
              {dexIcon && (
                <div
                  className="absolute flex items-center justify-center overflow-hidden rounded-full border-2 border-background bg-bg-primary"
                  style={{ bottom: -4, left: -4, width: 18, height: 18 }}
                >
                  <Image
                    src={dexIcon}
                    alt=""
                    width={14}
                    height={14}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex gap-1 items-center">
                <div
                  className="text-base lg:text-xl font-bold tracking-tight truncate"
                  translate="no"
                >
                  {token.symbol}
                </div>
                <svg
                  width={16}
                  height={16}
                  className="shrink-0 text-text-secondary"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M4.378 17.746l2.532-1.462.476-3.667-3.136.249.128 4.88zm4.367-5.38l-.521 4.083 3.987 2.315 2.527-1.464.521-4.083-3.987-2.315-2.527 1.464zm7.354 2.628l.482-3.661-3.118-1.826-2.532 1.462-.483 3.661 3.118 1.826 2.533-1.462zm-7.692-6.143l2.532-1.462.476-3.667-3.136.249.128 4.88zm11.624 1.634l-.507 3.961-2.027 1.171-.482 3.662 1.994-1.152 2.526-1.463.508-3.961-2.012-1.218zM3.025 22.54l-.004-7.239.152-1.139.15-1.14L8.91 8.47l.15-1.14L9.211 6.19l.151-1.139 3.293-1.902 2.526-1.463 2.69 1.599.004 7.239-.152 1.139-.15 1.14-5.812 3.548-.151 1.14-.151 1.14-.15 1.139-3.294 1.903-2.526 1.463-2.69-1.6z" />
                </svg>
                <div
                  className="rounded-full bg-bg-primary flex items-center justify-center overflow-hidden shrink-0"
                  style={{ width: 20, height: 20 }}
                >
                  {dexIcon ? (
                    <Image
                      src={dexIcon}
                      alt=""
                      width={16}
                      height={16}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <Image
                      src="https://crypto-exchange-logos-production.s3.us-west-2.amazonaws.com/6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P.webp"
                      alt=""
                      width={16}
                      height={16}
                      className="rounded-full"
                      unoptimized
                    />
                  )}
                </div>
                <div className="w-px h-4 bg-bg-tertiary mx-0.5" />
                <div className="flex gap-1 items-center">
                  {socialLinks.website && (
                    <a
                      href={socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-sm bg-bg-tertiary overflow-hidden p-0.5 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <svg
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                      </svg>
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a
                      href={socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-sm bg-bg-tertiary overflow-hidden p-0.5 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <svg
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M22.46 6c-.85.38-1.78.64-2.73.76 1-.6 1.76-1.54 2.12-2.67-.93.55-1.96.95-3.06 1.17a4.77 4.77 0 00-8.13 4.35C7.16 9.1 4.03 7.59 1.91 5.23a4.77 4.77 0 001.48 6.38c-.76-.02-1.48-.23-2.11-.58v.06a4.77 4.77 0 003.83 4.68c-.7.19-1.43.22-2.15.08a4.77 4.77 0 004.46 3.31 9.56 9.56 0 01-5.92 2.04c-.38 0-.76-.02-1.14-.07a13.5 13.5 0 007.33 2.15c8.8 0 13.61-7.29 13.61-13.61 0-.21 0-.41-.01-.61.94-.68 1.75-1.53 2.39-2.5z" />
                      </svg>
                    </a>
                  )}
                  {socialLinks.telegram && (
                    <a
                      href={socialLinks.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-sm bg-bg-tertiary overflow-hidden p-0.5 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <svg
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                      </svg>
                    </a>
                  )}
                  {socialLinks.discord && (
                    <a
                      href={socialLinks.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-sm bg-bg-tertiary overflow-hidden p-0.5 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <svg
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                      </svg>
                    </a>
                  )}
                  <a
                    href={`https://solscan.io/token/${token.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center rounded-sm bg-bg-tertiary overflow-hidden p-0.5 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.34-4.34" />
                    </svg>
                  </a>
                </div>
                <button className="text-text-tertiary hover:text-text-primary transition-colors">
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col mt-0.5">
                <span
                  className="text-xs text-text-secondary truncate max-w-32"
                  title={token.name}
                >
                  {token.name}
                </span>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                >
                  <span className="text-text-tertiary text-xs">
                    {shortenAddress(token.address, 6)}
                  </span>
                  <div className="w-4 h-4 shrink-0 relative flex items-center justify-center">
                    <svg
                      className={`w-4 h-4 text-text-tertiary absolute transition-all duration-200 ${copied ? "opacity-0 scale-0 rotate-90" : "opacity-100 scale-100 rotate-0"}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    <svg
                      className={`w-4 h-4 text-green absolute transition-all duration-200 ${copied ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-0 -rotate-90"}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="relative ml-auto flex-1 min-w-0">
            <div className="no-scrollbar overflow-x-auto overflow-y-hidden cursor-grab">
              <div className="flex w-full">
                <div className="ml-auto">
                  <div className="flex w-max shrink-0 items-center gap-2 tabular-nums">
                    <div className="flex flex-col items-center cursor-default py-2">
                      <div className="text-xs text-text-secondary whitespace-nowrap">
                        Market cap
                      </div>
                      <div
                        className="text-lg font-medium leading-tight tabular-nums whitespace-nowrap"
                        translate="no"
                      >
                        {formatMarketCap(token.marketCap)}
                      </div>
                    </div>
                    <div className="bg-bg-secondary rounded-lg flex flex-col items-center min-w-22 px-2 py-1.5">
                      <div className="text-xs text-text-secondary whitespace-nowrap">
                        Price
                      </div>
                      <div
                        className="text-sm whitespace-nowrap min-h-5 flex items-center"
                        translate="no"
                      >
                        <span className="tabular-nums" translate="no">
                          {formatPrice(token.price)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-bg-secondary rounded-lg flex flex-col items-center min-w-22 px-2 py-1.5">
                      <div className="text-xs text-text-secondary whitespace-nowrap">
                        24H change
                      </div>
                      <div
                        className="text-sm whitespace-nowrap min-h-5 flex items-center"
                        translate="no"
                      >
                        <div
                          className="flex gap-0.75 items-center"
                          translate="no"
                          style={{ lineHeight: "20px" }}
                        >
                          <div
                            style={{
                              color:
                                token.priceChange24h >= 0
                                  ? "rgb(33, 201, 94)"
                                  : "rgb(255, 98, 46)",
                              fontWeight: 400,
                              fontSize: "8px",
                            }}
                          >
                            {token.priceChange24h >= 0 ? "▲" : "▼"}
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              color:
                                token.priceChange24h >= 0
                                  ? "rgb(33, 201, 94)"
                                  : "rgb(255, 98, 46)",
                            }}
                          >
                            {Math.abs(token.priceChange24h).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                            %
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-bg-secondary rounded-lg flex flex-col items-center min-w-22 px-2 py-1.5">
                      <div className="text-xs text-text-secondary whitespace-nowrap">
                        24H Vol.
                      </div>
                      <div
                        className="text-sm whitespace-nowrap min-h-5 flex items-center"
                        translate="no"
                      >
                        {formatMarketCap(token.volume24h)}
                      </div>
                    </div>
                    <div className="bg-bg-secondary rounded-lg flex flex-col items-center min-w-22 px-2 py-1.5">
                      <div className="text-xs text-text-secondary whitespace-nowrap">
                        Liquidity
                      </div>
                      <div
                        className="text-sm whitespace-nowrap min-h-5 flex items-center"
                        translate="no"
                      >
                        {token.liquidity
                          ? formatMarketCap(token.liquidity)
                          : "-"}
                      </div>
                    </div>
                    <div className="bg-bg-secondary rounded-lg flex flex-col items-center min-w-22 px-2 py-1.5">
                      <div className="text-xs text-text-secondary whitespace-nowrap">
                        Holders
                      </div>
                      <div
                        className="text-sm whitespace-nowrap min-h-5 flex items-center"
                        translate="no"
                      >
                        {holders.length > 0
                          ? holders.length >= 1000
                            ? `${(holders.length / 1000).toFixed(0)}K`
                            : holders.length.toLocaleString()
                          : "-"}
                      </div>
                    </div>
                    <div className="bg-bg-secondary rounded-lg flex flex-col items-center min-w-22 px-2 py-1.5">
                      <div className="text-xs text-text-secondary whitespace-nowrap">
                        Top 10 holding
                      </div>
                      <div
                        className="text-sm whitespace-nowrap min-h-5 flex items-center"
                        translate="no"
                      >
                        -
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-4 shrink-0" aria-hidden="true" />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l to-transparent from-bg-primary" />
          </div>
        </div>
      </div>

      <Group orientation="vertical" className="flex-1 min-h-0">
        <Panel defaultSize={55} minSize={20}>
          <div className="relative flex flex-col h-full">
            {/* TradingView Toolbar Style Controls */}
        <div className="relative w-full h-full">
          <div ref={chartContainerRef} className="w-full h-full">
            <TradingViewWidget
              tokenAddress={token.address}
              tokenSymbol={token.symbol}
            />
          </div>
          {/* HTML Thesis & Swaps Avatars Overlay */}
          {(showThesisOverlay || showMySwaps) &&
            htmlMarkers.map((marker) => (
              <div
                key={marker.id}
                className="absolute pointer-events-auto top-0 left-0 group"
                style={{
                  zIndex: 30,
                  transform: `translate3d(${marker.x - 11}px, ${marker.y - 11}px, 0px)`,
                  willChange: "transform",
                }}
              >
                <div className="relative rounded-full border-2 border-bg-primary transition-[transform,box-shadow] duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-[0_0_10px_var(--color-accent-primary)]">
                  <div
                    className="rounded-full flex items-center justify-center shrink-0"
                    style={{
                      height: 22,
                      width: 22,
                      backgroundColor: getProfileColor(marker.address || marker.id),
                    }}
                  >
                    <img
                      className="w-[70%] h-[70%] object-cover rounded-full"
                      src={marker.avatarUrl}
                      alt="Avatar"
                    />
                  </div>
                </div>

                {/* Hover Card matching screenshot reference */}
                <div className="absolute z-20 pointer-events-auto cursor-pointer bottom-full pb-2 left-1/2 -translate-x-1/2 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-150">
                  <div className="bg-bg-primary/60 backdrop-blur-sm border border-bg-tertiary rounded-2xl p-3 shadow-lg w-80 flex flex-col gap-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                    {marker.items.map((item: any, idx: number) => {
                      const hAvatar =
                        item.avatarUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.address || item.username}`;
                      const formattedDate = item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : "Recent";
                      const isThesis = item.type === "thesis";
                      const tagStyle = isThesis
                        ? { color: "rgb(81, 106, 246)", backgroundColor: "rgba(81, 106, 246, 0.2)" }
                        : item.tradeType === "BUY"
                        ? { color: "rgb(34, 197, 94)", backgroundColor: "rgba(34, 197, 94, 0.2)" }
                        : { color: "rgb(239, 68, 68)", backgroundColor: "rgba(239, 68, 68, 0.2)" };
                      const tagText = isThesis ? "Thesis" : item.tradeType === "BUY" ? "Buy" : "Sell";

                      return (
                        <div
                          key={idx}
                          className="flex flex-col gap-1.5 border-b border-[#cbd0eb1a]/40 pb-2.5 last:border-0 last:pb-0 last:border-transparent text-left"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="rounded-full flex items-center justify-center shrink-0"
                              style={{
                                height: 20,
                                width: 20,
                                backgroundColor: getProfileColor(item.address || item.username),
                              }}
                            >
                              <img
                                className="w-[70%] h-[70%] object-cover rounded-full"
                                src={hAvatar}
                                alt=""
                              />
                            </div>
                            <div className="text-sm text-text-primary truncate max-w-[110px]">
                              {item.username || "Anonymous"}
                            </div>
                            <div
                              className="w-fit rounded-sm py-px px-1 text-xs font-bold flex items-center gap-1"
                              style={tagStyle}
                            >
                              {tagText}
                            </div>
                            <time className="text-xs text-text-tertiary ml-auto shrink-0">
                              {formattedDate}
                            </time>
                          </div>
                          <p className="text-sm text-text-primary leading-snug line-clamp-3">
                            {item.content}
                          </p>
                          {isThesis && (
                            <div>
                              <div
                                role="button"
                                tabIndex={0}
                                className="flex items-center cursor-pointer h-4 min-w-4 w-auto gap-1"
                              >
                                <div className="p-2 -m-2 active:scale-75 transition-transform duration-150">
                                  <svg
                                    className="w-4 h-4 transition-colors text-text-tertiary"
                                    style={{ height: 16, width: 16 }}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                  </svg>
                                </div>
                                <span className="text-xs min-w-2 transition-all text-text-tertiary">
                                  {item.thesisHearts || 0}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          {chartLoading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-start mt-3 lg:mt-4 gap-2 text-sm">
          <span className="text-text-primary">Chart overlays</span>
          <div className="h-4 w-px bg-bg-tertiary" />
          <label className="flex items-center gap-2 hover:opacity-80 cursor-pointer text-text-secondary select-none">
            <input
              type="checkbox"
              checked={showMySwaps}
              onChange={(e) => setShowMySwaps(e.target.checked)}
              className="h-4 w-4 rounded bg-bg-secondary border border-bg-tertiary text-accent-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[var(--color-accent-primary)]"
            />
            My swaps
          </label>
          <label className="flex items-center gap-2 hover:opacity-80 cursor-pointer text-text-secondary select-none">
            <input
              type="checkbox"
              checked={showThesisOverlay}
              onChange={(e) => setShowThesisOverlay(e.target.checked)}
              className="h-4 w-4 rounded bg-bg-secondary border border-bg-tertiary text-accent-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[var(--color-accent-primary)]"
            />
            Thesis
          </label>
          </div>
        </div>
      </Panel>
      <Separator className="group flex h-4 w-full cursor-ns-resize items-center justify-center touch-none">
        <div className="h-1 w-7 rounded-full transition-colors bg-bg-tertiary group-hover:bg-text-tertiary" />
      </Separator>
      <Panel defaultSize={45} minSize={20}>
        <div className="flex gap-3 min-h-0 h-full">
        <div className="flex flex-col rounded-lg border border-bg-tertiary flex-1 min-w-0 min-h-0">
          <div className="px-2 pl-3 rounded-t-lg bg-bg-secondary flex items-center justify-between shrink-0 h-10">
            <div className="flex gap-3 text-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("holders")}
                  className={`${activeTab === "holders" ? "text-text-primary" : "text-text-tertiary"} hover:text-text-secondary focus:outline-none capitalize`}
                >
                  holders
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-px h-4 bg-bg-tertiary/40" />
                <button
                  onClick={() => setActiveTab("swaps")}
                  className={`${activeTab === "swaps" ? "text-text-primary" : "text-text-tertiary"} hover:text-text-secondary focus:outline-none capitalize`}
                >
                  swaps
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-px h-4 bg-bg-tertiary/40" />
                <button
                  onClick={() => setActiveTab("thesis")}
                  className={`${activeTab === "thesis" ? "text-text-primary" : "text-text-tertiary"} hover:text-text-secondary focus:outline-none capitalize`}
                >
                  thesis ({theses.length})
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label
                className="flex items-center gap-2 hover:opacity-80 cursor-pointer text-text-secondary select-none"
              >
                <input
                  type="checkbox"
                  checked={filterThesisOnly}
                  onChange={(e) => setFilterThesisOnly(e.target.checked)}
                  className="h-4 w-4 rounded bg-bg-secondary border border-bg-tertiary text-accent-primary focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[var(--color-accent-primary)]"
                />
                <span className="text-text-secondary text-xs">Thesis only</span>
              </label>
    
            </div>
          </div>
          <div className="flex flex-col flex-1 min-h-0">
            <div className="@container flex flex-col overflow-hidden flex-1 min-w-0 min-h-0">
              <div className="relative flex flex-col flex-1 min-h-0">
                <div className="pointer-events-none absolute left-48 @[900px]:hidden top-0 bottom-0 w-4 z-10 bg-linear-to-r from-bg-primary/80 to-transparent transition-opacity opacity-0" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 z-10 bg-linear-to-l from-bg-primary/80 to-transparent transition-opacity" />
                {/* HOLDERS TABLE */}
                {activeTab === "holders" && (
                  <div className="flex flex-col flex-1 overflow-x-auto overflow-y-auto min-h-0 scrollbar-none overscroll-x-none select-none">
                    {/* Header */}
                    <div className="hidden @[400px]:grid grid-cols-[12rem_7.5rem_6.25rem_6.25rem_20rem] @[900px]:grid-cols-[minmax(0,220px)_7.5rem_6.25rem_6.25rem_minmax(0,1fr)] gap-6 py-1.5 text-xs text-text-tertiary border-b border-bg-tertiary/60 sticky top-0 bg-bg-primary z-5 min-w-full items-center">
                      <div className="sticky @[900px]:static left-0 z-1 bg-bg-primary pl-3 pr-4 border-r @[900px]:border-r-0 transition-colors self-stretch flex items-center border-transparent">
                        Trader
                      </div>
                      <div>Position</div>
                      <div>PnL</div>
                      <div>Avg. entry</div>
                      <div className="pr-3">Thesis</div>
                    </div>

                    {/* Body */}
                    {tradesLoading ? (
                      [...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="animate-pulse grid grid-cols-[12rem_7.5rem_6.25rem_6.25rem_20rem] @[900px]:grid-cols-[minmax(0,220px)_7.5rem_6.25rem_6.25rem_minmax(0,1fr)] gap-6 py-3 px-3 items-center min-w-full"
                        >
                          <div className="h-6 bg-surface rounded w-24" />
                          <div className="h-5 bg-surface rounded w-16" />
                          <div className="h-5 bg-surface rounded w-12" />
                          <div className="h-5 bg-surface rounded w-16" />
                          <div className="h-5 bg-surface rounded w-20" />
                        </div>
                      ))
                    ) : filteredHolders.length === 0 ? (
                      <div className="py-8 text-center text-sm text-text-tertiary">
                        No holders found
                      </div>
                    ) : (
                      filteredHolders.map((h, i) => (
                        <button
                          key={i}
                          type="button"
                          className="group py-2 grid items-center text-left gap-6 hover:bg-bg-secondary min-w-full grid-cols-[1fr_auto] @[400px]:grid-cols-[12rem_7.5rem_6.25rem_6.25rem_20rem] @[900px]:grid-cols-[minmax(0,220px)_7.5rem_6.25rem_6.25rem_minmax(0,1fr)] border-b border-bg-tertiary/10"
                        >
                          {/* Trader Column (sticky) */}
                          <div className="flex gap-3 items-center sticky @[900px]:static left-0 z-1 bg-bg-primary group-hover:bg-bg-secondary pl-3 pr-4 py-2 -my-2 border-r @[900px]:border-r-0 overflow-hidden transition-[border-color] border-transparent">
                            <div className="flex gap-3 items-center min-w-0">
                              <div className="w-8 h-8 rounded-full bg-surface-hover overflow-hidden shrink-0">
                                <Image
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${h.address}`}
                                  alt=""
                                  width={32}
                                  height={32}
                                  unoptimized
                                />
                              </div>
                              <div className="flex flex-col gap-0.5 items-start min-w-0">
                                <div
                                  className="text-sm leading-5 font-semibold text-white truncate text-left w-full"
                                  translate="no"
                                >
                                  {h.username}
                                </div>
                                <div className="flex gap-1 items-center">
                                  <svg
                                    width="12"
                                    height="12"
                                    className="text-text-tertiary"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                  <div className="text-[10px] leading-4 text-left font-normal text-text-secondary">
                                    {h.avgHoldTime} avg. hold
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Position Column */}
                          <div
                            className="flex-col items-start gap-0.5 hidden @[400px]:flex tabular-nums"
                            translate="no"
                          >
                            <div className="text-sm leading-5 text-white">
                              {formatPrice(h.positionUSD)}
                            </div>
                            <div className="text-xs leading-4 font-normal text-text-secondary">
                              {h.positionTokens >= 1e6
                                ? `${(h.positionTokens / 1e6).toFixed(2)}M`
                                : h.positionTokens >= 1e3
                                  ? `${(h.positionTokens / 1e3).toFixed(2)}K`
                                  : h.positionTokens.toFixed(2)}{" "}
                              {token.symbol}
                            </div>
                          </div>

                          {/* PnL Column */}
                          <div className="flex-col justify-center gap-0.5 items-start hidden @[400px]:flex tabular-nums">
                            <div
                              className="flex gap-0.5 items-center"
                              translate="no"
                              style={{ lineHeight: "20px" }}
                            >
                              <div
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color:
                                    h.pnlUSD >= 0
                                      ? "rgb(33, 201, 94)"
                                      : "rgb(255, 98, 46)",
                                }}
                              >
                                {h.pnlUSD >= 0 ? "+" : ""}
                              </div>
                              <div
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color:
                                    h.pnlUSD >= 0
                                      ? "rgb(33, 201, 94)"
                                      : "rgb(255, 98, 46)",
                                }}
                              >
                                {formatPrice(Math.abs(h.pnlUSD))}
                              </div>
                            </div>
                            <div
                              className="flex gap-0.75 items-center"
                              translate="no"
                              style={{ lineHeight: "16px" }}
                            >
                              <div
                                style={{
                                  color:
                                    h.pnlPercent >= 0
                                      ? "rgb(33, 201, 94)"
                                      : "rgb(255, 98, 46)",
                                  fontSize: "6px",
                                }}
                              >
                                {h.pnlPercent >= 0 ? "▲" : "▼"}
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 400,
                                  color:
                                    h.pnlPercent >= 0
                                      ? "rgb(33, 201, 94)"
                                      : "rgb(255, 98, 46)",
                                }}
                              >
                                {Math.abs(h.pnlPercent).toFixed(2)}%
                              </div>
                            </div>
                          </div>

                          {/* Mobile-only combined Position/PnL Column */}
                          <div
                            className="flex-col justify-center gap-px items-end flex @[400px]:hidden pr-3 tabular-nums"
                            translate="no"
                          >
                            <div className="text-sm leading-5 text-white">
                              {formatPrice(h.positionUSD)}
                            </div>
                            <div
                              className="flex gap-0.75 items-center"
                              translate="no"
                              style={{ lineHeight: "16px" }}
                            >
                              <div
                                style={{
                                  color:
                                    h.pnlPercent >= 0
                                      ? "rgb(33, 201, 94)"
                                      : "rgb(255, 98, 46)",
                                  fontSize: "6px",
                                }}
                              >
                                {h.pnlPercent >= 0 ? "▲" : "▼"}
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 400,
                                  color:
                                    h.pnlPercent >= 0
                                      ? "rgb(33, 201, 94)"
                                      : "rgb(255, 98, 46)",
                                }}
                              >
                                {Math.abs(h.pnlPercent).toFixed(2)}%
                              </div>
                            </div>
                          </div>

                          {/* Avg Entry Column */}
                          <div
                            className="flex-col items-start gap-0.5 hidden @[400px]:flex"
                            translate="no"
                          >
                            <div className="text-sm leading-5 text-white">
                              {h.avgEntryMC >= 1e6
                                ? `${(h.avgEntryMC / 1e6).toFixed(1)}M USDC`
                                : h.avgEntryMC >= 1e3
                                  ? `${(h.avgEntryMC / 1e3).toFixed(1)}K USDC`
                                  : `${h.avgEntryMC.toFixed(0)} USDC`}{" "}
                              <span className="text-text-secondary">MC</span>
                            </div>
                            <div className="text-xs leading-4 font-normal text-text-secondary">
                              <span className="tabular-nums" translate="no">
                                {formatPrice(h.avgEntryPrice)}
                              </span>
                            </div>
                          </div>

                          {/* Thesis Column */}
                          <div className="items-center hidden @[400px]:flex pr-3 gap-4 min-w-0 flex-1">
                            <div
                              role="button"
                              className="flex items-center cursor-pointer flex-col shrink-0"
                            >
                              <div className="p-2 -m-2 active:scale-75 transition-transform duration-150">
                                <svg
                                  className={`w-4 h-4 transition-colors ${h.thesis ? "text-pink-500" : "text-text-tertiary"}`}
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                              </div>
                              <span className="text-[10px] min-w-2 transition-all text-text-tertiary">
                                {h.thesisHearts}
                              </span>
                            </div>
                            <div className="text-sm text-text-primary leading-tight font-normal text-left line-clamp-2 flex-1 min-w-0">
                              <span>{h.thesis || "—"}</span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* SWAPS TABLE */}
                {activeTab === "swaps" && (
                  <table className="w-full">
                    <thead className="sticky top-0 bg-background text-[10px] text-text-tertiary font-medium z-10">
                      <tr>
                        <th className="text-left py-2 px-3 lg:px-4">Trader</th>
                        <th className="text-left py-2">Action</th>
                        <th className="text-right py-2">Amount</th>
                        <th className="hidden lg:table-cell text-right py-2">
                          Market Cap
                        </th>
                        <th className="text-right py-2 pr-3 lg:pr-4">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {tradesLoading ? (
                        [...Array(6)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="py-3 px-3 lg:px-4">
                              <div className="h-6 bg-surface rounded w-24" />
                            </td>
                            <td className="py-3">
                              <div className="h-5 bg-surface rounded w-10" />
                            </td>
                            <td className="py-3 text-right">
                              <div className="h-5 bg-surface rounded w-12 ml-auto" />
                            </td>
                            <td className="hidden lg:table-cell py-3 text-right">
                              <div className="h-5 bg-surface rounded w-14 ml-auto" />
                            </td>
                            <td className="py-3 pr-3 lg:pr-4 text-right">
                              <div className="h-5 bg-surface rounded w-12 ml-auto" />
                            </td>
                          </tr>
                        ))
                      ) : displayedTrades.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-sm text-text-tertiary"
                          >
                            No recent swaps
                          </td>
                        </tr>
                      ) : (
                        displayedTrades.map((t, i) => (
                          <tr
                            key={i}
                            className="hover:bg-bg-tertiary transition-colors cursor-pointer group"
                          >
                            <td className="py-2.5 px-3 lg:px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-surface-hover overflow-hidden shrink-0">
                                  <Image
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${t.userId}`}
                                    alt=""
                                    width={24}
                                    height={24}
                                    unoptimized
                                  />
                                </div>
                                <span className="text-[13px] font-medium text-white group-hover:underline">
                                  {t.displayName ||
                                    shortenAddress(t.userId || "")}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md ${
                                  t.tradeType === "BUY"
                                    ? "bg-green/20 text-green"
                                    : "bg-red/20 text-red"
                                }`}
                              >
                                {t.tradeType}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <span className="text-xs lg:text-[13px] font-medium text-white">
                                {formatPrice(t.usdAmount)}
                              </span>
                            </td>
                            <td className="hidden lg:table-cell py-2.5 text-right">
                              <span className="text-xs text-text-tertiary">
                                {formatMarketCap(t.marketCap)}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 lg:pr-4 text-right">
                              <span className="text-[11px] text-text-tertiary">
                                {timeAgo(t.unixTime * 1000)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* THESIS TAB */}
                {activeTab === "thesis" && (
                  <div className="p-4 flex flex-col gap-4">
                    <div className="bg-bg-tertiary rounded-xl p-3 border border-bg-tertiary">
                      <textarea
                        value={thesisContent}
                        onChange={(e) => setThesisContent(e.target.value)}
                        placeholder="What's your thesis on this token?"
                        className="w-full bg-transparent text-sm text-white placeholder-text-tertiary focus:outline-none resize-none h-20"
                      />
                      {thesisImage && (
                        <div className="relative w-20 h-20 mb-2 rounded-lg overflow-hidden border border-bg-tertiary">
                          <Image
                            src={thesisImage}
                            alt="Attachment"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <button
                            onClick={() => setThesisImage("")}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
                          >
                            &times;
                          </button>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-bg-tertiary">
                        <CldUploadWidget
                          uploadPreset="chad_wallet"
                          onSuccess={(result: any) =>
                            setThesisImage(result.info.secure_url)
                          }
                        >
                          {({ open }) => (
                            <button
                              onClick={() => open()}
                              type="button"
                              className="text-text-secondary hover:text-white transition-colors text-xs flex items-center gap-1"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              Add Image
                            </button>
                          )}
                        </CldUploadWidget>
                        <button
                          onClick={handleSubmitThesis}
                          disabled={isSubmittingThesis || !thesisContent.trim()}
                          className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          {isSubmittingThesis ? (
                            <>
                              <svg
                                className="animate-spin h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              Posting...
                            </>
                          ) : authenticated ? (
                            "Post Thesis"
                          ) : (
                            "Login to Post"
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {tradesLoading ? (
                        [...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="animate-pulse bg-bg-tertiary rounded-xl p-3 border border-bg-tertiary"
                          >
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
                          <div
                            key={i}
                            className="bg-bg-tertiary rounded-xl p-3 border border-bg-tertiary"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-surface-hover overflow-hidden">
                                <Image
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${t.displayName || t.user_id}`}
                                  alt=""
                                  width={24}
                                  height={24}
                                  unoptimized
                                />
                              </div>
                              <span className="text-xs font-medium text-text-secondary">
                                {t.displayName ||
                                  shortenAddress(t.user_id || "")}
                              </span>
                              {t.authorTrade?.unrealizedPnlUsd && (
                                <span
                                  className={`text-[10px] ml-2 px-1.5 py-0.5 rounded font-medium ${t.authorTrade.unrealizedPnlUsd >= 0 ? "bg-green/20 text-green" : "bg-red/20 text-red"}`}
                                >
                                  {t.authorTrade.unrealizedPnlUsd >= 0
                                    ? "+"
                                    : ""}
                                  {formatPrice(t.authorTrade.unrealizedPnlUsd)}
                                </span>
                              )}
                              <span className="text-[10px] text-text-tertiary ml-auto">
                                {t.created_at
                                  ? new Date(t.created_at).toLocaleDateString()
                                  : "Just now"}
                              </span>
                            </div>
                            <p className="text-sm text-white whitespace-pre-wrap">
                              {t.comment?.comment || t.content}
                            </p>
                            {t.comment?.numLikes > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-[10px] text-text-tertiary">
                                <svg
                                  className="w-3 h-3 text-red-400"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                                <span>{t.comment.numLikes}</span>
                              </div>
                            )}
                            {(t.tokenImageUrl || t.image_url) && (
                              <div className="relative w-full h-40 mt-3 rounded-lg overflow-hidden border border-bg-tertiary">
                                <Image
                                  src={t.tokenImageUrl || t.image_url}
                                  alt="Thesis attachment"
                                  fill
                                  className="object-contain bg-black/50"
                                  unoptimized
                                />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </Panel>
      </Group>
    </div>
  );
}
