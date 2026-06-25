'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { FEATURES } from '@/app/lib/constants';

export default function FeatureGrid() {
  // Divide features into rows of 3
  const row1 = FEATURES.slice(0, 3);
  const row2 = FEATURES.slice(3, 6);

  return (
    <div className="pt-8 min-[800px]:py-2 px-3 min-[800px]:px-20 flex flex-col self-stretch min-[500px]:self-center gap-13 max-w-[1400px] mx-auto">
      {/* Section heading - desktop */}
      <div className="hidden min-[800px]:flex flex-col gap-3">
        <h2 className="text-5xl min-[800px]:text-[60px] tracking-tighter leading-tight font-bold">
          never miss out again
        </h2>
        <p className="text-[#EAEDFF99] leading-6 text-2xl">
          the only memecoin trading app you need
        </p>
      </div>

      {/* Mobile heading */}
      <div className="flex min-[800px]:hidden flex-col gap-2 text-center">
        <h2 className="text-3xl tracking-tighter leading-tight font-bold">
          never miss out again
        </h2>
        <p className="text-[#EAEDFF99] text-base">
          the only memecoin trading app you need
        </p>
      </div>

      <div className="flex flex-col gap-3 min-[800px]:gap-6">
        {/* Row 1 */}
        <div className="flex flex-col min-[800px]:flex-row gap-3 min-[800px]:gap-6 items-start">
          {row1.map((feature, index) => (
            <FeatureCard key={feature.tag} feature={feature} index={index} />
          ))}
        </div>

        {/* Row 2 */}
        <div className="flex flex-col min-[800px]:flex-row gap-3 min-[800px]:gap-6 items-start">
          {row2.map((feature, index) => (
            <FeatureCard key={feature.tag} feature={feature} index={index + 3} />
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

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="feature-card group flex-1 min-w-0 shrink pt-8 pb-0 flex flex-col gap-2 min-[800px]:aspect-square"
    >
      <div className="font-mono text-accent px-8 font-bold text-sm tracking-wider">
        {feature.tag}
      </div>
      <h3 className="text-2xl leading-8 tracking-tight min-[800px]:text-3xl min-[800px]:leading-10 px-8 font-bold">
        {feature.title}
      </h3>
      <p className="text-sm text-[var(--cw-text-secondary)] px-8 leading-relaxed">
        {feature.description}
      </p>
      <div className="min-h-0 flex-1">
        <Image
          loading="lazy"
          src={feature.image}
          alt={feature.title}
          width={800}
          height={600}
          className="w-full h-full object-contain object-bottom transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    </motion.div>
  );
}
