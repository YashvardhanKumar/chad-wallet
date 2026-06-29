'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

interface TradingViewWidgetProps {
  tokenAddress: string;
  tokenSymbol: string;
  priceHistory: any[];
  trades?: any[];
  onChartInit?: (chart: any, series: any) => void;
}

function TradingViewWidget({
  priceHistory,
  trades,
  onChartInit,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  // 1. Initialize Chart once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = '';

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#060510' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: 'rgba(156, 163, 175, 0.05)' },
        horzLines: { color: 'rgba(156, 163, 175, 0.05)' },
      },
      crosshair: {
        mode: 1, // Magnet mode
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      width: containerRef.current.clientWidth || 600,
      height: containerRef.current.clientHeight || 380,
    });

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    if (onChartInit) {
      onChartInit(chart, series);
    }

    // Set up ResizeObserver to scale chart canvas on parent/panel dimensions change
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (chartRef.current) {
        chartRef.current.resize(width, height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChartInit]); // Rely on stable onChartInit callback reference

  // 2. Dynamically set series data when priceHistory changes, avoiding chart recreation
  useEffect(() => {
    if (seriesRef.current && priceHistory.length > 0) {
      seriesRef.current.setData(priceHistory);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [priceHistory]);

  // 3. Update series markers when trades/swaps change
  useEffect(() => {
    if (seriesRef.current && priceHistory.length > 0 && trades && trades.length > 0) {
      const chartMarkers = trades
        .map((t) => {
          // Snap the trade block time to the nearest candle time
          let closestCandleTime = t.unixTime;
          let minDiff = Infinity;
          priceHistory.forEach((candle) => {
            const diff = Math.abs(candle.time - t.unixTime);
            if (diff < minDiff) {
              minDiff = diff;
              closestCandleTime = candle.time;
            }
          });

          // Only plot if it matches reasonably close to a candle bar (within 2 hours)
          if (minDiff > 3600 * 2) return null;

          const isBuy = t.tradeType === 'BUY';
          return {
            time: closestCandleTime,
            position: isBuy ? 'belowBar' : 'aboveBar' as any,
            color: isBuy ? '#22c55e' : '#ef4444',
            shape: isBuy ? 'arrowUp' : 'arrowDown' as any,
            text: `${isBuy ? 'Buy' : 'Sell'} ${t.amount ? t.amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : ''}`,
          };
        })
        .filter(Boolean);

      // Sort markers by time ascending to prevent rendering glitches
      chartMarkers.sort((a, b) => (a?.time || 0) - (b?.time || 0));

      seriesRef.current.setMarkers(chartMarkers);
    } else if (seriesRef.current) {
      seriesRef.current.setMarkers([]);
    }
  }, [priceHistory, trades]);

  return <div ref={containerRef} className="w-full h-full bg-[#060510]" />;
}

export default React.memo(TradingViewWidget);
