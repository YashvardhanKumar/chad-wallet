import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-8 px-4 pb-8 pt-0 max-[760px]:px-2" style={{ backgroundColor: 'var(--cw-footer-bg)' }}>
      <div className="mx-auto flex w-full max-w-[760px] flex-wrap justify-center gap-1.5">
        <Link
          className="rounded-md px-3 py-1.5 text-[0.82rem] transition-colors text-[var(--cw-footer-text-secondary)] hover:text-[var(--cw-footer-text-primary)]"
          href="/terms"
        >
          Terms of Service
        </Link>
        <Link
          className="rounded-md px-3 py-1.5 text-[0.82rem] transition-colors text-[var(--cw-footer-text-secondary)] hover:text-[var(--cw-footer-text-primary)]"
          href="/privacy"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
