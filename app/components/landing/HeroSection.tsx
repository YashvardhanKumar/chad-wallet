'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

export default function HeroSection() {
  const { login, authenticated } = usePrivy();

  return (
    <main className="relative flex flex-col items-center justify-center flex-1 h-full w-full">
      {/* Space background */}
      <Image
        src="/images/landing/space-bg.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        className="absolute top-0 left-0 w-full -z-10 pointer-events-none select-none object-cover"
      />

      <div className="flex flex-col items-center gap-5 min-[800px]:gap-8">
        {/* Logo + Tagline */}
        <div className="flex flex-col gap-3 items-center text-center pt-10 px-6 min-[800px]:pt-20">
          <Image
            src="/images/logo-light.png"
            alt="ChadWallet"
            width={300}
            height={300}
            priority
            className="w-32 h-32 min-[800px]:w-40 min-[800px]:h-40 rounded-2xl"
          />
          <h1 className="text-3xl leading-8 min-[800px]:text-5xl text-[#EAEDFF] text-center min-[800px]:leading-12 tracking-tighter font-black mt-2">
            ChadWallet
          </h1>
          <p className="text-lg min-[800px]:text-2xl text-[#EAEDFF] text-center tracking-tighter font-bold">
            where degens become legends.
          </p>
          <p className="min-[800px]:text-xl text-[#D1D8FF99] text-center min-[800px]:leading-6 tracking-tight">
            Hunt every memecoin, every chain. One wallet to rule them all.
          </p>
        </div>

        {/* Mobile CTA */}
        <div className="flex gap-2 min-[800px]:hidden">
          <a
            href="https://apps.apple.com/us/app/chadwallet/id6757367474"
            className="text-center z-2 bg-white/12 backdrop-blur-md border border-white/10 rounded-xl text-lg font-bold w-50 py-3 hover:backdrop-blur-sm hover:bg-white/20 transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download app
          </a>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden min-[800px]:flex gap-3">
          {authenticated ? (
            <Link
              href="/trade"
              className="group items-center justify-center overflow-hidden cta-primary py-3 w-50 rounded-xl text-lg font-bold text-black z-2 flex"
            >
              <span>Start Trading</span>
              <div className="flex items-center overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-150 ease-out">
                <svg className="size-5 stroke-2 rotate-180 ml-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ) : (
            <button
              onClick={login}
              className="group items-center justify-center overflow-hidden cta-primary py-3 w-50 rounded-xl text-lg font-bold text-black z-2 flex cursor-pointer"
            >
              <span>Start Trading</span>
              <div className="flex items-center overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-150 ease-out">
                <svg className="size-5 stroke-2 rotate-180 ml-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>
          )}
          <a
            href="https://apps.apple.com/us/app/chadwallet/id6757367474"
            target="_blank"
            rel="noopener noreferrer"
            className="z-2 group cta-secondary rounded-xl text-lg font-bold w-50 flex items-center justify-center overflow-hidden py-3"
          >
            <div className="flex items-center overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-150 ease-out">
              <svg className="size-5 text-[var(--cw-text-primary)] mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span>Download app</span>
          </a>
        </div>
      </div>

      {/* Floating astronaut - mobile (same as fomo.family) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="min-[800px]:hidden animate-float-slow -mt-16"
        src="/images/landing/astronaut-mobile.webp"
        alt=""
        fetchPriority="high"
      />

      {/* Floating astronaut - desktop (same as fomo.family) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/landing/astronaut.webp"
        alt=""
        className="hidden min-[800px]:block h-[520px] -mt-20 object-contain animate-float"
        fetchPriority="high"
      />
    </main>
  );
}
