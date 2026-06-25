import Link from 'next/link';
import Image from 'next/image';

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="px-10 pt-8 pb-12 flex flex-col min-[800px]:flex-row gap-10 items-start justify-between max-w-[1400px] mx-auto w-full">
      {/* Left column: logo + tagline + copyright */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Link
            aria-label="ChadWallet home"
            className="flex items-center gap-2"
            href="/"
          >
            <Image
              src="/images/logo-light.png"
              alt="ChadWallet"
              width={40}
              height={40}
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-xl font-black tracking-tight">ChadWallet</span>
          </Link>
          <div className="text-2xl text-[var(--cw-text-secondary)] leading-7 tracking-tighter">
            where degens become legends.
          </div>
        </div>
        <div className="text-[var(--cw-footer-text-secondary)] hidden min-[800px]:block">
          © {year} ChadWallet
        </div>
      </div>

      {/* Right columns: links */}
      <div className="flex items-start flex-col min-[800px]:flex-row gap-8 min-[800px]:gap-16">
        <div className="flex flex-col items-start gap-2 min-w-40">
          <div className="text-[var(--cw-footer-text-secondary)] font-mono text-sm tracking-wider">
            SOCIAL
          </div>
          <a
            href="https://x.com/chadwallet"
            className="text-sm hover:text-[var(--cw-text-primary)] text-[var(--cw-footer-text-secondary)] transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            X / Twitter
          </a>
          <a
            href="https://discord.gg/mdCjtyZ8G"
            className="text-sm hover:text-[var(--cw-text-primary)] text-[var(--cw-footer-text-secondary)] transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </a>
        </div>

        <div className="flex flex-col items-start gap-2 min-w-40">
          <div className="text-[var(--cw-footer-text-secondary)] font-mono text-sm tracking-wider">
            DOWNLOAD
          </div>
          <a
            href="https://apps.apple.com/us/app/chadwallet/id6757367474"
            className="text-sm hover:text-[var(--cw-text-primary)] text-[var(--cw-footer-text-secondary)] transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            App Store
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=xyz.chadwallet.www"
            className="text-sm hover:text-[var(--cw-text-primary)] text-[var(--cw-footer-text-secondary)] transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Play
          </a>
        </div>

        <div className="flex flex-col items-start gap-2 min-w-40">
          <div className="text-[var(--cw-footer-text-secondary)] font-mono text-sm tracking-wider">
            LEGAL
          </div>
          <Link
            className="text-sm hover:text-[var(--cw-text-primary)] text-[var(--cw-footer-text-secondary)] transition-colors"
            href="/privacy"
          >
            Privacy Policy
          </Link>
          <Link
            className="text-sm hover:text-[var(--cw-text-primary)] text-[var(--cw-footer-text-secondary)] transition-colors"
            href="/terms"
          >
            Terms of Service
          </Link>
        </div>
      </div>

      {/* Mobile copyright */}
      <div className="text-[var(--cw-footer-text-secondary)] block min-[800px]:hidden">
        © {year} ChadWallet
      </div>
    </footer>
  );
}
