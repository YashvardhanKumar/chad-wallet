'use client';

import { FEATURES } from '@/app/lib/constants';

export default function FeatureGrid() {
  const row1 = FEATURES.slice(0, 3);
  const row2 = FEATURES.slice(3, 6);

  return (
    <div className="pt-8 desktop:py-10 px-3 desktop:px-20 flex flex-col self-stretch min-[500px]:self-center gap-13 max-w-[1400px] mx-auto">
      <div className="hidden desktop:flex flex-col gap-3 text-center">
        <h2 className="text-[60px] tracking-tighter leading-15 font-bold">
          never miss out again
        </h2>
        <p className="text-[#EAEDFF99] leading-6 text-[28px]">
          the only memecoin trading app you need
        </p>
      </div>

      <div className="flex desktop:hidden flex-col gap-2 text-center">
        <h2 className="text-3xl tracking-tighter leading-tight font-bold">
          never miss out again
        </h2>
        <p className="text-text-tertiary text-base">
          the only memecoin trading app you need
        </p>
      </div>

      <div className="flex flex-col gap-3 desktop:gap-6">
        <div className="flex flex-col desktop:flex-row gap-3 desktop:gap-6 items-start">
          {row1.map((feature) => (
            <FeatureCard key={feature.tag} feature={feature} />
          ))}
        </div>

        <div className="flex flex-col desktop:flex-row gap-3 desktop:gap-6 items-start">
          {row2.map((feature) => (
            <FeatureCard key={feature.tag} feature={feature} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface Feature {
  tag: string;
  title: string;
  description: string;
  image: string;
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div className="group flex-1 min-w-0 shrink pt-4 pb-0 rounded-[25px] flex flex-col overflow-hidden gap-2 border border-bg-tertiary hover:border-white/12 transition-colors duration-300 bg-bg-secondary desktop:aspect-square">
      <div className="font-mono text-accent-primary px-4 font-bold">
        {feature.tag}
      </div>
      <h3 className="text-[28px] leading-8 tracking-tight desktop:text-[36px] desktop:leading-10 px-4 font-bold">
        {feature.title}
      </h3>
      <div className="min-h-0 flex-1">
        <img
          loading="lazy"
          src={feature.image}
          alt={feature.title}
          className="w-full h-full object-contain object-bottom transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    </div>
  );
}
