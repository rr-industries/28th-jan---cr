"use client";

import Link from "next/link";
import { Coffee, Instagram, Facebook, Twitter, MapPin, Phone, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="bg-primary text-secondary pt-20 pb-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <Coffee className="h-6 w-6" />
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight">CAFE REPUBLIC</span>
            </Link>
            <p className="text-secondary/70 mb-8 leading-relaxed font-medium">
              Brewing moments of happiness since 2019. Your neighborhood sanctuary for premium coffee and artisanal food.
            </p>
            <div className="flex gap-4">
              <a href="#" className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center hover:bg-secondary hover:text-primary transition-all">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center hover:bg-secondary hover:text-primary transition-all">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center hover:bg-secondary hover:text-primary transition-all">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4 text-secondary/70 font-medium">
              <li><Link href="/menu" className="hover:text-secondary transition-colors">Full Menu</Link></li>
              <li><Link href="/about" className="hover:text-secondary transition-colors">Our Story</Link></li>
              <li><Link href="/gallery" className="hover:text-secondary transition-colors">Gallery</Link></li>
              <li><Link href="/contact" className="hover:text-secondary transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6">Opening Hours</h4>
            <ul className="space-y-4 text-secondary/70 font-medium">
              <li className="flex justify-between">
                <span>Mon - Thu:</span>
                <span>7:00 AM - 10:00 PM</span>
              </li>
              <li className="flex justify-between font-bold text-secondary">
                <span>Fri - Sat:</span>
                <span>7:00 AM - 11:30 PM</span>
              </li>
              <li className="flex justify-between">
                <span>Sunday:</span>
                <span>8:00 AM - 10:00 PM</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6">Visit Us</h4>
            <ul className="space-y-4 text-secondary/70 font-medium">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 shrink-0" />
                <span>Wardha Rd, Nagpur - 440015</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0" />
                <span>+91 87888 39229</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0" />
                <span>hello@caferepublic.in</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary/10 pt-10 text-center text-secondary/50 text-sm font-medium">
          <p>&copy; {new Date().getFullYear()} Cafe Republic. All rights reserved<Link href="/admin/login" className="cursor-default opacity-0">.</Link> Crafted with Excellence.</p>
        </div>
      </div>
    </footer>
  );
}
