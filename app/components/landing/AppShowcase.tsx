'use client';

import { useRef, useState } from 'react';

export default function AppShowcase() {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  function toggleMute() {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(!muted);
    }
  }

  return (
    <>
      {/* Desktop showcase */}
      <div className="hidden min-[800px]:flex flex-col items-center py-16 px-8 gap-4">
        <div className="font-mono font-bold text-accent text-sm tracking-wider">
          AVAILABLE ON iOS & ANDROID
        </div>
        <h2 className="text-5xl min-[800px]:text-[60px] leading-[1.15] tracking-tighter text-center font-bold">
          trade from anywhere.<br />never lose a beat.
        </h2>
        <p className="text-[#EAEDFF99] text-xl tracking-tight mb-6">
          Snipe memecoins at lightning speed on every chain. One wallet.
        </p>

        <div className="relative max-w-[400px] mx-auto">
          <video
            ref={videoRef}
            src="/images/chadwallet.mp4"
            autoPlay
            loop
            playsInline
            preload="metadata"
            aria-label="ChadWallet app preview"
            muted={muted}
            className="w-full rounded-2xl shadow-2xl border border-white/10"
          />
          <button
            type="button"
            aria-label={muted ? 'Unmute video' : 'Mute video'}
            aria-pressed={!muted}
            onClick={toggleMute}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur-xl transition hover:bg-black/75 hover:text-white cursor-pointer"
          >
            {muted ? (
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile showcase */}
      <div className="flex min-[800px]:hidden text-center flex-col mt-8">
        <div className="px-8 flex flex-col gap-3 mb-6">
          <h2 className="text-3xl leading-9 tracking-tighter text-center font-bold">
            trade from anywhere.<br />never lose a beat.
          </h2>
          <p className="tracking-tight text-[var(--cw-text-secondary)] leading-5">
            Snipe memecoins at lightning speed, one wallet to rule them all.
          </p>
        </div>
        <div className="relative w-full px-4">
          <video
            src="/images/chadwallet.mp4"
            autoPlay
            loop
            playsInline
            preload="metadata"
            muted
            className="w-full rounded-xl shadow-xl"
          />
        </div>
      </div>
    </>
  );
}
