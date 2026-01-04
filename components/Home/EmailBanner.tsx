'use client';

import { useState } from 'react';

export default function EmailBanner() {
  const [email, setEmail] = useState('');

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <section className="relative w-full py-16 sm:py-20 flex justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1920')",
        }}
      />
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative w-full max-w-5xl px-6">
        <div className="bg-[#fbf1eb] rounded-xl py-10 px-6 sm:px-10 shadow-sm">
          <div className="relative">
            {/* Input */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="
                w-full h-14
                rounded-full
                pl-6 pr-36
                text-base
                text-gray-700
                placeholder-gray-500
                border border-gray-200
                outline-none
                focus:ring-2
                focus:ring-[#d18b47]/40
                transition
              "
            />

            {/* Hidden / Appearing Button */}
            <button
              type="button"
              disabled={!isValidEmail}
              className={`
                absolute right-2 top-1/2 -translate-y-1/2
                h-10 px-5
                rounded-full
                bg-[#d18b47]
                text-white text-sm font-semibold
                transition-all duration-300 cursor-pointer
                ${
                  isValidEmail
                    ? 'opacity-100 translate-x-0 pointer-events-auto'
                    : 'opacity-0 translate-x-2 pointer-events-none'
                }
              `}
            >
              Subscribe Newsletter
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
