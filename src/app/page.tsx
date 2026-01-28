"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import HeroSlider from "@/components/HeroSlider";
import { TableBookingForm } from "@/components/TableBookingForm";
import { Button } from "@/components/ui/button";
import {
  Coffee,
  Wifi,
  Armchair,
  Leaf,
  Star,
  MapPin,
  ArrowRight,
  Quote,
  Instagram,
  Facebook,
  Twitter,
  Mail,
  Phone
} from "lucide-react";
import { motion } from "framer-motion";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  is_bestseller: boolean;
};

export default function HomePage() {
  const [bestSellers, setBestSellers] = useState<MenuItem[]>([]);

  useEffect(() => {
    fetchBestSellers();
  }, []);

  const fetchBestSellers = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("id, name, price, image_url, is_bestseller")
      .eq("is_bestseller", true)
      .eq("is_available", true)
      .limit(4);

    if (data) setBestSellers(data);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSlider />

      {/* Best Sellers */}
      {bestSellers.length > 0 && (
        <section className="py-24 bg-muted/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
                Our Best Sellers
              </h2>
              <p className="text-lg text-muted-foreground">
                Customer favorites you can't miss
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              {bestSellers.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -10 }}
                  className="bg-card rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/5 border border-primary/5 group"
                >
                  <div className="relative h-48">
                    <Image
                      src={item.image_url && item.image_url !== "" ? item.image_url : "/placeholder-food.jpg"}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                      <Star className="h-3 w-3 inline mr-1 fill-current" />
                      Bestseller
                    </div>
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="font-serif font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
                    <p className="text-primary font-bold text-xl">₹{item.price.toFixed(0)}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <Button size="lg" variant="outline" className="rounded-full px-10 h-14 border-2 font-bold group" asChild>
                <Link href="/menu">
                  View Full Menu
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Table Booking Section */}
      <section id="booking-section" className="py-32 bg-[#faf9f6] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full -translate-x-1/2 translate-y-1/2 blur-[120px]" />
        
        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            {/* Content Side */}
            <div className="lg:w-1/2 space-y-12">
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-[0.2em]"
                >
                  <Star className="h-3 w-3 fill-current" />
                  Reservations
                </motion.div>
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.1]"
                >
                  Reserve Your <br />
                  <span className="text-primary italic">Table</span>
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="text-xl text-muted-foreground max-w-xl leading-relaxed font-medium"
                >
                  Skip the wait and secure your spot in our cozy coffee sanctuary. Perfect for dates, meetings, or solo focus sessions.
                </motion.p>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="grid sm:grid-cols-2 gap-8"
              >
                {[
                  { icon: Armchair, title: "Cozy Seating", desc: "Premium comfort for long stays" },
                  { icon: Coffee, title: "Master Brews", desc: "Artisanal coffee experience" },
                  { icon: Wifi, title: "Gigabit Wifi", desc: "Perfect for digital nomads" },
                  { icon: Leaf, title: "Calm Vibes", desc: "Escape the city's hustle" }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="h-12 w-12 shrink-0 rounded-2xl bg-white shadow-xl shadow-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground font-medium">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Form Side */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="lg:w-1/2 w-full"
            >
              <div className="relative p-1">
                <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-2xl -rotate-1 scale-105 opacity-50" />
                <div className="relative bg-white border border-primary/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                  <div className="mb-10 text-center">
                    <h3 className="text-2xl font-serif font-bold mb-2">Booking Details</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Fill out the form below</p>
                  </div>
                  <TableBookingForm />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
