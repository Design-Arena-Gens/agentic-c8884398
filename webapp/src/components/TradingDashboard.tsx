"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { defaultConfig, runStrategy } from "@/lib/strategyEngine";
import type {
  AgentMetrics,
  MergedCandle,
  StrategyConfig,
} from "@/lib/types";

import { MetricsPanel } from "./MetricsPanel";
import { StrategyControls } from "./StrategyControls";

type ApiResponse = {
  candles: MergedCandle[];
  fetchedAt: number;
  sources: {
    binance: number;
    coinbase: number;
  };
};

const STORAGE_KEY = "agentic-config";

const loadConfig = (): StrategyConfig => {
  if (typeof window === "undefined") {
    return defaultConfig;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig;
    const parsed = JSON.parse(raw) as StrategyConfig;
    return {
      ...defaultConfig,
      ...parsed,
    };
  } catch {
    return defaultConfig;
  }
};

export const TradingDashboard = () => {
  const [candles, setCandles] = useState<MergedCandle[]>([]);
  const [config, setConfig] = useState<StrategyConfig>(defaultConfig);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [autoLearn, setAutoLearn] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadConfig();
    setConfig(saved);
  }, []);

  const configRef = useRef<StrategyConfig>(defaultConfig);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
    configRef.current = config;
  }, [config]);

  const evaluateStrategy = useCallback(
    (data: MergedCandle[]) => {
      const { metrics: evaluated, updatedConfig } = runStrategy(
        data,
        configRef.current,
      );
      setMetrics(evaluated);
      if (autoLearn) {
        setConfig(updatedConfig);
        configRef.current = updatedConfig;
      }
    },
    [autoLearn],
  );

  const fetchPrices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/prices", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load prices.");
      }
      setCandles(payload.candles);
      setLastUpdated(payload.fetchedAt);
      evaluateStrategy(payload.candles);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [evaluateStrategy]);

  useEffect(() => {
    fetchPrices().catch(() => {
      setError("Unable to reach pricing API.");
    });
    const interval = setInterval(fetchPrices, 60_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const latest = useMemo(() => candles.at(-1) ?? null, [candles]);
  const previous = useMemo(
    () => (candles.length > 1 ? candles[candles.length - 2] : null),
    [candles],
  );

  const priceDirection = useMemo(() => {
    if (!latest || !previous) return 0;
    const diff = latest.midPrice - previous.midPrice;
    return diff === 0 ? 0 : diff > 0 ? 1 : -1;
  }, [latest, previous]);

  return (
    <div className="stack">
      <header className="hero">
        <div>
          <h1>Adaptive BTC/USDT Trader</h1>
          <p>
            Autonomous 15-minute strategy that fuses Binance and Coinbase prices,
            tracks live performance, and keeps tuning itself after every cycle.
          </p>
        </div>
        <div className={`ticker ${priceDirection === 1 ? "up" : priceDirection === -1 ? "down" : ""}`}>
          <p className="label">Mid Price</p>
          <p className="value">
            {latest ? latest.midPrice.toFixed(2) : "—"}
          </p>
          <p className="muted">
            Spread: {latest ? latest.spread.toFixed(2) : "—"}
          </p>
          <p className="muted">{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "—"}</p>
        </div>
      </header>

      {error ? (
        <div className="error">
          <strong>Data feed error:</strong> {error}
        </div>
      ) : null}

      <div className="grid">
        <StrategyControls
          config={config}
          onConfigChange={setConfig}
          autoLearn={autoLearn}
          onToggleAutoLearn={setAutoLearn}
        />
        <MetricsPanel metrics={metrics} />
      </div>

      <section className="panel">
        <header className="panelHead">
          <h2>Recent Candles</h2>
          <button
            type="button"
            className="refresh"
            disabled={isLoading}
            onClick={() => fetchPrices()}
          >
            {isLoading ? "Refreshing…" : "Refresh now"}
          </button>
        </header>
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Binance Close</th>
                <th>Coinbase Close</th>
                <th>Mid</th>
                <th>Spread</th>
              </tr>
            </thead>
            <tbody>
              {candles
                .slice(-20)
                .reverse()
                .map((candle) => (
                  <tr key={candle.timestamp}>
                    <td>{new Date(candle.timestamp).toLocaleTimeString()}</td>
                    <td>
                      {candle.binance
                        ? candle.binance.close.toFixed(2)
                        : "—"}
                    </td>
                    <td>
                      {candle.coinbase
                        ? candle.coinbase.close.toFixed(2)
                        : "—"}
                    </td>
                    <td>{candle.midPrice.toFixed(2)}</td>
                    <td>{candle.spread.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
