'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

export default function BottomCta() {
  const { login, authenticated } = usePrivy();

  return (
    <div className="relative self-stretch flex items-center justify-center py-40 min-[800px]:py-0 overflow-hidden">
      {/* Background image */}
      <Image
        src="/images/landing/chad-astronaut.jpg"
        alt=""
        fill
        className="absolute inset-0 w-full h-full bottom-0 object-cover pointer-events-none select-none"
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-[var(--background)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-[var(--background)] to-transparent" />

      <div className="px-8 w-[80vw]">
        <div className="flex flex-col justify-center items-center aspect-square relative">
          <div className="flex flex-col gap-3 min-[800px]:gap-6 items-center w-[70vw] relative z-10">
            <h2 className="text-[40px] leading-10 min-[800px]:text-[60px] min-[800px]:leading-15 tracking-tighter text-center font-bold">
              a trading app<br />for the rest of us
            </h2>
            <p className="min-[800px]:text-[22px] text-text-secondary min-[800px]:leading-7 tracking-tight text-center">
              join thousands of traders making their name on ChadWallet
            </p>
            <div className="pt-6">
              {/* Mobile CTA */}
              <div className="flex gap-2 min-[800px]:hidden">
                <a
                  href="https://apps.apple.com/us/app/chadwallet/id6757367474"
                  className="text-center z-2 bg-white/12 backdrop-blur-md border border-white/10 rounded-xl text-lg font-bold w-50 py-3 hover:bg-white/20 hover:backdrop-blur-sm transition-all"
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
                    className="group items-center justify-center overflow-hidden bg-accent/50 hover:bg-accent/80 backdrop-blur-md transition-colors duration-150 py-3 w-50 rounded-xl text-lg font-bold text-black border border-white/10 z-2 flex"
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
                    className="group items-center justify-center overflow-hidden bg-accent/50 hover:bg-accent/80 backdrop-blur-md transition-colors duration-150 py-3 w-50 rounded-xl text-lg font-bold text-black border border-white/10 z-2 flex cursor-pointer"
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
                  className="z-2 group bg-white/12 hover:bg-white/20 backdrop-blur-md transition-colors duration-150 border border-white/10 rounded-xl text-lg font-bold w-50 flex items-center justify-center overflow-hidden py-3"
                >
                  <div className="flex items-center overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-150 ease-out">
                    <svg className="size-5 text-white mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span>Download app</span>
                </a>
              </div>
            </div>
          </div>

          {/* Inner spinning ring */}
          <div
            className="absolute inset-0 m-auto z-1 w-[35vw] min-[800px]:w-[30vw] max-w-[350px] aspect-square animate-spin-slow-reverse rounded-full"
            style={{
              border: '1px solid rgba(204, 255, 0, 0.08)',
              boxShadow: 'inset 0 0 30px rgba(204, 255, 0, 0.03)',
            }}
          />

          {/* Outer spinning ring */}
          <div
            className="absolute inset-0 m-auto z-1 w-[70vw] min-[800px]:w-[55vw] max-w-[700px] aspect-square animate-spin-slow rounded-full"
            style={{
              border: '1px solid rgba(204, 255, 0, 0.05)',
              boxShadow: 'inset 0 0 60px rgba(204, 255, 0, 0.02)',
            }}
          />

          {/* Accent dots on rings */}
          <div className="absolute inset-0 m-auto z-1 w-[35vw] min-[800px]:w-[30vw] max-w-[350px] aspect-square animate-spin-slow-reverse">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent/40" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent/30" />
          </div>

          <div className="absolute inset-0 m-auto z-1 w-[70vw] min-[800px]:w-[55vw] max-w-[700px] aspect-square animate-spin-slow">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent/20" />
            <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent/25" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-accent/15" />
          </div>
        </div>
      </div>
    </div>
  );
}
