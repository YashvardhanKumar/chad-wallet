'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

export default function LandingHeader() {
  const { login, authenticated } = usePrivy();

  return (
    <header className="items-center h-16 pt-3 px-5 justify-between hidden min-[800px]:flex relative z-20">
      <Link
        aria-label="ChadWallet home"
        className="flex items-center gap-2"
        href="/"
      >
        <Image
          src="/images/logo-light.png"
          alt="ChadWallet"
          width={40}
          height={40}
          className="h-8 w-8 rounded-lg"
          style={{ width: 'auto', height: '32px' }}
          priority
        />
        <span className="text-xl font-black tracking-tight text-[var(--cw-text-primary)]">
          ChadWallet
        </span>
      </Link>

      <div className="flex gap-2 items-center">
        <a
          href="https://apps.apple.com/us/app/chadwallet/id6757367474"
          aria-label="Download on the App Store"
          className="bg-white/20 backdrop-blur-md rounded-md hover:ring-white/40 hover:ring-1 hover:backdrop-blur-sm hover:opacity-90 transition-all"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/images/app-store.png"
            alt="Download on the App Store"
            width={120}
            height={40}
            className="h-10 block"
            style={{ width: 'auto', height: '40px' }}
          />
        </a>
        <a
          href="https://play.google.com/store/apps/details?id=xyz.chadwallet.www"
          aria-label="Get it on Google Play"
          className="bg-white/20 backdrop-blur-md rounded-md hover:ring-white/40 hover:ring-1 hover:backdrop-blur-sm hover:opacity-90 transition-all"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/images/google-play.png"
            alt="Get it on Google Play"
            width={135}
            height={40}
            className="h-10 block"
            style={{ width: 'auto', height: '40px' }}
          />
        </a>
        {authenticated ? (
          <Link
            href="/trade"
            className="bg-white/10 backdrop-blur-xl ring ring-white/10 hover:bg-white/20 h-10 px-5 rounded-lg font-bold flex items-center transition-all"
          >
            Trade
          </Link>
        ) : (
          <button
            onClick={login}
            className="bg-white/10 backdrop-blur-xl ring ring-white/10 hover:bg-white/20 h-10 px-5 rounded-lg font-bold transition-all cursor-pointer"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}
