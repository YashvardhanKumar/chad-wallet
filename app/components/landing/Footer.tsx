import Image from 'next/image';
import { STORE_LINKS, SOCIAL_LINKS } from '@/app/lib/constants';
import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border px-6 sm:px-10 pt-12 pb-16">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 items-start justify-between">
        {/* Brand */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo-dark.png"
                alt="ChadWallet"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="text-xl font-bold">ChadWallet</span>
            </Link>
            <p className="text-text-secondary text-lg tracking-tight">
              the only wallet you need.
            </p>
          </div>
          <div className="text-text-tertiary text-sm hidden lg:block">
            © {year} ChadWallet. All rights reserved.
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-col sm:flex-row gap-10 sm:gap-16">
          {/* Download */}
          <div className="flex flex-col gap-3">
            <span className="text-text-tertiary text-xs font-mono tracking-wider">DOWNLOAD</span>
            <a
              href={STORE_LINKS.ios}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-primary hover:text-text-secondary transition-colors"
            >
              App Store
            </a>
            <a
              href={STORE_LINKS.android}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-primary hover:text-text-secondary transition-colors"
            >
              Google Play
            </a>
          </div>

          {/* Social */}
          <div className="flex flex-col gap-3">
            <span className="text-text-tertiary text-xs font-mono tracking-wider">SOCIAL</span>
            <a
              href={SOCIAL_LINKS.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-primary hover:text-text-secondary transition-colors"
            >
              X / Twitter
            </a>
            <a
              href={SOCIAL_LINKS.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-primary hover:text-text-secondary transition-colors"
            >
              Website
            </a>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <span className="text-text-tertiary text-xs font-mono tracking-wider">LEGAL</span>
            <a href="#" className="text-sm text-text-primary hover:text-text-secondary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-text-primary hover:text-text-secondary transition-colors">
              Terms of Service
            </a>
          </div>
        </div>

        {/* Mobile copyright */}
        <div className="text-text-tertiary text-sm lg:hidden">
          © {year} ChadWallet. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
