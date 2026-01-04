"use client";
import { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade } from "swiper/modules";
import { motion } from "framer-motion";

import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/effect-fade";

const images = [
    "https://shop.dreamweddinghub.com/public/uploads/banners/17515150418436.png",
    "https://shop.dreamweddinghub.com/public/uploads/banners/17515229842368.png",
    "https://shop.dreamweddinghub.com/public/uploads/banners/17515229068234.png",
];

export default function HeroSection({className}: {className?: string}) {
    const swiperRef = useRef<SwiperType | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <section className={`grid grid-cols-1 lg:grid-cols-2 items-center px-6 lg:px-20 py-20 gap-16 ${className ?? ''}`}>

            {/* Left Content */}
            <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                    duration: 0.8,
                    ease: "easeOut",
                }}
            >
                <motion.p
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                        duration: 0.6,
                        ease: "easeOut",
                        delay: 0.1,
                    }}
                    className="text-sm tracking-[0.3em] text-gray-500 mb-4"
                >
                    WELCOME TO DREAM WEDDING HUB SHOP
                </motion.p>

                <motion.h1
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                        duration: 1,
                        ease: "easeOut",
                        delay: 0.2,
                    }}
                    className="text-4xl lg:text-5xl font-bold leading-tight"
                >
                    Exclusive Wedding Collection.
                </motion.h1>
            </motion.div>


            {/* Right Images */}
            <div className="flex items-center justify-center relative">

                {/* Image Wrapper */}
                <div className="relative">

                    {/* Main Image */}
                    <Swiper
                        modules={[EffectFade]}
                        effect="fade"
                        onSwiper={(swiper) => (swiperRef.current = swiper)}
                        onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
                        className="w-105 h-105 lg:w-120 lg:h-120 rounded-xl overflow-hidden shadow-lg"
                    >
                        {images.map((img, i) => (
                            <SwiperSlide key={i}>
                                <img
                                    src={img}
                                    alt="Wedding Product"
                                    className="w-full h-full object-cover"
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    {/* Thumbnails */}
                    <div
                        className="
    z-10
    mt-4 lg:mt-0
    flex gap-4
    lg:flex-col
    justify-center
    lg:absolute
    lg:top-1/2
    lg:-translate-y-1/2
    lg:-right-12
  "
                    >
                        {images.map((img, i) => {
                            const isActive = activeIndex === i;

                            return (
                                <button
                                    key={i}
                                    onClick={() => swiperRef.current?.slideTo(i)}
                                    className={`
          relative
          w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20
          rounded-full
          overflow-hidden
          transition-all duration-300
          ${isActive
                                            ? 'scale-110 ring-2 ring-[#d6b48c] shadow-[0_0_0_6px_rgba(214,180,140,0.25)]'
                                            : 'border-2 border-white shadow-md hover:scale-105'
                                        }
        `}
                                >
                                    <img
                                        src={img}
                                        alt="Thumbnail"
                                        className="w-full h-full object-cover"
                                    />

                                    {isActive && (
                                        <span className="absolute inset-0 rounded-full ring-1 ring-white/60 pointer-events-none" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                </div>
            </div>

        </section>
    );
}
