'use client';

import { ShoppingCartCheckout } from '@mui/icons-material';

type TemplateCardProps = {
  image: string;
  name: string;
  price: number;
  onAddToCart?: () => void;
};

export default function VideoCard({
  image,
  name,
  price,
  onAddToCart,
}: TemplateCardProps) {
  return (
    <div className="w-70 bg-white rounded-xs overflow-hidden shadow-sm border border-gray-200">
      
      {/* Image */}
      <div className="w-full aspect-3/5 bg-gray-100">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
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

        <button
          onClick={onAddToCart}
          className="
            h-9 w-9
            rounded-full
            flex items-center justify-center
            text-gray-700
            hover:bg-gray-100
            transition
          "
        >
          <ShoppingCartCheckout fontSize="small" />
        </button>
      </div>
    </div>
  );
}
