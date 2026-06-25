import Link from 'next/link';
import Image from 'next/image';

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="px-10 pt-8 pb-12 flex flex-col desktop:flex-row gap-10 items-start justify-between max-w-[1400px] mx-auto w-full">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Link
            aria-label="ChadWallet home"
            className="flex items-center gap-2 text-text-primary"
            href="/"
          >
            <Image
              src="/images/logo-light.png"
              alt="ChadWallet"
              width={30}
              height={30}
              className="h-7 w-7 rounded-lg"
            />
            <span className="text-xl font-black tracking-tight">ChadWallet</span>
          </Link>
          <div className="text-2xl text-text-secondary leading-7 tracking-tighter">
            where degens become legends.
          </div>
        </div>
        <div className="text-text-tertiary hidden desktop:block">
          © {year} ChadWallet
        </div>
      </div>

      <div className="flex items-start flex-col desktop:flex-row gap-8 desktop:gap-2">
        <div className="flex flex-col items-start gap-2 min-w-40">
          <div className="text-text-tertiary font-mono text-sm tracking-wider">SOCIAL</div>
          <a
            href="https://discord.gg/mdCjtyZ8G"
            className="text-sm hover:text-text-secondary text-text-tertiary transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </a>
          <a
            href="https://x.com/chadwallet"
            className="text-sm hover:text-text-secondary text-text-tertiary transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            X/Twitter
          </a>
        </div>

        <div className="flex flex-col items-start gap-2 min-w-40">
          <div className="text-text-tertiary font-mono text-sm tracking-wider">DOWNLOAD</div>
          <a
            href="https://apps.apple.com/us/app/chadwallet/id6757367474"
            className="text-sm hover:text-text-secondary text-text-tertiary transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            App Store
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=xyz.chadwallet.www"
            className="text-sm hover:text-text-secondary text-text-tertiary transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Play
          </a>
        </div>

        <div className="flex flex-col items-start gap-2 min-w-40">
          <div className="text-text-tertiary font-mono text-sm tracking-wider">LEGAL</div>
          <Link
            className="text-sm hover:text-text-secondary text-text-tertiary transition-colors"
            href="/privacy"
          >
            Privacy Policy
          </Link>
          <Link
            className="text-sm hover:text-text-secondary text-text-tertiary transition-colors"
            href="/terms"
          >
            Terms of Service
          </Link>
        </div>
      </div>

      <div className="text-text-tertiary block desktop:hidden">
        © {year} ChadWallet
      </div>
    </footer>
  );
}
