## Agentic BTC Strategist

Autonomous 15-minute Bitcoin strategy that merges Binance BTC/USDT and Coinbase BTC/USD candles, evaluates your custom parameters, and keeps nudging them using a lightweight learning loop.

### Highlights

- Dual exchange ingestion via the `/api/prices` route with resilient fetch timeouts
- Configurable moving-average spread, risk sizing, and learning rate
- Auto-learning toggle that persists alongside manual overrides in `localStorage`
- Live analytics: cumulative return, win rate, drawdown, equity sparkline, and real-time spreads
- Responsive dashboard ready for Vercel deployment with no server state required

### Develop

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to watch the agent update every minute. Use the **Refresh now** button for an immediate sync, or tweak the controls and allow the auto-learner to explore the parameter space.

### Production

```bash
npm run build
npm start
```

Follow with the provided Vercel deployment command when you're satisfied with local test results.
