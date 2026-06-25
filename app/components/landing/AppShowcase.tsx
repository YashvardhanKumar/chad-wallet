'use client';

export default function AppShowcase() {
  return (
    <>
      {/* Desktop showcase */}
      <div className="hidden desktop:flex flex-col items-center py-10 px-8 gap-3">
        <div className="font-mono font-bold text-accent-primary text-sm tracking-wider">
          AVAILABLE ON IOS & ANDROID
        </div>
        <h2 className="text-[60px] leading-14 tracking-tight text-center font-bold">
          trade from anywhere.<br/>never lose a beat.
        </h2>
        <p className="text-[#EAEDFF99] text-[22px] tracking-tight">
          Snipe memecoins at lightning speed on every chain. One wallet.
        </p>
        <div className="relative mt-5 max-w-[400px] mx-auto">
          <video
            src="/images/chadwallet.mp4"
            autoPlay
            loop
            playsInline
            muted
            className="w-full rounded-2xl shadow-2xl border border-white/10"
          />
        </div>
      </div>

      {/* Mobile showcase */}
      <div className="flex desktop:hidden relative text-center mt-8">
        <img
          src="/images/screenshots/portfolio.png"
          alt="ChadWallet app preview"
          className="w-full px-4"
        />
        <div className="absolute bottom-0 px-8 flex flex-col gap-3">
          <h2 className="text-[36px] leading-9 tracking-tighter text-center font-bold">
            trade from anywhere. <br/>never lose a beat.
          </h2>
          <p className="tracking-tight text-text-secondary leading-5">
            Snipe memecoins at lightning speed, one wallet to rule them all.
          </p>
        </div>
      </div>
    </>
  );
}
