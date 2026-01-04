'use client';

import { motion } from 'framer-motion';
import { LegalSection } from './LegalSection';
import type { LegalSectionData } from './terms';

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

type Props = {
  title: string;
  subtitle?: string;
  sections: LegalSectionData[];
};

export function LegalPage({ title, subtitle, sections }: Props) {
  return (
    <section className="min-h-screen bg-[#f7f4ef] py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-10"
        >
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* Sections */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {sections.map((section) => (
            <LegalSection
              key={section.id}
              title={section.title}
              points={section.points}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
