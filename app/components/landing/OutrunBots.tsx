import Link from 'next/link';

export default function OutrunBots() {
  return (
    <div className="relative isolate overflow-hidden mx-auto w-full max-w-[1120px] px-4 pb-8 pt-6 max-[760px]:px-0 max-[760px]:pb-8 max-[760px]:pt-0" style={{ backgroundImage: 'linear-gradient(to bottom, #171e27 0, var(--cw-bg-app) 100%)', '--cw-border': '#334155' } as React.CSSProperties}>
      <div className="px-4 pb-3 pt-2 text-center">
        <h1 className="m-0 mt-6 text-center text-[2.25rem] leading-[1.02] tracking-[-0.05em] text-[var(--cw-text-primary)] sm:text-[3.625rem] sm:leading-[0.96]">
          Outrun the Bots
        </h1>
        <div className="mx-auto mt-8 max-w-[38rem] text-center text-[18px] leading-relaxed text-[var(--cw-text-primary)]">
          <p className="m-0">Snipe memecoins at lightning speed on every chain.</p>
          <p className="m-0">Copy the wallets that are actually printing.</p>
          <p className="m-0">
            Earn $CHAD points on every fill — get rewarded to ape.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/rewards"
            className="inline-flex min-h-[2.784375rem] min-w-[9.61875rem] items-center justify-center rounded-[0.5rem] bg-[#ccff00] px-[1.265625rem] py-[0.6328125rem] text-[1.063rem] font-bold tracking-[-0.04em] text-[#101010] transition-transform duration-200 hover:-translate-y-0.5 max-[640px]:min-h-[2.95rem] max-[640px]:min-w-[8.85rem] max-[640px]:px-[1rem] max-[640px]:py-[0.68rem] max-[640px]:text-[1.06rem]"
          >
            I don&apos;t wanna miss out!
          </Link>
        </div>
      </div>
    </div>
  );
}
