# ChadWallet — Official Landing Page Design Doc

> **Status:** Draft v1 — major redesign  
> **Tone:** Premium / Professional  
> **Target:** Production-ready landing page for chadwallet.com

---

## 1. Product & Brand Foundation

### 1.1 What is ChadWallet

ChadWallet is a **non-custodial Solana trading platform** that lets anyone discover, swap, and track memecoins — directly from a mobile app, no browser extension required. Users sign in with Google via Privy, get an embedded Solana wallet instantly, and start trading with one tap.

### 1.2 Mission

> Make memecoin trading as seamless as a fintech app — without sacrificing self-custody or performance.

### 1.3 Current State Assessment

The existing landing page (`app/page.tsx`) has the right components but leans heavily into "degen" culture (astronaut mascot, "where degens become legends", lime-green-on-black). For mainstream adoption, we need to **dial up trust and polish** while keeping the energy that makes memecoin trading exciting.

**What works:**
- Clean component separation
- Glassmorphism design system
- Mobile-responsive layout
- App store badges & social proof

**What needs redesign:**
- Hero section — messaging is too narrow ("degens"), visual hierarchy is flat
- No trust signals (stats, testimonials, security badges)
- Feature grid lacks narrative flow — cards don't tell a story
- Bottom CTA is visually busy (rotating circles compete with copy)
- No pricing/plan or "how it works" section
- Copy leans too hard on memecoin slang for a premium feel

---

## 2. Brand Identity

### 2.1 Brand Personality

| Dimension | Voice |
|-----------|-------|
| **Tone** | Confident, sharp, premium — not loud |
| **Attitude** | "We built the best tool. The results speak for themselves." |
| **Language** | Clear, benefit-driven. Avoid excessive slang. Let the product be the degen magnet. |
| **Comparables** | Think Robinhood meets Phantom Wallet — approachable but sophisticated |

### 2.2 Visual Direction

- **Clean fintech aesthetic** with subtle neon accents
- **Depth through layered glass** (frosted panels, backdrop blur, subtle gradients)
- **Data-forward** — show real stats, charts, and trade activity as design elements
- **Dark-first** but legible at any brightness
- **Motion as feedback** — subtle micro-interactions, not gratuitous animation

### 2.3 Color System

Current palette is solid but needs refinement for a premium feel:

#### Primary palette

```
Background:       #060510  (deep space — keep)
Surface:          #0D0D1A  (card/surface — keep)
Foreground:       #EAEDFF  (text primary — keep)
```

#### Accent evolution

Current `#cf0` (lime green) is energetic but fatiguing at scale. For a premium feel:

```
Primary accent:   #10B981  (emerald — professional, financial, trusted)
                  Used for: CTAs, active states, positive price moves, brand highlights

Secondary:        #6366F1  (indigo — depth, intelligence)
                  Used for: info banners, secondary CTAs, link text

Tertiary:         #F59E0B  (amber — alert, energy)
                  Used for: warnings, rewards/points, premium features
```

#### Legacy `#cf0` usage

Keep lime green only in the **ChadWallet logo mark** and as a **subtle glow in loading states** — brand heritage, not the primary accent.

### 2.4 Typography

```
Headings:   Inter (tight tracking, variable weight 600-800)
Body:       Inter (regular 400, medium 500)
Mono:       JetBrains Mono (wallet addresses, prices, code snippets)
```

Scale:

| Level | Size | Weight | Use |
|-------|------|--------|-----|
| Display | 64px/72px | 700 | Hero headline |
| H1 | 48px/56px | 700 | Section titles |
| H2 | 36px/44px | 600 | Subsection titles |
| H3 | 24px/32px | 600 | Card titles |
| Body | 16px/24px | 400 | Paragraphs |
| Small | 14px/20px | 400 | Captions, metadata |
| Micro | 12px/16px | 500 | Labels, timestamps |

### 2.5 Iconography & Imagery

- **Icons:** Clean 24px outlined icons (phosphor or lucide style). No emoji as icons.
- **Screenshots:** Real product screenshots only (no mockups). Show the actual UI on device frames.
- **Illustration style:** Minimal geometric + abstract gradients (no cartoony mascots on the landing page — save the astronaut for the app loading screen).
- **Photography:** If used, dark, moody tech-abstracts (circuit board closeups, blurred city lights). Generally avoid — screenshots do more work.

---

## 3. Target Audience

### Primary: The Serious Solana Trader

| Trait | Description |
|-------|-------------|
| Age | 22–40 |
| Portfolio | $500–$50,000 in SOL/memecoins |
| Pain point | Phantom/Backpack require browser extensions; mobile experience is fragmented |
| Motivation | Speed, ease of use, not missing the next runner |
| Objection | "Is this secure? Is it fast enough?" |

### Secondary: The Crypto-Curious Mobile User

| Trait | Description |
|-------|-------------|
| Age | 18–30 |
| Exposure | Has heard of Solana, maybe bought SOL on Coinbase |
| Pain point | Don't know how to buy memecoins; overwhelmed by existing tools |
| Motivation | FOMO + simplicity (Google sign-in, no seed phrase, no extension) |
| Objection | "I don't know what I'm doing. Is it safe?" |

---

## 4. Landing Page Architecture (Major Redesign)

The redesigned landing page follows a **storytelling funnel**:

> **Hook → Trust → Educate → Prove → Convert**

### Section Map

```
┌──────────────────────────────────┐
│            HEADER                 │  Sticky top nav (logo, nav links, CTA button)
├──────────────────────────────────┤
│         HERO SECTION              │  Value prop + device mockup + live stats
├──────────────────────────────────┤
│         TRUST BAR                 │  "Trusted by X traders | $Y volume | Z chains"
├──────────────────────────────────┤
│       HOW IT WORKS (3 steps)      │  Step-by-step visual: Sign in → Fund → Trade
├──────────────────────────────────┤
│      FEATURES (Narrative)         │  Problem → Solution cards, not feature lists
├──────────────────────────────────┤
│         LIVE DEMO / SHOWCASE      │  Animated dashboard preview (video or interactive)
├──────────────────────────────────┤
│         TESTIMONIALS / SOCIAL      │  Real trade screenshots, tweet embeds, KOL quotes
├──────────────────────────────────┤
│      SECURITY & TRUST SECTION     │  "Your keys, your coins" + Privy + audit mentions
├──────────────────────────────────┤
│     COMPARISON / WHY CHADWALLET   │  vs Phantom, vs BullX, vs Telegram bots
├──────────────────────────────────┤
│         FINAL CTA (BOTTOM)         │  Simplified: "Start trading" + store badges
├──────────────────────────────────┤
│            FOOTER                  │  Product links, social, legal, copyright
└──────────────────────────────────┘
```

### 4.1 Header

- **Layout:** Fixed top, transparent → glass on scroll
- **Left:** Wordmark logo (no tagline, just "ChadWallet")
- **Center:** Nav links — Features, How It Works, Rewards (optional)
- **Right:** "Launch App" CTA button (emerald, glass effect)
- **Mobile:** Hamburger with same links + prominent CTA

### 4.2 Hero Section (The Hook)

**Current problems:** The existing hero has no clear value proposition on first glance. The "degens become legends" tagline is memorable but not descriptive.

**Redesign:**

```
┌──────────────────────────────────────────────┐
│   [Small tag]  Solana's most traded memecoin app  │
│                                                │
│   Trade memecoins.                             │
│   No seed phrase. No extension.                │
│                                                │
│   Sign in with Google. Get a self-custody      │
│   Solana wallet instantly. Start trading       │
│   trending tokens in under 30 seconds.         │
│                                                │
│   [Start Trading]  [Download App]              │
│                                                │
│   ┌─ Stats bar ──────────────────────────────┐│
│   │ 12K+ traders │ $4.2M volume │ 0.3s swaps ││
│   └──────────────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

**Visual treatment:**
- Left: copy + CTA + stats
- Right: device frame showing the actual trading UI (real screenshot, not mockup)
- Background: subtle animated gradient (emerald → indigo, very slow)
- No astronaut, no floating mascots

### 4.3 How It Works (3 Steps)

Replace the current feature grid top section with a simple 3-step explainer:

```
Step 1: Sign In                → Step 2: Fund Your Wallet     → Step 3: Trade Instantly
Google/Apple OAuth             → Deposit SOL or swap USDC     → Trending tokens, live charts
2 clicks, no seed phrase       → Shows in wallet instantly     → 0.3s swaps via Jupiter
```

**Visual:** Each step has a small icon + headline + 1-line description + subtle connecting line between steps. On mobile, vertical stack with arrows.

### 4.4 Features Section (Narrative Redesign)

Instead of 6 generic cards, organize features into **3 pain-point narratives**:

| Narrative | Pain Point | Solution | Visual |
|-----------|-----------|----------|--------|
| **"No wallet? No problem."** | Need Phantom/Backpack to trade | Google sign-in creates embedded Solana wallet automatically | Screenshot of sign-in flow |
| **"Stop hopping between apps."** | Charts on DexScreener, swap on Jupiter, watch list on Birdeye | All-in-one: charting, swapping, portfolio, live trades | Screenshot of the unified dashboard |
| **"Move faster than the bots."** | Slow tools miss the runner | 0.3s swaps, real-time trade feed, instant data | Screenshot of trade panel with execution speed |

Each narrative is a full-width section with:
- Left: benefit copy (headline + paragraph)
- Right: screenshot on device frame
- Subtle hover/interaction on the screenshot

### 4.5 Live Demo / Showcase

The current `AppShowcase` component (auto-playing video) is good — keep it but **reframe as a live demo**:

- Desktop: muted auto-playing video of an actual trade execution (logged-in flow: sign in → find token → buy → see portfolio update)
- Mobile: static screenshot with "tap to play" overlay
- Caption: "See it in action. Real trade. Real speed."

### 4.6 Testimonials & Social Proof

New section. Show:

1. **Real trade screenshots** from actual users (blurred wallet addresses) — shows wins
2. **KOL quote:** "ChadWallet is the fastest way to trade Solana memecoins on mobile." — @some_handle
3. **Stats ticker:** counts of trades executed, traders onboarded, total volume (animated counters on scroll)

Design: card-based, alternating layout. Dark glass cards with emerald borders on the active/testimonial card.

### 4.7 Security & Trust Section

New section addressing the #1 objection:

```
┌────────────────────────────────────┐
│ Your keys. Your coins. Your rules. │
│                                    │
│ • Self-custody — you control the   │
│   private key, always              │
│ • Powered by Privy — audited       │
│   embedded wallet infrastructure   │
│ • No seed phrase to lose —         │
│   recover via Google OAuth         │
│ • Open source — view our code      │
│   on GitHub                        │
│                                    │
│ [Learn more about security]         │
└────────────────────────────────────┘
```

Visual: Shield icon, clean layout. No fear-mongering. Confident and factual.

### 4.8 Comparison / Why ChadWallet

A simple 2-column comparison table (desktop) / stacked cards (mobile):

| Feature | ChadWallet | Phantom | BullX | Telegram Bots |
|---------|-----------|---------|-------|---------------|
| Mobile-friendly | ✅ Native app | ✅ Browser ext | ❌ Web-only | ✅ In-chat |
| No seed phrase | ✅ Google OAuth | ❌ 12-word phrase | ❌ Connect wallet | ❌ Connect wallet |
| Instant swaps | ✅ 0.3s | ✅ | ✅ | ⚠️ Latency |
| Charts built-in | ✅ Candlestick | ❌ External | ✅ | ❌ |
| Portfolio tracking | ✅ Auto | ⚠️ Manual | ✅ | ❌ |

### 4.9 Bottom CTA

**Simplify** the current `BottomCta` component. Remove the spinning circles and layered backgrounds. Instead:

- Clean dark background with subtle gradient edge
- Headline: "Ready to trade?"
- Subtitle: "Join 12,000+ traders already using ChadWallet"
- Two buttons: "Start Trading" (primary) and "Download the App" (secondary, with store icons)
- Single floating decorative element (optional) — geometric, not cartoony

### 4.10 Footer

Keep the current `LandingFooter` structure but add:
- "Product" links column (Features, Rewards, Changelog, GitHub)
- Dynamic copyright year
- Cleaner spacing and hierarchy

---

## 5. Design System (CSS Architecture)

### 5.1 CSS Variable Hierarchy

```
:root {
  --cw-bg-app: #060510;
  --cw-bg-surface: #0D0D1A;
  --cw-bg-surface-hover: #14142B;
  --cw-bg-glass: rgba(255, 255, 255, 0.04);
  --cw-bg-glass-hover: rgba(255, 255, 255, 0.08);

  --cw-border: rgba(255, 255, 255, 0.06);
  --cw-border-hover: rgba(255, 255, 255, 0.12);

  --cw-text-primary: #EAEDFF;
  --cw-text-secondary: rgba(234, 237, 255, 0.6);
  --cw-text-tertiary: rgba(234, 237, 255, 0.4);

  --cw-accent: #10B981;         /* emerald — primary CTA */
  --cw-accent-hover: #059669;   /* emerald darker */
  --cw-accent-secondary: #6366F1;  /* indigo */
  --cw-accent-amber: #F59E0B;    /* amber */

  --cw-success: #10B981;
  --cw-error: #EF4444;
  --cw-warning: #F59E0B;

  --cw-radius-sm: 8px;
  --cw-radius-md: 12px;
  --cw-radius-lg: 16px;
  --cw-radius-xl: 24px;

  --cw-font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --cw-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### 5.2 Glass Components

Standardize glass variants:

```css
/* Default glass card */
.glass {
  background: var(--cw-bg-glass);
  backdrop-filter: blur(20px);
  border: 1px solid var(--cw-border);
  border-radius: var(--cw-radius-lg);
}

/* Elevated glass (hover/active) */
.glass-elevated {
  background: var(--cw-bg-glass-hover);
  border-color: var(--cw-border-hover);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Accent glass (CTAs) */
.glass-accent {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.25);
  backdrop-filter: blur(12px);
}
```

### 5.3 Motion Principles

| Trigger | Duration | Easing | Effect |
|---------|----------|--------|--------|
| Scroll reveal | 600ms | ease-out | fade-in-up (20px) |
| Hover (card) | 200ms | ease-out | border glow + subtle lift |
| Page load | 400ms | ease-out | stagger children (50ms delay) |
| CTA hover | 150ms | ease-out | background shift + subtle scale(1.02) |
| Stats counter | 1500ms | ease-out | count-up on scroll into view |

### 5.4 Spacing Grid

Use a 4px base unit:

| Token | Value | Use |
|-------|-------|-----|
| `--cw-space-xs` | 4px | Micro spacing |
| `--cw-space-sm` | 8px | Tight gaps |
| `--cw-space-md` | 16px | Default gap |
| `--cw-space-lg` | 24px | Section padding |
| `--cw-space-xl` | 32px | Large gaps |
| `--cw-space-2xl` | 48px | Section margins |
| `--cw-space-3xl` | 64px | Hero/CTA padding |

---

## 6. Technical Implementation

### 6.1 Performance Targets

| Metric | Target |
|--------|--------|
| LCP | < 1.5s |
| TBT | < 100ms |
| CLS | < 0.05 |
| Lighthouse Performance | ≥ 95 |
| JS bundle (landing page) | < 100kB gzipped |

### 6.2 Image & Video Strategy

- **Hero device mockup:** Next.js `<Image>` with `priority` + `fetchPriority="high"`
- **Feature screenshots:** 2x resolution WebP, lazy-loaded with blur placeholder
- **Demo video:** `next-video` or Cloudinary-hosted with streaming, not a raw MP4 served from `/public`
- **Backgrounds:** CSS gradients over images (reduce paint cost). Use `will-change: auto` sparingly.

### 6.3 SEO Approach

| Element | Strategy |
|---------|----------|
| Title | "ChadWallet — Trade Solana Memecoins Instantly. No Extension Needed." |
| Description | Clear, keyword-rich, under 160 chars |
| OpenGraph | Large 1200×630 card with product screenshot overlay |
| Structured data | `SoftwareApp` + `WebApplication` schema |
| H1 | Each page gets exactly one, matches headline intent |

### 6.4 A/B Testing Plan

Once the redesign is live, test:

1. **Hero CTA copy:** "Start Trading" vs "Launch App" vs "Trade Now"
2. **Stats placement:** Above fold (in hero) vs below features
3. **Testimonial position:** Before features vs after features
4. **Button color:** Emerald vs indigo vs white for primary CTA

---

## 7. Success Metrics

| KPI | Current Baseline | Target |
|-----|-----------------|--------|
| Landing → Trade conversion | TBD | ≥ 15% |
| Bounce rate (landing page) | TBD | ≤ 35% |
| Time on page | TBD | ≥ 60s |
| Scroll depth (to CTA) | TBD | ≥ 40% |
| Lighthouse Performance | TBD | ≥ 95 |
| Mobile conversion rate | TBD | ≥ 60% of total |

---

## 8. Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Update CSS variables in `globals.css` (emerald accent, new design tokens)
- [ ] Create new glass component utilities
- [ ] Build new `HeroSection` with device mockup and stats bar
- [ ] Build `TrustBar` component
- [ ] Build `HowItWorks` component (3 steps)

### Phase 2: Content Sections (Week 2)
- [ ] Rebuild feature cards as narrative sections (3 pain-point layouts)
- [ ] Create `Testimonials` component
- [ ] Create `SecuritySection` component
- [ ] Create `ComparisonTable` component
- [ ] Simplify `BottomCta`

### Phase 3: Polish (Week 3)
- [ ] Scroll-triggered animations (framer-motion)
- [ ] SEO audit + structured data
- [ ] Performance optimization (images, bundle, fonts)
- [ ] Mobile QA pass
- [ ] Cross-browser testing

---

## 9. Appendix: Component Tree (Final)

```
<LandingPage>
  <LandingHeader />          ← sticky, transparent→glass on scroll
  <HeroSection />            ← value prop + device mockup + stats
  <TrustBar />               ← "12K+ traders | $4.2M volume | 0.3s swaps"
  <HowItWorks />             ← 3-step visual explainer
  <FeaturesNarrative />      ← 3 pain-point stories
    <NarrativeCard />        ← repeated
  <LiveDemo />               ← auto-playing video or screenshot
  <Testimonials />           ← trade screenshots + KOL quotes + stat counters
  <SecuritySection />        ← "Your keys, your coins"
  <ComparisonTable />        ← ChadWallet vs alternatives
  <BottomCta />              ← simplified CTA + store badges
  <LandingFooter />          ← product links + social + legal
</LandingPage>
```

---

*This doc is a living design source of truth. Update it as the landing page evolves.*
