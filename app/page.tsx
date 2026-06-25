import LandingHeader from './components/landing/LandingHeader';
import HeroSection from './components/landing/HeroSection';
import AppShowcase from './components/landing/AppShowcase';
import FeatureGrid from './components/landing/FeatureGrid';
import BottomCta from './components/landing/BottomCta';
import LandingFooter from './components/landing/LandingFooter';

export default function Home() {
  return (
    <div
      className="relative isolate flex flex-col min-h-svh overflow-x-hidden"
      style={{ backgroundColor: 'var(--cw-bg-app)' }}
    >
      <LandingHeader />

      <HeroSection />

      <AppShowcase />

      <FeatureGrid />

      <BottomCta />

      <LandingFooter />
    </div>
  );
}
