'use client';

import { usePrivy } from '@privy-io/react-auth';
import { STORE_LINKS } from '@/app/lib/constants';
import Link from 'next/link';

export default function CtaSection() {
  const { login, authenticated } = usePrivy();

  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-accent/5 to-transparent pointer-events-none" />

      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter mb-6">
          a trading app<br />for the rest of us
        </h2>
        <p className="text-lg sm:text-xl text-text-secondary mb-10 tracking-tight">
          Join thousands of traders making their name on ChadWallet
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {authenticated ? (
            <Link
              href="/trade"
              className="bg-accent hover:bg-accent-hover text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all duration-200"
            >
              Start Trading
            </Link>
          ) : (
            <button
              onClick={login}
              className="bg-accent hover:bg-accent-hover text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all duration-200"
            >
              Start Trading
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
      </div>
    </section>
  );
}
