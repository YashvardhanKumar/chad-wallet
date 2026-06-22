'use client';

import Image from 'next/image';
import { FEATURES } from '@/app/lib/constants';
import { motion } from 'framer-motion';

export default function Features() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter mb-4">
            never miss out again
          </h2>
          <p className="text-xl text-text-secondary tracking-tight">
            everything you need to trade memecoins on Solana
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.tag}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-3xl border border-border hover:border-white/12 transition-all duration-300 bg-surface"
            >
              {/* Tag */}
              <div className="px-6 pt-6">
                <span className="text-xs font-mono font-bold text-accent tracking-wider">
                  {feature.tag}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight px-6 pt-2 pb-4 leading-tight">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-text-secondary px-6 pb-4 leading-relaxed">
                {feature.description}
              </p>

              {/* Screenshot */}
              <div className="relative overflow-hidden">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  width={800}
                  height={450}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
