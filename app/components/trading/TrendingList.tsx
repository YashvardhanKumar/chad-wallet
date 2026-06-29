"use client";

import { useState, useEffect, useRef } from "react";
import * as HoverCard from "@radix-ui/react-hover-card";
import {
  FiBell,
  FiChevronsLeft,
  FiStar,
  FiCopy,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";
import { IoCheckmarkCircle } from "react-icons/io5";
import { HiMiniCheckBadge } from "react-icons/hi2";
import { FaStar, FaRegStar, FaLeaf } from "react-icons/fa";
import { SiSolana } from "react-icons/si";
import TokenLogo from "./TokenLogo";
import Leaderboard from "./Leaderboard";
import {
  formatPrice,
  formatMarketCap,
  shortenAddress,
} from "@/app/lib/constants";
import Image from "next/image";

function FeedActivityList() {
  const [activities, setActivities] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => setActivities(d.activity || []));
  }, []);

  return (
    <>
      {activities.map((act) => (
        <div
          key={act.id}
          className="p-3 bg-bg-secondary rounded-lg border border-bg-tertiary flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <Image
              src={act.body?.tokenImageUrl}
              className="w-8 h-8 rounded-full bg-bg-tertiary"
              width={32}
              height={32}
              unoptimized
              alt=""
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">
                {act.body?.ticker}
              </div>
              <div className="text-xs text-text-secondary truncate">
                {act.type.replace(/_/g, " ")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-green font-medium">
                +{act.body?.priceChangePercent?.toFixed(2)}%
              </div>
              <div className="text-xs text-text-tertiary">
                {act.body?.uniqueTraders} traders
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center mt-1">
            <div className="flex -space-x-2">
              {act.body?.topTraders?.map((tt: any) => (
                <Image
                  key={tt.id}
                  src={tt.userImageUrl}
                  title={tt.displayName}
                  className="w-6 h-6 rounded-full border border-bg-secondary"
                  width={24}
                  height={24}
                  unoptimized
                  alt=""
                />
              ))}
            </div>
            <div className="text-xs text-text-tertiary ml-1">
              ${(act.body?.totalVolume / 1000).toFixed(1)}K Vol
            </div>
          </div>
        </div>
      ))}
      {activities.length === 0 && (
        <div className="text-center py-10 text-text-tertiary text-sm">
          No activity
        </div>
      )}
    </>
  );
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  bonding?: number;
  graduated?: boolean;
  dex?: string;
  age?: string;
}

interface TrendingListProps {
  tokens: Token[];
  cryptoTokens?: Token[];
  graduatedTokens?: Token[];
  bondingTokens?: Token[];
  heldTokens?: Token[];
  verifiedSet?: Set<string>;
  selectedAddress: string;
  onSelect: (token: Token) => void;
  isLoading?: boolean;
  walletAddress?: string;
  watchlistAddresses: string[];
  onToggleWatchlist: (token: Token) => void;
  afterList?: React.ReactNode;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const FILTER_TABS = [
  "Watchlist",
  "Crypto",
  "Trending",
  "Most held",
  "Gainers",
  "Graduated",
  "Bonding",
] as const;

const NAV_TABS = ["Alerts", "Tokens", "Leaderboard", "Feed"] as const;

export function getDexIcon(dex?: string): string {
  switch (dex) {
    case "Pump.fun":
      return "https://dd.dexscreener.com/ds-data/dexes/pumpfun.png";
    case "Raydium":
      return "https://dd.dexscreener.com/ds-data/dexes/raydium.png";
    case "FourMeme":
      return "https://dd.dexscreener.com/ds-data/dexes/fourmeme.png";
    case "Flap":
      return "https://flap.sh/_next/image?url=%2Flogo.png&w=1080&q=75";
    case "Meteora":
      return "https://dd.dexscreener.com/ds-data/dexes/meteora.png";
    default:
      return "";
  }
}

export default function TrendingList({
  tokens,
  cryptoTokens = [],
  graduatedTokens = [],
  bondingTokens = [],
  heldTokens = [],
  verifiedSet = new Set<string>(),
  selectedAddress,
  onSelect,
  isLoading,
  walletAddress,
  watchlistAddresses,
  onToggleWatchlist,
  afterList,
  onClose,
  isCollapsed,
  onToggleCollapse,
}: TrendingListProps) {
  const [activeFilter, setActiveFilter] = useState<string>("Trending");
  const [activeNav, setActiveNav] = useState<string>("Tokens");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCopy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch {}
  };

  const filteredTokens = [...tokens].filter((token) => {
    if (activeFilter === "Bonding") return false;
    if (activeFilter === "Watchlist")
      return watchlistAddresses.includes(token.address);
    if (activeFilter === "Graduated") return false;
    return true;
  });

  const sortedTokens = filteredTokens.sort((a, b) => {
    switch (activeFilter) {
      case "Gainers":
        return b.priceChange24h - a.priceChange24h;
      case "Most held":
        return b.marketCap - a.marketCap;
      default:
        return b.volume24h - a.volume24h;
    }
  });

  function ageToMinutes(age?: string): number {
    if (!age) return Infinity;
    const num = parseFloat(age);
    if (age.endsWith("mo")) return num * 43200;
    if (age.endsWith("w")) return num * 10080;
    if (age.endsWith("d")) return num * 1440;
    if (age.endsWith("h")) return num * 60;
    if (age.endsWith("m")) return num;
    return Infinity;
  }

  const displayTokens =
    activeFilter === "Crypto"
      ? cryptoTokens
      : activeFilter === "Trending"
        ? filteredTokens
        : activeFilter === "Graduated"
          ? [...graduatedTokens].sort(
              (a, b) => ageToMinutes(a.age) - ageToMinutes(b.age),
            )
          : activeFilter === "Bonding"
            ? [...bondingTokens].sort(
                (a, b) => (b.bonding || 0) - (a.bonding || 0),
              )
            : activeFilter === "Most held"
              ? heldTokens
              : sortedTokens;

  return (
    <div className="flex flex-1 transition-[width] duration-100 ease-out overflow-hidden rounded-xl w-70 2xl:w-85">
      <div className="flex gap-3 flex-1 min-h-0 min-w-0">
        <div className="flex flex-col flex-1 gap-3 min-h-0 min-w-0">
          <div className="flex flex-1 flex-col rounded-xl border border-bg-tertiary min-h-0 min-w-0 pb-2">
            {/* Nav header */}
            <div className="p-2 pl-3 rounded-t-xl bg-bg-secondary flex items-center shrink-0">
              <div className="relative flex-1 min-w-0">
                <div className="no-scrollbar overflow-x-auto overflow-y-hidden flex items-center gap-2 text-sm font-medium">
                  {NAV_TABS.map((tab, i) => (
                    <span key={tab} className="contents">
                      {i > 0 && <div className="w-px h-4 bg-bg-tertiary" />}
                      <button
                        onClick={() => setActiveNav(tab)}
                        className={`flex-none text-left whitespace-nowrap transition-colors ${
                          activeNav === tab
                            ? "text-text-primary"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {tab === "Alerts" ? (
                          <span className="flex items-center justify-start gap-1">
                            <span className="relative flex items-center justify-center shrink-0">
                              <FiBell size={14} />
                            </span>
                            <span>{tab}</span>
                          </span>
                        ) : (
                          tab
                        )}
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1 shrink-0">
                {onClose && (
                  <button
                    onClick={onClose}
                    className="text-text-tertiary hover:text-text-primary focus:outline-none p-1"
                    title="Close panel"
                  >
                    <FiX size={14} />
                  </button>
                )}
                <button
                  onClick={onToggleCollapse}
                  className="text-text-tertiary hover:text-text-primary focus:outline-none p-1"
                  title={isCollapsed ? "Expand panel" : "Collapse panel"}
                >
                  <FiChevronsLeft size={14} />
                </button>
              </div>
            </div>

            {/* Filter pills - only for Tokens nav */}
            {activeNav === "Tokens" && (
              <div className="relative shrink-0">
                <div className="no-scrollbar overflow-x-auto overflow-y-hidden cursor-grab flex gap-2 px-3 pt-2 pb-1 whitespace-nowrap">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={`inline-flex h-6 items-center justify-center border border-bg-tertiary rounded-md px-1.5 text-xs font-bold leading-none shrink-0 whitespace-nowrap transition-colors ${
                        activeFilter === tab
                          ? "bg-bg-tertiary-solid text-text-primary"
                          : "text-text-secondary hover:bg-bg-tertiary focus:bg-bg-tertiary"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-bg-primary to-transparent" />
              </div>
            )}

            {/* Content area */}
            {activeNav === "Leaderboard" ? (
              <div className="flex-1 min-h-0 overflow-hidden">
                <Leaderboard
                  onSelectWallet={(wallet) =>
                    console.log("Selected wallet:", wallet)
                  }
                />
              </div>
            ) : activeNav === "Tokens" ? (
              <>
                <div
                  className={`flex flex-1 flex-col pt-1 overflow-y-scroll overflow-x-hidden px-2 min-h-0 gap-px`}
                  ref={scrollContainerRef}
                >
                  {activeFilter === "Crypto" && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-bg-secondary mb-1">
                      <FiStar
                        size={12}
                        className="text-accent-primary shrink-0"
                      />
                      <span className="text-xs">
                        <span className="text-accent-primary font-bold">
                          Lowest fees
                        </span>
                        <span className="text-text-secondary">
                          {" "}
                          on blue chip tokens
                        </span>
                      </span>
                    </div>
                  )}
                  {activeFilter === "Graduated" && (
                    <div className="flex items-start gap-2 p-2.5 mb-1 rounded-lg bg-yellow-900/20 text-xs text-text-primary/60">
                      <FiAlertTriangle
                        size={16}
                        className="mt-0.5 shrink-0 text-yellow-500"
                      />
                      <span className="flex-1">
                        <span className="text-yellow-500 text-sm font-bold flex">
                          Trade with caution
                        </span>
                        Newly graduated tokens are highly volatile. Tokens can
                        be launched by anyone, including bad actors.
                      </span>
                      <button className="shrink-0 mt-0.5 hover:opacity-80 cursor-pointer">
                        <FiX size={14} className="text-text-tertiary" />
                      </button>
                    </div>
                  )}
                  {activeFilter === "Bonding" && (
                    <div className="flex items-start gap-2 p-2.5 mb-1 rounded-lg bg-yellow-900/20 text-xs text-text-primary/60">
                      <FiAlertTriangle
                        size={16}
                        className="mt-0.5 shrink-0 text-yellow-500"
                      />
                      <span className="flex-1">
                        <span className="text-yellow-500 text-sm font-bold flex">
                          Trade with caution
                        </span>
                        Bonding tokens are amazing but may never graduate.
                        Tokens can be launched by anyone, including bad actors.
                      </span>
                      <button className="shrink-0 mt-0.5 hover:opacity-80 cursor-pointer">
                        <FiX size={14} className="text-text-tertiary" />
                      </button>
                    </div>
                  )}
                  {displayTokens.slice(0, 25).map((token, index) => {
                    const isSelected = selectedAddress === token.address;
                    const isCopied = copiedAddress === token.address;
                    const isCrypto = activeFilter === "Crypto";
                    const isGraduated = activeFilter === "Graduated";
                    const isBonding = activeFilter === "Bonding";
                    return (
                      <HoverCard.Root
                        key={`${token.address || "unknown"}-${index}`}
                        openDelay={300}
                        closeDelay={100}
                      >
                        <HoverCard.Trigger asChild>
                          <div className="grid transition-[grid-template-rows,opacity] duration-150 ease-out grid-rows-[1fr] opacity-100">
                            <div className="overflow-hidden">
                              <a
                                onClick={(e) => {
                                  e.preventDefault();
                                  onSelect(token);
                                }}
                                href="#"
                                className={`flex items-center gap-3 p-2 py-2 rounded-lg cursor-pointer group min-w-0 transition-colors ${
                                  isSelected
                                    ? "bg-bg-tertiary-solid"
                                    : "hover:bg-bg-tertiary focus-visible:bg-bg-tertiary"
                                }`}
                              >
                                <div
                                  className="relative shrink-0"
                                  style={{ width: 36, height: 36 }}
                                >
                                  <TokenLogo token={token} size={36} />
                                  {isGraduated || isBonding ? (
                                    <div
                                      className="absolute"
                                      style={{ bottom: -1, right: -1 }}
                                    >
                                      <div
                                        className="rounded-full bg-bg-primary flex items-center justify-center overflow-hidden shrink-0"
                                        style={{ width: 18, height: 18 }}
                                      >
                                        {token.dex ? (
                                          <Image
                                            alt={token.dex}
                                            width={14}
                                            height={14}
                                            className="rounded-full"
                                            src={getDexIcon(token.dex)}
                                            onError={(e) => {
                                              (
                                                e.target as HTMLImageElement
                                              ).style.display = "none";
                                            }}
                                          />
                                        ) : (
                                          <div className="w-3.5 h-3.5 rounded-full bg-bg-tertiary-solid" />
                                        )}
                                      </div>
                                    </div>
                                  ) : isCrypto ? (
                                    <div
                                      className="absolute flex items-center justify-center"
                                      style={{ bottom: -3, right: -3 }}
                                    >
                                      <HiMiniCheckBadge
                                        size={16}
                                        className="text-violet-500"
                                      />
                                    </div>
                                  ) : (
                                    (verifiedSet.has(token.address) ||
                                      (token as any).isVerified) && (
                                      <div
                                        className="absolute flex items-center justify-center"
                                        style={{ bottom: -3, right: -3 }}
                                      >
                                        <HiMiniCheckBadge
                                          size={16}
                                          className="text-blue-500"
                                        />
                                      </div>
                                    )
                                  )}
                                  {(verifiedSet.has(token.address) ||
                                    (token as any).isVerified) &&
                                    (isCrypto || isGraduated || isBonding) && (
                                      <div
                                        className="absolute"
                                        style={{ bottom: -1, left: -1 }}
                                      >
                                        <HiMiniCheckBadge
                                          size={16}
                                          className="text-blue-500"
                                        />
                                      </div>
                                    )}
                                </div>
                                {isGraduated ? (
                                  <>
                                    <div className="flex flex-col flex-1 min-w-0 gap-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-sm leading-4 truncate">
                                          {token.symbol}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green">
                                          <FaLeaf
                                            size={10}
                                            className="text-green"
                                          />
                                          {token.age || "--"}
                                        </span>
                                      </div>
                                      <div
                                        className="flex gap-1.5 items-center text-xs text-text-secondary"
                                        translate="no"
                                      >
                                        {formatMarketCap(token.volume24h)} Vol
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5 items-end tabular-nums shrink-0">
                                      <div
                                        className="text-sm leading-4"
                                        translate="no"
                                      >
                                        <span>
                                          {formatMarketCap(token.marketCap)}
                                        </span>{" "}
                                        MC
                                      </div>
                                      <div
                                        className="flex gap-0.75 items-center"
                                        style={{ lineHeight: "16px" }}
                                      >
                                        <div
                                          style={{
                                            color:
                                              token.priceChange24h >= 0
                                                ? "rgb(33,201,94)"
                                                : "rgb(255,98,46)",
                                            fontWeight: 400,
                                            fontSize: 6,
                                          }}
                                        >
                                          {token.priceChange24h >= 0
                                            ? "▲"
                                            : "▼"}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 12,
                                            fontWeight: 500,
                                            color:
                                              token.priceChange24h >= 0
                                                ? "rgb(33,201,94)"
                                                : "rgb(255,98,46)",
                                          }}
                                        >
                                          {Math.abs(
                                            token.priceChange24h,
                                          ).toFixed(2)}
                                          %
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                ) : isBonding ? (
                                  <>
                                    <div className="flex flex-col flex-1 min-w-0 gap-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-sm leading-4 truncate">
                                          {token.symbol}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green">
                                          <FaLeaf
                                            size={10}
                                            className="text-green"
                                          />
                                          {token.age || "--"}
                                        </span>
                                      </div>
                                      <div
                                        className="flex gap-1.5 items-center text-xs text-text-secondary"
                                        translate="no"
                                      >
                                        {formatMarketCap(token.volume24h)} Vol
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5 items-end tabular-nums shrink-0">
                                      <div
                                        className="text-sm leading-4"
                                        translate="no"
                                      >
                                        <span>
                                          {formatMarketCap(token.marketCap)}
                                        </span>{" "}
                                        MC
                                      </div>
                                      <div
                                        className="flex gap-1.5 items-center"
                                        translate="no"
                                      >
                                        <span className="relative h-1 w-12 rounded-full overflow-hidden bg-bg-tertiary">
                                          <span
                                            className="absolute inset-y-0 left-0 rounded-full transition-all"
                                            style={{
                                              width: `${token.bonding || 0}%`,
                                              backgroundColor:
                                                (token.bonding || 0) >= 80
                                                  ? "rgb(33,201,94)"
                                                  : (token.bonding || 0) >= 50
                                                    ? "rgb(234,179,8)"
                                                    : "rgb(255,98,46)",
                                            }}
                                          />
                                        </span>
                                        <span
                                          className="text-xs font-medium"
                                          style={{
                                            color:
                                              (token.bonding || 0) >= 80
                                                ? "rgb(33,201,94)"
                                                : (token.bonding || 0) >= 50
                                                  ? "rgb(234,179,8)"
                                                  : "rgb(255,98,46)",
                                          }}
                                        >
                                          {token.bonding || 0}%
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex flex-col flex-1 min-w-0 gap-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-sm leading-4 truncate">
                                          {token.symbol}
                                        </span>
                                      </div>
                                      <div className="flex gap-1.5 items-center text-xs text-text-secondary">
                                        {isCrypto
                                          ? `${formatMarketCap(token.marketCap)} MC`
                                          : formatPrice(token.price)}
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5 items-end tabular-nums shrink-0">
                                      <div className="text-sm leading-4">
                                        {isCrypto ? (
                                          <span>
                                            {formatPrice(token.price)}
                                          </span>
                                        ) : (
                                          <span>
                                            <span>
                                              {formatMarketCap(token.marketCap)}
                                            </span>{" "}
                                            MC
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        className="flex gap-0.75 items-center"
                                        style={{ lineHeight: "16px" }}
                                      >
                                        <div
                                          style={{
                                            color:
                                              token.priceChange24h >= 0
                                                ? "rgb(33,201,94)"
                                                : "rgb(255,98,46)",
                                            fontWeight: 400,
                                            fontSize: 6,
                                          }}
                                        >
                                          {token.priceChange24h >= 0
                                            ? "▲"
                                            : "▼"}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 12,
                                            fontWeight: 500,
                                            color:
                                              token.priceChange24h >= 0
                                                ? "rgb(33,201,94)"
                                                : "rgb(255,98,46)",
                                          }}
                                        >
                                          {Math.abs(
                                            token.priceChange24h,
                                          ).toFixed(2)}
                                          %
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </a>
                            </div>
                          </div>
                        </HoverCard.Trigger>
                        <HoverCard.Portal>
                          <HoverCard.Content
                            side="right"
                            align="center"
                            sideOffset={8}
                            className="z-50 rounded-2xl border text-text-primary outline-hidden w-70 bg-bg-secondary border-bg-tertiary shadow-xl p-3"
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <div
                                  className="relative shrink-0"
                                  style={{ width: 40, height: 40 }}
                                >
                                  {token.logoURI ? (
                                    <Image
                                      className="rounded-full border border-bg-tertiary"
                                      src={token.logoURI}
                                      width={40}
                                      height={40}
                                      unoptimized
                                      style={{ height: 40, width: 40 }}
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                      alt={token.address}
                                    />
                                  ) : null}
                                  {!token.logoURI && (
                                    <div
                                      className="rounded-full border border-bg-tertiary bg-bg-tertiary-solid text-text-tertiary flex items-center justify-center"
                                      style={{
                                        height: 40,
                                        width: 40,
                                        fontSize: 18,
                                      }}
                                    >
                                      {(token.symbol || "?").charAt(0)}
                                    </div>
                                  )}
                                  {isGraduated || isBonding ? (
                                    <div
                                      className="absolute"
                                      style={{ bottom: -4, right: -4 }}
                                    >
                                      <div
                                        className="rounded-full bg-bg-primary flex items-center justify-center overflow-hidden shrink-0"
                                        style={{ width: 20, height: 20 }}
                                      >
                                        {token.dex ? (
                                          <Image
                                            alt={token.dex}
                                            width={16}
                                            height={16}
                                            className="rounded-full"
                                            src={getDexIcon(token.dex)}
                                            onError={(e) => {
                                              (
                                                e.target as HTMLImageElement
                                              ).style.display = "none";
                                            }}
                                          />
                                        ) : (
                                          <div className="w-4 h-4 rounded-full bg-bg-tertiary-solid" />
                                        )}
                                      </div>
                                    </div>
                                  ) : isCrypto ? (
                                    <div
                                      className="absolute flex items-center justify-center"
                                      style={{ bottom: -4, right: -4 }}
                                    >
                                      <HiMiniCheckBadge
                                        size={18}
                                        className="text-violet-500"
                                      />
                                    </div>
                                  ) : (
                                    verifiedSet.has(token.address) && (
                                      <div
                                        className="absolute flex items-center justify-center"
                                        style={{ bottom: -4, right: -4 }}
                                      >
                                        <HiMiniCheckBadge
                                          size={18}
                                          className="text-blue-500"
                                        />
                                      </div>
                                    )
                                  )}
                                  {verifiedSet.has(token.address) &&
                                    (isGraduated || isBonding) && (
                                      <div
                                        className="absolute"
                                        style={{ bottom: -1, left: -1 }}
                                      >
                                        <HiMiniCheckBadge
                                          size={18}
                                          className="text-blue-500"
                                        />
                                      </div>
                                    )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (walletAddress) onToggleWatchlist(token);
                                  }}
                                  className={`transition-colors cursor-pointer ${watchlistAddresses.includes(token.address) ? "text-yellow-500" : "text-text-tertiary hover:text-text-primary"}`}
                                  tabIndex={-1}
                                >
                                  {watchlistAddresses.includes(
                                    token.address,
                                  ) ? (
                                    <FaStar size={20} />
                                  ) : (
                                    <FaRegStar size={20} />
                                  )}
                                </button>
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                  <div className="flex gap-2 items-center">
                                    <span className="text-sm" translate="no">
                                      {token.symbol}
                                    </span>
                                    <SiSolana
                                      size={16}
                                      className="shrink-0 text-text-secondary"
                                    />
                                  </div>
                                  <span
                                    className="text-sm tabular-nums"
                                    translate="no"
                                  >
                                    {formatMarketCap(token.marketCap)} MC
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span
                                    className="text-xs text-text-secondary"
                                    translate="no"
                                  >
                                    {token.name}
                                  </span>
                                  <div
                                    className="flex gap-0.75 items-center"
                                    translate="no"
                                    style={{ lineHeight: "16px" }}
                                  >
                                    <div
                                      style={{
                                        color:
                                          token.priceChange24h >= 0
                                            ? "rgb(33,201,94)"
                                            : "rgb(255,98,46)",
                                        fontWeight: 400,
                                        fontSize: 6,
                                      }}
                                    >
                                      {token.priceChange24h >= 0 ? "▲" : "▼"}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 400,
                                        color:
                                          token.priceChange24h >= 0
                                            ? "rgb(33,201,94)"
                                            : "rgb(255,98,46)",
                                      }}
                                    >
                                      {Math.abs(token.priceChange24h).toFixed(
                                        2,
                                      )}
                                      %
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 py-1">
                                  <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">
                                    Volume 24hr
                                  </span>
                                  <div className="flex-1 border-b border-dashed border-bg-tertiary min-w-4 -translate-y-px" />
                                  <span
                                    className="text-xs text-text-primary whitespace-nowrap shrink-0"
                                    translate="no"
                                  >
                                    {formatMarketCap(token.volume24h)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 py-1">
                                  <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">
                                    Holders
                                  </span>
                                  <div className="flex-1 border-b border-dashed border-bg-tertiary min-w-4 -translate-y-px" />
                                  <span
                                    className="text-xs text-text-primary whitespace-nowrap shrink-0"
                                    translate="no"
                                  >
                                    --
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 py-1">
                                  <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">
                                    Top 10 holding
                                  </span>
                                  <div className="flex-1 border-b border-dashed border-bg-tertiary min-w-4 -translate-y-px" />
                                  <span
                                    className="text-xs text-text-primary whitespace-nowrap shrink-0"
                                    translate="no"
                                  >
                                    --
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 py-1">
                                  <span className="text-xs text-text-secondary whitespace-nowrap shrink-0">
                                    Contract
                                  </span>
                                  <div className="flex-1 border-b border-dashed border-bg-tertiary min-w-4 -translate-y-px" />
                                  <span
                                    className="text-xs text-text-primary whitespace-nowrap shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                                    translate="no"
                                  >
                                    {shortenAddress(token.address, 5)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(token.address)}
                                    className="shrink-0 hover:opacity-70 transition-opacity cursor-pointer relative w-4 h-4 flex items-center justify-center"
                                    aria-label="Copy Contract"
                                    tabIndex={-1}
                                  >
                                    <FiCopy
                                      size={16}
                                      className={`text-text-tertiary absolute transition-all duration-200 ${
                                        isCopied
                                          ? "opacity-0 scale-0 rotate-90"
                                          : "opacity-100 scale-100 rotate-0"
                                      }`}
                                    />
                                    <IoCheckmarkCircle
                                      size={16}
                                      className={`text-green-500 absolute transition-all duration-200 ${
                                        isCopied
                                          ? "opacity-100 scale-100 rotate-0"
                                          : "opacity-0 scale-0 -rotate-90"
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </HoverCard.Content>
                        </HoverCard.Portal>
                      </HoverCard.Root>
                    );
                  })}

                  {isLoading && tokens.length === 0 && (
                    <div className="px-2 py-4">
                      <div className="animate-pulse space-y-2">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="h-12 bg-bg-tertiary rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {!isLoading && tokens.length === 0 && (
                    <div className="px-4 py-10 text-center">
                      <div className="text-sm font-semibold text-text-primary">
                        Live tokens unavailable
                      </div>
                      <div className="mt-2 text-xs leading-5 text-text-tertiary">
                        Connect BirdEye to load real-time Solana market data.
                      </div>
                    </div>
                  )}
                </div>

                {afterList}
              </>
            ) : activeNav === "Feed" ? (
              <div className="flex-1 flex flex-col p-2 gap-2 overflow-y-auto min-h-0">
                <FeedActivityList />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
                {activeNav === "Alerts" ? "Alerts coming soon" : ""}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
