import Image from 'next/image';

export default function StoreBadges() {
  return (
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <a
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center overflow-hidden shadow-[0_18px_30px_-30px_rgba(15,23,42,0.8)] transition-transform duration-200 hover:-translate-y-0.5"
          aria-label="Download on the App Store"
          href="https://apps.apple.com/us/app/chadwallet/id6757367474"
        >
          <Image
            alt="Download on the App Store"
            width={192}
            height={64}
            className="block h-[3rem] w-auto sm:h-[3.1rem]"
            src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
          />
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center overflow-hidden shadow-[0_18px_30px_-30px_rgba(15,23,42,0.8)] transition-transform duration-200 hover:-translate-y-0.5"
          aria-label="Get it on Google Play"
          href="/images/app-store.png"
        >
          <Image
            alt="Get it on Google Play"
            width={216}
            height={64}
            className="block h-12 w-auto sm:h-[3.1rem]"
            src="/images/google-play.png"
          />
        </a>
      </div>
  );
}
