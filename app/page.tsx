import Header from './components/landing/Header';
import Hero from './components/landing/Hero';
import TokenBanner from './components/landing/TokenBanner';
import OutrunBots from './components/landing/OutrunBots';
import VideoSection from './components/landing/VideoSection';
import StoreBadges from './components/landing/StoreBadges';
import Footer from './components/landing/Footer';

export default function Home() {
  return (
    <main className="relative min-h-screen text-[var(--cw-text-primary)]" style={{ backgroundColor: 'var(--cw-bg-app)' }}>
      <section className="w-full pb-0 pt-0">
        <Header />
        <TokenBanner direction="right" />
      </section>

      <section className="flex flex-col items-center border-x-0 px-5 py-12 text-center shadow-[0_24px_44px_-34px_rgba(15,23,42,0.45)] sm:py-14">
        <Hero />
      </section>

      <section className="cw-mid-panel-texture cw-degen-grid w-full pb-0">
        <OutrunBots />
      </section>

      <section className="w-full pb-0">
        <VideoSection />
      </section>

      <section className="cw-screenshots-banner-reverse flex min-h-36 w-full items-center justify-center px-4 py-0 text-center max-[760px]:min-h-32 max-[760px]:px-0">
        <StoreBadges />
      </section>

      <TokenBanner direction="right" />

      <Footer />
    </main>
  );
}
