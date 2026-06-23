'use client';

import { useState, useRef } from 'react';

export default function VideoSection() {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  function toggleMute() {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(!muted);
    }
  }

  return (
    <div className="cw-screenshots-banner mx-auto flex w-full max-w-[1120px] justify-center rounded-none px-[max(1.2rem,2.5%)] pb-0 pt-2 max-[760px]:px-0 max-[760px]:pt-12">
      <div className="relative w-full min-[761px]:w-auto">
        <video
          ref={videoRef}
          src="/images/chadwallet.mp4"
          autoPlay
          loop
          playsInline
          preload="metadata"
          aria-label="ChadWallet app preview"
          muted={muted}
          className="h-auto w-full border-[var(--cw-border)] shadow-[0_22px_34px_-24px_rgba(15,23,42,0.7)] min-[761px]:max-w-[363px] min-[761px]:rounded-md min-[761px]:border"
        />
        <button
          type="button"
          aria-label={muted ? 'Unmute video' : 'Mute video'}
          aria-pressed={!muted}
          onClick={toggleMute}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur-sm transition hover:bg-black/75 hover:text-white"
        >
          {muted ? (
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
