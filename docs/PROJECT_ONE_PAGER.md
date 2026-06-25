# ChadWallet — Project One-Pager

> A non-custodial Solana memecoin trading platform built with AI pair programming.

---

## 1. Design & Architecture

### What It Is

ChadWallet is a **web-based Solana trading dashboard** that lets anyone discover, swap, and track memecoins from a single interface — no browser extension required. Users sign in with Google, get an embedded Solana wallet instantly, and start trading in under 30 seconds.

### GitHub

A private repository. The project lives at `chad-wallet` on the local machine.

---

### How It Works (Under the Hood)

The app follows a client-server architecture where the browser handles all UI and transaction signing, while Next.js API routes proxy external data sources:

```
┌────────────────────────────────────────────────────────────────┐
│                      BROWSER (Client)                          │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │  Landing Page │  │   Dashboard  │  │   Trade Panel    │     │
│  │  (marketing)  │  │  Orchestrator│  │  Jupiter Swap    │     │
│  └──────────────┘  └──────┬───────┘  └────────┬─────────┘     │
│                           │                    │               │
│                    ┌──────▼───────┐    ┌───────▼──────────┐   │
│                    │  TokenInfo   │    │  Portfolio        │   │
│                    │  (Chart +    │    │  (Holdings/P&L)   │   │
│                    │   Trades)    │    └──────────────────┘   │
│                    └──────────────┘                           │
│                           │                                   │
│              ┌────────────┼────────────┐                     │
│              ▼            ▼            ▼                     │
│          Privy SDK    Supabase     Solana RPC                │
│         (Auth + Tx)   (DB)       (Balances)                  │
│              │            │            │                      │
└──────────────┼────────────┼────────────┼──────────────────────┘
               │            │            │
         ┌─────▼──────┐ ┌──▼───┐  ┌────▼──────┐
         │  Jupiter   │ │Supabase│  │ Solana    │
         │  Swap API  │ │Server  │  │ RPC Node  │
         └────────────┘ └───────┘  └───────────┘
               │
         ┌─────▼──────┐
         │  BirdEye   │
         │  Data API  │
         └────────────┘
```

**The swap flow end-to-end:**

1. User enters an amount and clicks Buy/Sell in the Trade Panel
2. The panel fetches a **Jupiter quote** (`/swap/v1/quote`) with 0.5% slippage
3. Jupiter returns a **swap transaction** (`/swap/v1/swap`) as a base64-encoded legacy transaction
4. The transaction is deserialized to a `Uint8Array` and passed to **Privy's `signAndSendTransaction`**
5. Privy opens a browser popup for the user to review and approve
6. On approval, the transaction lands on-chain; the signature (a `Uint8Array`) is manually **base58-encoded** to produce a human-readable tx hash
7. A **success modal** appears with a Solscan link, and the trade is saved to **Supabase** (or `localStorage` as fallback)
8. On failure, the app **re-fetches SOL and token balances** to determine if the issue was insufficient funds → shows the appropriate error modal

**Data sources powering the UI:**

| Data | Source | How |
|------|--------|-----|
| Trending tokens | BirdEye → `/api/tokens` proxy | Filtered to ≥ $100 liquidity/volume |
| Price history | BirdEye → `/api/history` proxy | OHLCV, mapped to candlestick chart |
| Live trades | BirdEye → `/api/trades` proxy | Recent swaps for any token |
| Token search | BirdEye → `/api/search` proxy | 200ms debounced client-side |
| SOL/token balances | Solana RPC | Polled every 15 seconds |
| Transaction execution | Jupiter API + Privy | Quote → swap tx → sign → send |
| User/trade persistence | Supabase (with localStorage fallback) | Table-not-found detection for graceful degradation |

### Design System

The app uses a custom **dark glassmorphism** design system:

- **Background:** Deep space (`#060510`) with layered glass surfaces (`rgba(255,255,255,0.04)`)
- **Accent:** Lime green (`#cf0`) for the ChadWallet brand, used in price-up indicators and loading glows
- **Accent evolution (planned):** Emerald (`#10B981`) for primary CTAs, Indigo (`#6366F1`) for secondary actions
- **Typography:** Inter (headings/body), JetBrains Mono (addresses/prices) — full scale from 12px micro to 64px display
- **Key animations:** Marquee token ticker, floating astronaut, smooth scrolling fade-in, glass hover effects

---

## 2. AI Tools Used

| Tool | Role | What It Did |
|------|------|-------------|
| **Antigravity** | Primary AI pair programmer | Wrote ~90% of the codebase: all React components, API routes, utility functions, CSS system. Drove the architecture decisions and integration logic. |
| **OpenCode** | Secondary AI code generation & review | Assisted with code reviews, edge case handling, and structural improvements. Provided the AGENTS.md guardrails and development guidelines. |

### Time Breakdown (~10–12 hours total)

| Phase | Time | What Was Built |
|-------|------|----------------|
| Project scaffolding & config | ~1 hr | Next.js 16 setup, Tailwind v4, environment variables, tsconfig |
| Auth & wallet integration | ~2 hrs | Privy provider configuration, `providers.tsx`, wallet creation flow, auth redirect |
| Dashboard layout & state | ~1.5 hrs | `TradingDashboard.tsx` orchestrator, responsive three-column layout, mobile tab bar |
| Swap engine (TradePanel) | ~2.5 hrs | Jupiter API integration, quote/swap flow, error recovery system, balance polling |
| Chart & token info (TokenInfo) | ~1.5 hrs | `lightweight-charts` candlestick setup, time range controls, chart markers |
| Portfolio & P&L | ~1 hr | RPC-based holdings calculation, on-chain balance verification, trade history display |
| API routes & BirdEye | ~1 hr | 5 API proxy routes, data normalization, spam filtering |
| Landing page | ~1 hr | Hero section, feature grid, app showcase, CTA, footer, animations |
| Supabase & persistence | ~0.5 hr | Database schema, tradeHistory CRUD, localStorage fallback |
| Polish & debugging | ~1 hr | Mobile responsiveness, error states, loading skeletons, edge cases |

---

## 3. Issues Faced & How We Fixed Them

### Issue #1: Testing Buy/Sell on Solana Mainnet

**The problem:** The swap flow involves real SOL and real tokens on mainnet. Every test transaction costs real money in fees (~0.000005 SOL per swap). We needed to verify the full pipeline — getting a quote, constructing the swap transaction, signing it via Privy, submitting it, and confirming it landed — without draining the test wallet.

**How we fixed it:**
- Used a dedicated test wallet with a small amount of SOL (~0.1 SOL) for testing
- Tested with low-value tokens (trading SOL → tiny memecoins and back) to minimize financial risk
- Implemented the **error recovery system**: after any failed swap, the code re-fetches SOL and token balances to determine the exact failure reason:
  - If SOL < 0.005 → insufficient gas → "Fund your wallet" modal
  - If token balance < required amount → "Insufficient token balance" modal
  - If user rejected in popup → silent exit (no error shown)
  - Generic error → "Transaction failed" modal
- Added `skipPreflight: true` to avoid simulation failures blocking legitimate edge-case transactions
- Added modal state machine to give visual feedback for each outcome path

### Issue #2: Connecting Jupiter API

**The problem:** Jupiter's swap API has a multi-step flow (get quote → get swap transaction → submit) with many configuration options. Key challenges:
- Embedded wallets (Privy) need **legacy transactions** (`asLegacyTransaction: true`) — Jupiter defaults to versioned transactions with Address Lookup Tables (ALTs), but Privy's embedded wallet doesn't parse ALTs correctly
- The API returns the swap transaction as a **base64 string**, which needed to be decoded to `Uint8Array` for Privy
- The transaction signature comes back as `Uint8Array`, requiring manual **base58 encoding** to produce a human-readable signature for Solscan links

**How we fixed it:**
- Forced legacy transactions by passing `asLegacyTransaction: true` and `dynamicComputeUnitLimit: true` in the swap request body
- Added `wrapAndUnwrapSol: true` so SOL is automatically wrapped to wSOL on buys and unwrapped on sells
- Implemented a custom `encodeBase58()` function — a BigInt-based division algorithm that processes the `Uint8Array` signature byte-by-byte, dividing by 58 to produce the base58 character mapping. We chose this over importing the `bs58` library to keep the bundle lean:
  ```
  For each byte: result = result * 256 + byte
  Then repeatedly: remainder = result % 58, result = result / 58
  Map remainders to base58 alphabet, pad leading zeros as '1's
  ```
- Slippage set to 50 bps (0.5%) — tight enough to prevent MEV sandwich attacks, loose enough for memecoin volatility
- Added `prioritizationFeeLamports` estimation via Jupiter's priority fee API and a manual override field in the quote request

### Issue #3: Connecting the Wallet with the App

**The problem:** Privy's embedded wallet integration required careful coordination between:
- Creating the wallet on login (`createOnLogin: 'all-users'`)
- Waiting for the wallet to be ready before attempting to transact
- Making the wallet's public key available to the TradePanel for balance queries and swap construction
- Handling the case where a user has no wallet yet (fresh login before wallet creation completes)

**How we fixed it:**
- In `providers.tsx`: configured embedded wallets with `createOnLogin: 'all-users'` and passed the Solana RPC configuration directly into Privy's `rpcs` config
- In `TradingDashboard.tsx`: added `upsertUser()` call that syncs the Privy user's identity (`privy_did`, `wallet_address`) to Supabase on every auth state change
- In `TradePanel.tsx`: added **on-demand wallet creation** — if `wallets.length === 0` at swap time, it calls `createWallet()` and waits for the result before proceeding:
  ```
  if (wallets.length === 0) {
    const created = await createWallet();
    wallet = created as ConnectedStandardSolanaWallet;
  }
  ```
- Balance polling: separate `useEffect` fetches SOL and token balances every 15 seconds via raw RPC calls (`getBalance`, `getTokenAccountsByOwner`), updating the UI even if the user funds their wallet externally
- Added the wallet address display in the trade panel header with a **copy-to-clipboard** button so users can easily fund their embedded wallet from an external source

### Issue #4: Supabase Table-Not-Found Graceful Degradation

**The problem:** The app should work even if the Supabase tables haven't been created yet. We needed to detect when tables are missing and fall back to `localStorage` without crashing.

**Fix:** Added `isTableNotFound()` helper that checks for both PostgREST error code `PGRST205` and the string "Could not find the table" — when detected, the code silently falls back to `localStorage` CRUD operations.

### Issue #5: Tiny Token Price Display

**The problem:** Memecoin prices are often $0.000000001 or smaller. Standard number formatting shows "0.000000001" (unreadable) or scientific notation.

**Fix:** Custom `formatPrice()` with subscript notation for values under 0.0001: counts leading zeros, displays them as subscript text — e.g., `$0.0₍₈₎1` instead of `$0.000000001`.

---

## 4. Design Improvements

These are structural and visual improvements — code architecture is intentionally excluded.

### Information Architecture

- **Current:** The landing page is a linear scroll with no clear narrative hierarchy. Features, showcase, and CTA compete for attention.
- **Improvement:** Restructure into a storytelling funnel: **Hook → Trust → Educate → Prove → Convert**. Each section has one job:
  1. Hero: value proposition in one glance (no mascot, just product + stats)
  2. Trust bar: "12K+ traders | $4.2M volume | 0.3s swaps"
  3. How It Works: 3 steps with visual aids
  4. Features: organized by pain point, not by feature
  5. Testimonials: real trades and social proof
  6. Comparison table: ChadWallet vs Phantom vs BullX
  7. CTA: single action, no distractions

### Visual Hierarchy

- **Current:** The lime-green accent (`#cf0`) is used everywhere — CTAs, borders, price indicators, loading states. No visual hierarchy between primary and secondary actions.
- **Improvement:** Introduce a two-tier accent system:
  - **Primary (Emerald `#10B981`):** CTAs, active states, positive price moves
  - **Secondary (Indigo `#6366F1`):** Info banners, secondary buttons, links
  - **Retain `#cf0`:** Only in the logo mark and subtle loading glows (brand heritage, not functional)
- **Problem:** Multiple floating animations (astronaut, circles, particles) compete for attention on the landing page
- **Fix:** One focal animation per viewport. The hero uses a subtle background gradient + static device mockup. The Bottom CTA removes the spinning circles in favor of a clean gradient edge.

### UX Flow Improvements

- **Current:** The auth redirect is abrupt — user logs in and is immediately pushed to `/trade` without any transition or explanation
- **Improvement:** Add a brief loading state between login and dashboard that shows "Setting up your wallet..." with a progress indicator. This sets expectations and handles the wallet creation latency.
- **Current:** No onboarding for first-time users landing on the dashboard — they see an empty token list if BirdEye isn't configured
- **Improvement:** Add a guided empty state: "Connect BirdEye to see trending tokens" with a setup step, or a demo mode that shows sample data
- **Current:** The portfolio P&L calculation only factors in buy trades (ignores partial sells), which gives inaccurate cost basis for active traders
- **Improvement:** Track sell amounts against buy history using FIFO or average-cost method for accurate P&L

### Mobile Experience

- **Current:** The bottom tab bar (Chart / Trade / Portfolio) works but the transition between tabs feels abrupt. The token list overlay has no gesture to dismiss.
- **Improvement:** Add swipe gestures between tabs (like a native app). The token list overlay should support pull-to-dismiss in addition to the backdrop tap.

### Trust & Security Communication

- **Current:** No section on the landing page addresses security concerns — a major objection for non-crypto-native users
- **Improvement:** Add a dedicated Security section explaining: self-custody model, Privy's audited infrastructure, no seed phrase to lose (recovery via OAuth), and open-source availability. Keep it confident and factual — no fear-mongering.

### Loading & Empty States

- **Current:** Skeleton loaders exist but are inconsistent — the trade panel shows a spinner, the trending list shows 8 skeleton rows, the portfolio shows nothing until data arrives
- **Improvement:** Standardize all loading states across the app: every async operation gets a consistent skeleton placeholder that matches the final layout shape. Empty states should guide the user toward the next action (e.g., "No trades yet → Start trading" with a CTA button).

### Accessibility

- **Current:** No focus management between tab switches on mobile. Keyboard navigation is incomplete. Color contrast for `text-secondary` (`rgba(234, 237, 255, 0.6)` on `#060510`) may fall below WCAG AA standards.
- **Improvement:** Audit all text contrast ratios. Add focus-ring styles for keyboard users. Ensure tab panel transitions manage focus correctly.

---

*This document is a retrospective one-pager — it captures what was built, how it was built with AI assistance, what problems were encountered, and how both the code and the design can be improved.*
