import Header from './components/landing/Header';
import Hero from './components/landing/Hero';
import TokenBanner from './components/landing/TokenBanner';
import Features from './components/landing/Features';
import CtaSection from './components/landing/CtaSection';
import Footer from './components/landing/Footer';

export default function Home() {
  return (
    <div className="flex flex-col bg-background text-text-primary overflow-x-hidden selection:bg-accent/30 selection:text-white" style={{ minHeight: '100dvh' }}>
      <Header />
      <main className="flex-1 flex flex-col w-full">
        <Hero />
        <TokenBanner />
        <Features />
        <TokenBanner direction="right" />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
