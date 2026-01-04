'use client';

import { motion } from 'framer-motion';

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

type Props = {
  title: string;
  points: string[];
};

export function LegalSection({ title, points }: Props) {
  return (
    <motion.div
      variants={item}
      className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm"
    >
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
        {title}
      </h2>

      <ul className="space-y-2 text-sm text-gray-700 leading-relaxed list-disc list-inside">
        {points.map((point, idx) => (
          <li key={idx}>{point}</li>
        ))}
      </ul>
    </motion.div>
  );
}
