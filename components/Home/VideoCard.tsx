'use client';

import { ShoppingCartCheckout } from '@mui/icons-material';
import Link from 'next/link';
type TemplateCardProps = {
  image: string;
  name: string;
  price: number;
  link?: string;
};

export default function VideoCard({
  image,
  name,
  price,
  link
}: TemplateCardProps) {
  return (
    <div className="w-70 bg-white rounded-xs overflow-hidden shadow-sm border border-gray-200">
      {/* Image */}
      <div className="w-full aspect-3/5 bg-gray-100">
        <Link href={link || '#'} target="_parent" rel="noopener noreferrer">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
        </Link>
      </div>

      {/* Bottom Info */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#d18b47] leading-tight">
            {name}
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            ₹{price.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
