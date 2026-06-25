'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

export default function LandingHeader() {
  const { login, authenticated } = usePrivy();

  return (
    <header className="items-center h-13 pt-3 px-5 justify-between hidden desktop:flex relative z-20">
      <Link
        aria-label="ChadWallet home"
        className="flex items-center text-text-primary"
        href="/"
      >
        <img
          src="/images/logo-light.png"
          alt="ChadWallet"
          className="h-6 w-6 rounded-lg"
        />
        <span className="text-lg font-black tracking-tight ml-2">ChadWallet</span>
      </Link>

      <div className="flex gap-2">
        <a
          href="https://apps.apple.com/us/app/chadwallet/id6757367474"
          aria-label="Download on the App Store"
          className="bg-white/20 backdrop-blur-md rounded-md hover:ring-white/40 hover:ring-1 hover:backdrop-blur-sm hover:opacity-90"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="120" height="40" className="block"><use href="/images/sprite.svg#apple-cta"></use></svg>
        </a>
        <a
          href="https://play.google.com/store/apps/details?id=xyz.chadwallet.www"
          aria-label="Get it on Google Play"
          className="bg-white/20 backdrop-blur-md hover:ring-white/40 hover:ring-1 rounded-md hover:opacity-90 hover:backdrop-blur-sm"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="135" height="40" className="block"><use href="/images/sprite.svg#google-cta"></use></svg>
        </a>
        {authenticated ? (
          <Link
            href="/trade"
            className="bg-bg-secondary ring ring-bg-tertiary hover:bg-bg-secondary/80 h-10 px-5 rounded-lg font-bold flex items-center transition-all"
          >
            Trade
          </Link>
        ) : (
          <button
            onClick={login}
            className="bg-bg-secondary ring ring-bg-tertiary hover:bg-bg-secondary/80 h-10 px-5 rounded-lg font-bold transition-all cursor-pointer"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}
