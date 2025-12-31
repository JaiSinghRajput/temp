"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  // For admin routes, render children without navbar and footer
  if (isAdminRoute) {
    return <>{children}</>;
  }
  // For non-admin routes, render with navbar and footer
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
