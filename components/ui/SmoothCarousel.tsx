"use client";

import Link from "next/link";
import React, { useRef } from "react";

interface CarouselItem {
  id: number | string;
  image: string;
  title?: string;
  link?: string;
}

interface SmoothCarouselProps {
  items: CarouselItem[];
  visibleItems?: number;
  title?: string;
}

const SmoothCarousel: React.FC<SmoothCarouselProps> = ({
  items,
  visibleItems = 5,
  title = "Hello world",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldCenter = items.length <= visibleItems;
  const showNav = items.length > visibleItems;

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;

    const scrollAmount =
      containerRef.current.offsetWidth / visibleItems;

    containerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Carousel */}
      <h2 className="text-2xl font-semibold mb-6 text-center">
        <span className="border-b-2 border-b-red-300 px-2">{title}</span>
      </h2>

      <div
        ref={containerRef}
        className={`
          flex overflow-x-auto scroll-smooth scrollbar-hide w-full
          ${shouldCenter ? 'justify-center gap-4' : ''}
        `}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="min-w-65 md:min-w-70 lg:min-w-75 shrink-0 flex justify-center"
          >
            <Link href={`${item.link || "#"}`} className="block">
              <img
                src={item.image}
                alt={item.title || "carousel item"}
                className="w-60 h-auto rounded-md shadow-md mx-auto"
              />
              {item.title && (
                <p className="mt-2 text-center text-sm text-gray-700">{item.title}</p>
              )}
            </Link>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      {showNav && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => scroll("left")}
            className="
              h-10 w-10 flex items-center justify-center
              rounded bg-[#c9a15f] text-white
              hover:bg-[#b18c52] transition
            "
          >
            ‹
          </button>

          <button
            onClick={() => scroll("right")}
            className="
              h-10 w-10 flex items-center justify-center
              rounded bg-[#c9a15f] text-white
              hover:bg-[#b18c52] transition
            "
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default SmoothCarousel;
