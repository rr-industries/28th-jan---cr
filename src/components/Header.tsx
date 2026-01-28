"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  // Hide header on admin, home page, and menu page
  if (pathname.startsWith("/admin") || pathname === "/" || pathname === "/menu") return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="container flex h-16 items-center justify-center px-4 relative">
        <Link href="/" className="flex items-center gap-3 group">
          <Coffee className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
          <span className="text-2xl font-serif font-bold tracking-tight text-primary">
            CAFE REPUBLIC
          </span>
        </Link>
        <Link href="/admin/login" className="cursor-default opacity-0 absolute right-4">.</Link>
      </div>
    </header>
  );
}
