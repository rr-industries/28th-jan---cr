"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, Image as ImageIcon, Phone, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Menu", href: "/menu", icon: UtensilsCrossed },
  { label: "About", href: "/about", icon: Info },
  { label: "Gallery", href: "/gallery", icon: ImageIcon },
  { label: "Contact", href: "/contact", icon: Phone },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-white/80 backdrop-blur-md px-2 pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-colors",
              isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
            <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
