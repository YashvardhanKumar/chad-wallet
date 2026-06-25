'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

export default function HeroSection() {
  const { login, authenticated } = usePrivy();

  return (
    <main className="flex flex-col items-center justify-center flex-1 h-full w-full">
      <img
        src="/images/landing/space-bg.webp"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none select-none object-cover"
      />

      <div className="flex flex-col items-center gap-5 desktop:gap-8">
        <div className="flex flex-col gap-2 items-center text-center pt-10 px-6 desktop:pt-20">
          <img
            src="/images/logo-light.png"
            alt="ChadWallet"
            className="w-32 h-32 desktop:w-40 desktop:h-40 rounded-2xl"
            fetchPriority="high"
          />
          <h1 className="text-[24px] leading-6 desktop:text-[40px] text-[#EAEDFF] text-center desktop:leading-12 tracking-tighter font-black mt-2">
            ChadWallet
          </h1>
          <p className="text-lg leading-6 desktop:text-[22px] text-[#EAEDFF] text-center tracking-tight">
            where degens become legends.
          </p>
          <p className="desktop:text-[22px] text-[#D1D8FF99] text-center desktop:leading-6 tracking-tight">
            Hunt every memecoin, every chain. One wallet to rule them all.
          </p>
        </div>

        <div className="flex gap-2 desktop:hidden">
          <a
            href="https://apps.apple.com/us/app/chadwallet/id6757367474"
            className="text-center z-2 bg-white/12 backdrop-blur-md border border-bg-tertiary rounded-xl text-lg font-bold w-50 py-3"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download app
          </a>
        </div>

        <div className="hidden desktop:flex gap-3">
          {authenticated ? (
            <Link
              href="/trade"
              className="group items-center justify-center overflow-hidden bg-[#606AF780] hover:bg-[#606AF7CC] backdrop-blur-md transition-colors duration-150 py-3 w-50 rounded-xl text-lg font-bold border border-bg-tertiary z-2 hidden desktop:flex"
            >
              <span>Start trading</span>
              <div className="flex items-center overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-150 ease-out">
                <svg className="size-5 stroke-2 rotate-180 ml-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ) : (
            <button
              onClick={login}
              className="group items-center justify-center overflow-hidden bg-[#606AF780] hover:bg-[#606AF7CC] backdrop-blur-md transition-colors duration-150 py-3 w-50 rounded-xl text-lg font-bold border border-bg-tertiary z-2 hidden desktop:flex cursor-pointer"
            >
              <span>Start trading</span>
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
            className="z-2 group bg-white/12 hover:bg-white/20 backdrop-blur-md transition-colors duration-150 border border-bg-tertiary rounded-xl text-lg font-bold w-50 flex items-center justify-center overflow-hidden"
          >
            <div className="flex items-center overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-150 ease-out">
              <svg className="size-5 text-text-primary mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span>Download app</span>
          </a>
        </div>
      </div>

      <img
        className="desktop:hidden animate-[float_10s_ease-in-out_infinite] -mt-16"
        src="/images/landing/astronaut-mobile.webp"
        alt=""
        fetchPriority="high"
      />

      <img
        src="/images/landing/astronaut.webp"
        alt=""
        className="hidden desktop:block h-[520px] -mt-20 object-contain animate-[float_4s_ease-in-out_infinite]"
        fetchPriority="high"
      />
    </main>
  );
}
