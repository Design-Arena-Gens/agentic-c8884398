import { NextResponse } from "next/server";

import type { MergedCandle, PricePoint } from "@/lib/types";

const BINANCE_ENDPOINT =
  "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=200";
const COINBASE_ENDPOINT =
  "https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=900";

const fetchWithTimeout = async (resource: string, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(resource, {
      signal: controller.signal,
      headers: {
        "User-Agent": "agentic-strategy-bot/1.0",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const parseBinance = (rows: unknown): PricePoint[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (!Array.isArray(row) || row.length < 6) return null;
      const [
        openTime,
        open,
        high,
        low,
        close,
        volume,
      ] = row as [
        number,
        string,
        string,
        string,
        string,
        string,
        ...unknown[]
      ];
      return {
        timestamp: Number(openTime),
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume),
      };
    })
    .filter(Boolean) as PricePoint[];
};

const parseCoinbase = (rows: unknown): PricePoint[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (!Array.isArray(row) || row.length < 6) return null;
      const [time, low, high, open, close, volume] = row as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      return {
        timestamp: time * 1000,
        open,
        high,
        low,
        close,
        volume,
      };
    })
    .filter(Boolean) as PricePoint[];
};

const mergeCandles = (
  binance: PricePoint[],
  coinbase: PricePoint[],
): MergedCandle[] => {
  const index = new Map<number, Partial<MergedCandle>>();

  binance.forEach((candle) => {
    index.set(candle.timestamp, {
      timestamp: candle.timestamp,
      binance: candle,
      coinbase: null,
      midPrice: candle.close,
      spread: 0,
    });
  });

  coinbase.forEach((candle) => {
    const existing = index.get(candle.timestamp);
    if (existing) {
      const binanceClose = existing.binance?.close ?? candle.close;
      const coinbaseClose = candle.close;
      const midPrice = (binanceClose + coinbaseClose) / 2;
      index.set(candle.timestamp, {
        timestamp: candle.timestamp,
        binance: existing.binance ?? null,
        coinbase: candle,
        midPrice,
        spread: Math.abs(binanceClose - coinbaseClose),
      });
    } else {
      index.set(candle.timestamp, {
        timestamp: candle.timestamp,
        binance: null,
        coinbase: candle,
        midPrice: candle.close,
        spread: 0,
      });
    }
  });

  return Array.from(index.values())
    .filter((value): value is MergedCandle => Boolean(value.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);
};

export const revalidate = 0;

export async function GET() {
  try {
    const [binanceRaw, coinbaseRaw] = await Promise.all([
      fetchWithTimeout(BINANCE_ENDPOINT),
      fetchWithTimeout(COINBASE_ENDPOINT),
    ]);

    const binance = parseBinance(binanceRaw);
    const coinbase = parseCoinbase(coinbaseRaw);
    const candles = mergeCandles(binance, coinbase);

    return NextResponse.json({
      candles,
      fetchedAt: Date.now(),
      sources: {
        binance: binance.length,
        coinbase: coinbase.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message ?? "Failed to fetch market data",
      },
      { status: 500 },
    );
  }
}
