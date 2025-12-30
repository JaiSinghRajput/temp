import React from "react";
import Link from "next/link";

export interface DropdownItem {
  label: string;
  href: string;
}

interface NavbarDropdownProps {
  label: string;
  items: DropdownItem[];
}

const NavbarDropdown: React.FC<NavbarDropdownProps> = ({ label, items }) => {
  return (
    <div className="relative group">
      {/* Trigger */}
      <button className="flex items-center gap-1 uppercase hover:text-[#d18b47] transition-colors duration-200">
        {label}
        <span className="text-[#d18b47] font-semibold">+</span>
      </button>

      {/* Dropdown */}
      <div
        className="
          absolute top-full left-0 hidden group-hover:block w-64 bg-white shadow-lg z-50
          opacity-0 invisible translate-y-2
          group-hover:opacity-100 group-hover:visible group-hover:translate-y-0
          transition-all duration-300 ease-out
        "
      >
        <ul className="flex flex-col text-sm text-gray-800">
          {items.map((item, index) => (
            <li key={index}>
              <Link
                href={item.href}
                className="
                  group/item
                  flex items-center gap-3
                  px-4 py-3
                  transition-all duration-200 ease-out
                  hover:bg-[#eeb59f]
                  hover:text-white
                "
              >
                {/* Animated Arrow */}
                <span
                  className="
                    text-lg
                    opacity-0 -translate-x-2
                    group-hover/item:opacity-100
                    group-hover/item:translate-x-0
                    transition-all duration-200 ease-out
                  "
                >
                  ›
                </span>

                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NavbarDropdown;
