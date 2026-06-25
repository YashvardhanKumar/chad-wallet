'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

export default function BottomCta() {
  const { login, authenticated } = usePrivy();

  return (
    <div className="relative self-stretch flex items-center justify-center py-40 desktop:py-0">
      <img
        loading="lazy"
        alt=""
        className="absolute inset-0 w-full h-full bottom-0 object-cover"
        src="/images/landing/legends.webp"
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-bg-primary to-transparent"></div>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-bg-primary to-transparent"></div>
      <div className="px-8 w-[80vw]">
        <div className="flex flex-col justify-center items-center aspect-square relative">
          <div className="flex flex-col gap-3 desktop:gap-6 items-center w-[70vw] relative z-10">
            <h2 className="text-[40px] leading-10 desktop:text-[60px] desktop:leading-15 tracking-tighter text-center font-bold">
              a trading app<br/>for the rest of us
            </h2>
            <p className="desktop:text-[22px] text-text-secondary desktop:leading-7 tracking-tight text-center">
              join thousands of traders making their name on ChadWallet
            </p>
            <div className="pt-6">
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
          </div>
          <img
            loading="lazy"
            alt=""
            className="absolute inset-0 m-auto z-1 w-[35vw] desktop:w-[30vw] animate-[spin_30s_linear_infinite_reverse]"
            src="/images/landing/inner-circle.webp"
          />
          <img
            loading="lazy"
            alt=""
            className="absolute inset-0 m-auto z-1 w-screen desktop:w-[55vw] animate-[spin_45s_linear_infinite] desktop:max-w-275"
            src="/images/landing/outer-circle.webp"
          />
        </div>
      </div>
    </div>
  );
}
