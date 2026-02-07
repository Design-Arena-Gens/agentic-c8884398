import type { FC } from "react";
import type { AgentMetrics } from "@/lib/types";
import { Sparkline } from "./Sparkline";

type MetricsPanelProps = {
  metrics: AgentMetrics | null;
};

const formatPct = (value: number) =>
  `${(value * 100).toFixed(2)}%`;

export const MetricsPanel: FC<MetricsPanelProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <section className="panel">
        <header className="panelHead">
          <h2>Performance</h2>
        </header>
        <p className="muted">Waiting for strategy evaluation…</p>
      </section>
    );
  }

  const winRate =
    metrics.trades === 0 ? 0 : metrics.wins / metrics.trades;

  return (
    <section className="panel">
      <header className="panelHead">
        <h2>Performance</h2>
        <span className={`pill ${metrics.cumulativeReturn >= 0 ? "good" : "bad"}`}>
          {formatPct(metrics.cumulativeReturn)}
        </span>
      </header>
      <div className="metricsGrid">
        <div>
          <p className="label">Trades</p>
          <p className="value">{metrics.trades}</p>
        </div>
        <div>
          <p className="label">Win Rate</p>
          <p className="value">{formatPct(winRate)}</p>
        </div>
        <div>
          <p className="label">Max Drawdown</p>
          <p className="value">{formatPct(metrics.maxDrawdown)}</p>
        </div>
        <div>
          <p className="label">Wins / Losses</p>
          <p className="value">
            {metrics.wins} / {metrics.losses}
          </p>
        </div>
      </div>
      <div className="chart">
        <Sparkline data={metrics.equityCurve} />
      </div>
    </section>
  );
};
