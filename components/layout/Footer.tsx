import React from "react";

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
            +91 9376717777
          </p>
        </div>

        {/* Links */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Links.</h3>
          <ul className="space-y-2 text-sm">
            <li className="hover:text-[#d18b47] cursor-pointer">E-Card</li>
            <li className="hover:text-[#d18b47] cursor-pointer">
              Invitation Video
            </li>
          </ul>
        </div>

        {/* Important Links */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Some Important Links
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="hover:text-[#d18b47] cursor-pointer">
              Return Policy
            </li>
            <li className="hover:text-[#d18b47] cursor-pointer">
              Refund Policy
            </li>
            <li className="hover:text-[#d18b47] cursor-pointer">
              Terms & Condition
            </li>
            <li className="hover:text-[#d18b47] cursor-pointer">
              Sign in
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

          {/* Social Icons */}
          <div className="flex space-x-3">
            {["f", "in", "p"].map((icon) => (
              <div
                key={icon}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:bg-[#d18b47] hover:text-white hover:border-[#d18b47] cursor-pointer transition"
              >
                {icon}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            ©2025 CopyRight Dream Wedding Hub. All rights reserved.
          </p>

          {/* Payment Icons */}
          <div className="flex items-center gap-3">
            {["VISA", "Mastercard", "AMEX"].map((card, i) => (
              <div
                key={i}
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
