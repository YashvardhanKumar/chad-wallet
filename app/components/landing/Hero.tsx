'use client';

import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { STORE_LINKS } from '@/app/lib/constants';
import Link from 'next/link';

export default function Hero() {
  const { login, authenticated } = usePrivy();

  return (
    <section className="relative flex flex-col items-center justify-center pt-20 pb-10 hero-gradient noise-overlay" style={{ minHeight: '100dvh' }}>
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center max-w-4xl mx-auto">
        {/* Logo */}
        <div className="animate-float">
          <Image
            src="/images/logo-dark.png"
            alt="ChadWallet"
            width={120}
            height={120}
            className="rounded-2xl glow-pulse"
            priority
          />
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter leading-none">
          <span className="gradient-text">Chad</span>Wallet
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl lg:text-3xl text-text-secondary tracking-tight">
          the only wallet you need.
        </p>

        <p className="text-base sm:text-lg text-text-tertiary max-w-xl tracking-tight">
          Find the next 100x memecoins. Trade trending Solana tokens 24/7. Follow KOL traders. Launch tokens from tweets.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          {authenticated ? (
            <Link
              href="/trade"
              className="group bg-accent hover:bg-accent-hover text-black font-bold px-8 py-4 rounded-2xl text-lg transition-all duration-200 flex items-center gap-2"
            >
              Start Trading
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          ) : (
            <button
              onClick={login}
              className="group bg-accent hover:bg-accent-hover text-black font-bold px-8 py-4 rounded-2xl text-lg transition-all duration-200 flex items-center gap-2"
            >
              Get Started
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
          )}
          <a
            href={STORE_LINKS.ios}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/8 hover:bg-white/12 backdrop-blur-md border border-white/10 hover:border-white/20 font-bold px-8 py-4 rounded-2xl text-lg transition-all duration-200"
          >
            Download App
          </a>
        </div>

        {/* Store badges on mobile */}
        <div className="flex gap-3 mt-2 lg:hidden">
          <a href={STORE_LINKS.ios} target="_blank" rel="noopener noreferrer" className="store-badge">
            <Image
              src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
              alt="App Store"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </a>
          <a href={STORE_LINKS.android} target="_blank" rel="noopener noreferrer" className="flex items-center store-badge">
            <Image
              src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
              alt="Google Play"
              width={140}
              height={54}
              className="h-14 w-auto -ml-2 -mt-1"
            />
          </a>
        </div>
      </div>

      {/* Decorative gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/3 rounded-full blur-3xl pointer-events-none" />
    </section>
  );
}
