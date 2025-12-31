import React from "react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  backgroundImage?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  breadcrumbs,
  backgroundImage,
}) => {
  return (
    <section
      className="relative w-full h-65 flex items-center justify-center"
      style={{
        backgroundImage: backgroundImage
          ? `url(${backgroundImage})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/80"></div>

      {/* Content */}
      <div className="relative z-10 text-center">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-wide text-black uppercase">
          {title}
        </h1>

        {/* Breadcrumb */}
        <div className="mt-3 text-sm text-[#d18b47] tracking-wide">
          {breadcrumbs.map((item, index) => (
            <span key={index}>
              {item.href ? (
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className="text-black">{item.label}</span>
              )}

              {index < breadcrumbs.length - 1 && (
                <span className="mx-2">{">"}</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PageHeader;
