'use client';

import React from 'react';
import Link from 'next/link';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaPinterestP } from 'react-icons/fa';
import { FaXTwitter, FaYoutube } from "react-icons/fa6";
const Footer: React.FC = () => {
  return (
    <footer className="bg-[#fff5f1] text-gray-600">
      {/* Top section */}
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand & Address */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#d18b47]">
            Dream Wedding Hub
          </h2>
          <p className="text-sm leading-relaxed">
            D-07, 7th Floor, Capital Galleria Mall,
            <br />
            Manu Marg, Kabir Colony, Alwar,
            <br />
            Rajasthan 301001.
          </p>
          <p className="text-sm text-[#d18b47]">
            shop.dreamweddinghub.com
          </p>
          <p className="text-sm text-[#d18b47] font-medium">
            9376717777
          </p>
        </div>

        {/* Links */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Links.</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/e-card" className="hover:text-[#d18b47] transition">
                E-Card
              </Link>
            </li>
            <li>
              <Link
                href="/e-videos"
                className="hover:text-[#d18b47] transition"
              >
                Invitation Video
              </Link>
            </li>
          </ul>
        </div>

        {/* Important Links */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Some Important Links
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/return-policy"
                className="hover:text-[#d18b47] transition"
              >
                Return Policy
              </Link>
            </li>
            <li>
              <Link
                href="/refund-policy"
                className="hover:text-[#d18b47] transition"
              >
                Refund Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms-conditions"
                className="hover:text-[#d18b47] transition"
              >
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="hover:text-[#d18b47] transition"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Contact Us.</h3>
          <p className="text-sm leading-relaxed mb-4">
            Welcome to Dream Wedding Hub, your perfect shop for unique wedding
            gifts, e-cards, and e-videos. We specialize in creating personalized
            digital invitations and memorable gifts.
          </p>

          <div className="flex space-x-3">
            <a
              href="https://www.facebook.com/dreamweddinghubb"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-[#d18b47] hover:text-white hover:border-[#d18b47] transition"
            >
              <FaFacebookF size={14} />
            </a>

            <a
              href="https://www.instagram.com/dreamweddinghub/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-[#d18b47] hover:text-white hover:border-[#d18b47] transition"
            >
              <FaInstagram size={16} />
            </a>

            <a
              href="https://www.pinterest.com/dreamweddinghub1"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Pinterest"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-[#d18b47] hover:text-white hover:border-[#d18b47] transition"
            >
              <FaPinterestP size={16} />
            </a>
            <a
              href="https://www.linkedin.com/company/dream-wedding-hub"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="linkedin"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-[#d18b47] hover:text-white hover:border-[#d18b47] transition"
            >
              <FaLinkedinIn size={16} />
            </a>
            <a
              href="https://x.com/dreamweddinghub"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="x"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-[#d18b47] hover:text-white hover:border-[#d18b47] transition"
            >
              <FaXTwitter size={16} />
            </a>
            <a
              href="https://www.youtube.com/@DreamWeddingHub"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-[#d18b47] hover:text-white hover:border-[#d18b47] transition"
            >
              <FaYoutube size={16} />
            </a>
          </div>

        </div>
      </div>

      {/* Bottom section */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            ©2025 Copyright Dream Wedding Hub. All rights reserved.
          </p>

          {/* Payment Icons */}
          <div className="flex items-center gap-3">
            {['VISA', 'Mastercard', 'AMEX'].map((card) => (
              <div
                key={card}
                className="px-3 py-2 bg-white rounded shadow text-xs font-semibold text-gray-600"
              >
                {card}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
