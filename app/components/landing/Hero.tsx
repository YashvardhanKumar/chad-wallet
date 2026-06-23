import Image from 'next/image';
import StoreBadges from './StoreBadges';

export default function Hero() {
  return (
    <div className="flex flex-col items-center border-x-0 px-5 py-12 text-center shadow-[0_24px_44px_-34px_rgba(15,23,42,0.45)] sm:py-14">
      <div className="group relative h-[156px] w-[156px] sm:h-[168px] sm:w-[168px]">
        <Image
          alt="ChadWallet logo"
          priority
          width={156}
          height={156}
          className="absolute inset-0 h-auto w-full transition-opacity duration-1000 ease-in-out group-hover:opacity-0"
          src="/images/logo.png"
        />
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <span className="block whitespace-nowrap text-[5.625rem] font-black leading-none tracking-[-0.03em] text-[var(--cw-text-primary)] opacity-0 transition-opacity duration-1000 ease-in-out group-hover:opacity-100 sm:text-[6.75rem]">
            Win!
          </span>
        </span>
      </div>
      <h1 className="m-0 text-[1.9rem] font-bold leading-[1.05] tracking-[-0.02em] sm:text-4xl">
        ChadWallet
      </h1>
      <p className="mt-3 max-w-lg text-center text-[1.16rem] font-medium leading-snug text-[var(--cw-text-secondary)] sm:text-[1.28rem]">
        Hunt every memecoin. Every chain.{' '}
        <span className="whitespace-nowrap">One wallet.</span>
      </p>
      <StoreBadges />
    </div>
  );
}
