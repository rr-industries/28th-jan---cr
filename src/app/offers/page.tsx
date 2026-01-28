"use client";

import { motion } from "framer-motion";
import { Clock, Percent, Gift, Zap, Calendar, Users, Star, ArrowRight, Coffee } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/PageHero";

const offers = [
  {
    icon: Clock,
    title: "Happy Hours",
    subtitle: "3PM - 6PM Daily",
    discount: "20% OFF",
    description: "Get 20% off on all beverages during our happy hours. Perfect for your afternoon coffee break!",
    terms: "Valid on all beverages. Cannot be combined with other offers.",
    color: "bg-orange-500",
    featured: true
  },
  {
    icon: Calendar,
    title: "Weekend Brunch",
    subtitle: "Sat & Sun 9AM-12PM",
    discount: "COMBO ₹399",
    description: "Start your weekend right with our special brunch combo: Any coffee + Croissant + Fresh Juice at just ₹399!",
    terms: "Available Saturday & Sunday only. While stocks last.",
    color: "bg-green-500",
    featured: true
  },
  {
    icon: Users,
    title: "Group Discount",
    subtitle: "4+ People",
    discount: "15% OFF",
    description: "Coming with friends or colleagues? Enjoy 15% off on your total bill when dining with 4 or more people.",
    terms: "Minimum 4 people. Valid on dine-in only.",
    color: "bg-blue-500",
    featured: false
  },
  {
    icon: Gift,
    title: "Birthday Special",
    subtitle: "On Your Birthday",
    discount: "FREE CAKE",
    description: "Celebrate your special day with us! Get a complimentary slice of cake on your birthday.",
    terms: "Valid ID required. One per person per year.",
    color: "bg-pink-500",
    featured: false
  },
  {
    icon: Zap,
    title: "First Order",
    subtitle: "New Customers",
    discount: "₹100 OFF",
    description: "New to Cafe Republic? Get ₹100 off on your first order of ₹500 or more!",
    terms: "Valid for first-time customers only. Minimum order ₹500.",
    color: "bg-purple-500",
    featured: false
  },
  {
    icon: Percent,
    title: "Student Discount",
    subtitle: "With Valid ID",
    discount: "10% OFF",
    description: "Students get 10% off on all orders. Just show your valid student ID at checkout!",
    terms: "Valid student ID required. Cannot combine with other offers.",
    color: "bg-indigo-500",
    featured: false
  },
];

export default function OffersPage() {
  return (
    <div className="flex flex-col pb-20 md:pb-0">
      <PageHero 
        title="Offers & Deals"
        subtitle="Exclusive Rewards for Our Community"
        backgroundImage="https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=2070&auto=format&fit=crop"
      />

      {/* Featured Offers */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="container max-w-6xl mx-auto px-4 relative z-10">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
              <Star className="h-3 w-3 fill-current" />
              Hot Deals
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold">Featured <span className="text-primary italic">Promotions</span></h2>
            <div className="mx-auto mt-4 h-1.5 w-24 bg-primary rounded-full shadow-lg" />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {offers.filter(o => o.featured).map((offer, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-[2.5rem] bg-primary p-10 text-secondary shadow-2xl shadow-primary/20 border border-white/5"
              >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 transition-transform duration-1000 group-hover:scale-125" />
                <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/5" />
                
                <div className="relative z-10">
                  <div className={`mb-6 inline-flex rounded-2xl ${offer.color} p-4 shadow-xl`}>
                    <offer.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <div className="mb-6">
                    <span className="text-5xl font-serif font-black tracking-tight text-white">{offer.discount}</span>
                    <h3 className="text-2xl font-bold mt-2">{offer.title}</h3>
                    <p className="text-secondary/70 font-medium">{offer.subtitle}</p>
                  </div>
                  
                  <p className="mb-8 text-lg text-secondary/90 leading-relaxed font-medium">{offer.description}</p>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-6 border-t border-white/10">
                    <span className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">*{offer.terms}</span>
                    <Button asChild variant="secondary" className="h-12 rounded-full px-8 font-bold shadow-lg hover:scale-105 transition-transform">
                      <Link href="/menu">
                        Claim Offer
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* All Offers Grid */}
      <section className="py-24 bg-muted/30 relative">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-serif font-bold">Ongoing Offers</h2>
            <p className="text-muted-foreground font-medium mt-2">More ways to save every day</p>
            <div className="mx-auto mt-4 h-1 w-20 bg-primary/30 rounded-full" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="rounded-[2rem] bg-white p-8 shadow-xl shadow-primary/5 border border-primary/5 hover:border-primary/20 transition-all group"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className={`rounded-2xl ${offer.color} p-3 text-white shadow-lg`}>
                      <offer.icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-black text-primary uppercase tracking-widest">
                      {offer.discount}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">{offer.title}</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">{offer.subtitle}</p>
                    <p className="text-muted-foreground font-medium text-sm leading-relaxed">{offer.description}</p>
                  </div>
                  <div className="pt-4 border-t border-muted">
                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-tighter">*{offer.terms}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Loyalty Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container max-w-6xl mx-auto px-4 relative z-10">
          <div className="rounded-[3rem] bg-gradient-to-br from-[#fdfbf7] to-[#f5e6d3] p-8 md:p-16 border border-primary/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
            
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                  <Gift className="h-3 w-3" />
                  Rewards
                </div>
                <h2 className="mb-6 text-4xl md:text-5xl font-serif font-bold text-primary leading-tight">Join Our <span className="italic">Loyalty</span> Program</h2>
                <p className="mb-8 text-lg text-primary/70 font-medium leading-relaxed">
                  Earn points on every purchase and unlock exclusive rewards. Get a free coffee after every 10 purchases!
                </p>
                <div className="grid sm:grid-cols-2 gap-4 mb-10">
                  {[
                    "1 point per ₹10 spent",
                    "Exclusive member-only offers",
                    "Birthday bonus points",
                    "Early access to new items"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Star className="h-2.5 w-2.5 text-primary fill-current" />
                      </div>
                      <span className="text-sm font-bold text-primary/80">{item}</span>
                    </div>
                  ))}
                </div>
                <Button asChild size="lg" className="h-14 rounded-full px-10 font-bold shadow-xl shadow-primary/20">
                  <Link href="/contact">Join Now - It's Free!</Link>
                </Button>
              </div>
              
              <div className="flex justify-center perspective-[1000px]">
                <motion.div 
                  initial={{ rotateY: 20, rotateX: 10 }}
                  whileHover={{ rotateY: 0, rotateX: 0 }}
                  transition={{ duration: 0.8 }}
                  className="relative h-56 w-full max-w-[360px] rounded-[2rem] bg-gradient-to-br from-primary via-[#3a2b20] to-black p-8 text-white shadow-2xl border border-white/10"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-5 w-5 text-secondary" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/80">Cafe Republic</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary/40">GOLD MEMBER</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-secondary/30 mb-1">MEMBER IDENTITY</p>
                    <p className="text-xl font-serif font-bold tracking-tight">VIP CUSTOMER</p>
                  </div>
                  <div className="mt-8 flex justify-between items-end">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.3em] text-secondary/30 mb-1">POINTS BALANCE</p>
                      <p className="text-2xl font-serif font-bold text-secondary">2,450</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/5">
                      <Zap className="h-5 w-5 text-secondary" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-24 text-secondary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="container px-4 text-center relative z-10">
          <h2 className="mb-6 text-4xl md:text-5xl font-serif font-bold italic">Don't Miss <span className="text-white not-italic">The Best Deals</span></h2>
          <p className="mx-auto mb-10 max-w-xl text-secondary/80 text-lg font-medium leading-relaxed">
            Visit us today and take advantage of these amazing offers. Our team is ready to serve you.
          </p>
          <Button asChild size="lg" variant="secondary" className="h-16 rounded-full px-12 text-lg font-bold shadow-2xl hover:scale-105 transition-transform">
            <Link href="/menu">Order Now</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
