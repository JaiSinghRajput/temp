"use client";
import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/effect-fade";

const images = [
    "https://shop.dreamweddinghub.com/public/uploads/banners/17515150418436.png",
    "https://shop.dreamweddinghub.com/public/uploads/banners/17515229842368.png",
    "https://shop.dreamweddinghub.com/public/uploads/banners/17515229068234.png",
];

export default function HeroSection() {
    const swiperRef = useRef<SwiperType | null>(null);

    return (
        <section className="grid grid-cols-1 lg:grid-cols-2 items-center px-6 lg:px-20 py-20 gap-16">

            {/* Left Content */}
            <div>
                <p className="text-sm tracking-[0.3em] text-gray-500 mb-4">
                    WELCOME TO DREAM WEDDING HUB SHOP
                </p>
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                    Exclusive Wedding Collection.
                </h1>
            </div>

            {/* Right Images */}
            <div className="flex items-center justify-center relative">

                {/* Main Image */}
                <Swiper
                    modules={[EffectFade]}
                    effect="fade"
                    onSwiper={(swiper) => (swiperRef.current = swiper)}
                    className="w-105 h-105 rounded-md overflow-hidden shadow-lg"
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

                {/* Circle Thumbnails */}
                <div className="flex flex-col gap-6 ml-8">
                    {images.slice(0, 3).map((img, i) => (
                        <button
                            key={i}
                            onClick={() => swiperRef.current?.slideTo(i)}
                            className="w-20 h-20 rounded-full overflow-hidden border-2 border-transparent hover:border-[#d6b48c] transition-all duration-300 hover:scale-105"
                        >
                            <img
                                src={img}
                                alt="Thumbnail"
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
