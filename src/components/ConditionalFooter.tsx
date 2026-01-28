"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on admin, staff dashboard, and menu routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff-dashboard") || pathname === "/menu") {
    return null;
  }
  
  return <Footer />;
}
