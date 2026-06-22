'use client';

import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { STORE_LINKS } from '@/app/lib/constants';
import Link from 'next/link';

export default function Header() {
  const { login, logout, authenticated, ready } = usePrivy();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo-dark.png"
              alt="ChadWallet"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold tracking-tight hidden sm:block">ChadWallet</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Store badges - desktop only */}
            <a
              href={STORE_LINKS.ios}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:block store-badge"
            >
              <Image
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                alt="Download on the App Store"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
            </a>
            <a
              href={STORE_LINKS.android}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center store-badge"
            >
              <Image
                src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                alt="Get it on Google Play"
                width={140}
                height={54}
                className="h-14 w-auto -ml-2 -mt-1"
              />
            </a>

            {/* Auth button */}
            {ready && (
              authenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/trade"
                    className="bg-accent hover:bg-accent-hover text-black font-semibold px-5 py-2 rounded-xl transition-all duration-200"
                  >
                    Start Trading
                  </Link>
                  <button
                    onClick={logout}
                    className="text-text-secondary hover:text-text-primary text-sm transition-colors px-3 py-2"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={login}
                  className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 hover:border-white/20 px-5 py-2 rounded-xl font-semibold transition-all duration-200"
                >
                  Login
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
