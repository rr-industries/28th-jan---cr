"use client";

import { motion } from "framer-motion";
import { Star, Quote, MessageSquare, Heart, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/PageHero";

const reviews = [
  {
    name: "Priya Sharma",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop",
    rating: 5,
    date: "2 days ago",
    text: "Best coffee in town! The ambiance is perfect for both work and casual meetups. Their Signature Cappuccino is a must-try. The staff is incredibly friendly and remembers my order every time!",
    source: "Google"
  },
  {
    name: "Rahul Verma",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop",
    rating: 5,
    date: "1 week ago",
    text: "Their pasta is to die for. I come here every weekend with family. The Carbonara is authentic and creamy. Kids love the chocolate lava cake. Highly recommend for family outings!",
    source: "Google"
  },
  {
    name: "Anita Desai",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&auto=format&fit=crop",
    rating: 5,
    date: "2 weeks ago",
    text: "Love the cozy vibe and friendly staff. My go-to place for morning coffee. The croissants are freshly baked and absolutely delicious. Perfect spot to start my day!",
    source: "Zomato"
  },
  {
    name: "Vikram Patel",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&auto=format&fit=crop",
    rating: 5,
    date: "3 weeks ago",
    text: "As a coffee enthusiast, I can say their cold brew is exceptional. The beans are sourced well and you can taste the quality. The QR ordering system is super convenient!",
    source: "Google"
  },
  {
    name: "Sneha Reddy",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop",
    rating: 5,
    date: "1 month ago",
    text: "Had my birthday celebration here and the team went above and beyond. The decoration, the special cake, everything was perfect. Thank you Cafe Republic for the memories!",
    source: "Instagram"
  },
  {
    name: "Arjun Nair",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&auto=format&fit=crop",
    rating: 4,
    date: "1 month ago",
    text: "Great place for remote work. Fast WiFi, comfortable seating, and they don't rush you. The only reason for 4 stars is sometimes it gets crowded during weekends.",
    source: "Google"
  },
  {
    name: "Meera Iyer",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=100&auto=format&fit=crop",
    rating: 5,
    date: "2 months ago",
    text: "The Margherita Pizza here is hands down the best in the city. Thin crust, fresh basil, and perfect cheese pull. Paired with their iced latte - heaven!",
    source: "Zomato"
  },
  {
    name: "Karthik Menon",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&auto=format&fit=crop",
    rating: 5,
    date: "2 months ago",
    text: "Been coming here since they opened. The consistency in quality is remarkable. Whether it's coffee or food, you know exactly what to expect - excellence!",
    source: "Google"
  },
];

export default function ReviewsPage() {
  const averageRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="flex flex-col pb-20 md:pb-0">
      <PageHero 
        title="Guest Feedback"
        subtitle="Voices of Our Beloved Community"
        backgroundImage="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop"
      />

      {/* Stats Section */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="container px-4 max-w-6xl relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-8"
          >
            <Heart className="h-3 w-3 fill-current" />
            Social Proof
          </motion.div>
          
          <div className="flex flex-col items-center justify-center gap-12">
            <div>
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-7xl font-serif font-bold text-primary">{averageRating}</span>
                <div className="flex flex-col items-start">
                  <div className="flex text-yellow-500 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-6 w-6 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Aggregate Score</span>
                </div>
              </div>
              <p className="text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
                Trusted by <span className="text-primary font-bold">500+</span> happy customers across all major platforms.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl">
              {[
                { label: "Google", value: "4.9/5", icon: MapPin },
                { label: "Zomato", value: "4.8/5", icon: MessageSquare },
                { label: "Instagram", value: "10K+", icon: Heart },
                { label: "TripAdvisor", value: "4.9/5", icon: Star }
              ].map((stat, i) => (
                <div key={i} className="p-6 rounded-[2rem] bg-muted/30 border border-primary/5">
                  <stat.icon className="h-5 w-5 mx-auto mb-3 text-primary opacity-50" />
                  <p className="text-xl font-serif font-bold text-primary mb-1">{stat.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-24 bg-muted/20 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl" />
        <div className="container px-4 max-w-7xl relative z-10">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-[2.5rem] bg-white p-10 shadow-xl shadow-primary/5 border border-primary/5 hover:border-primary/20 transition-all group relative overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 opacity-[0.03] transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12">
                  <Quote className="h-24 w-24" />
                </div>
                
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 overflow-hidden rounded-2xl shadow-lg border-2 border-white">
                      <img src={review.avatar} alt={review.name} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{review.name}</h3>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{review.date}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-primary/5 px-3 py-1 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/10">
                    {review.source}
                  </div>
                </div>
                
                <div className="mb-6 flex text-yellow-500 gap-1">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-current" />
                  ))}
                  {[...Array(5 - review.rating)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-gray-100" />
                  ))}
                </div>
                
                <p className="text-muted-foreground font-medium leading-relaxed italic relative z-10">
                  "{review.text}"
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-24 text-secondary relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="container px-4 relative z-10">
          <h2 className="mb-6 text-4xl md:text-5xl font-serif font-bold italic">Share Your <span className="text-white not-italic">Experience</span></h2>
          <p className="mx-auto mb-10 max-w-xl text-secondary/80 text-lg font-medium leading-relaxed">
            Every review helps us perfect our craft. We'd love to hear your thoughts on your recent visit.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="secondary" className="h-16 rounded-full px-10 text-lg font-bold shadow-2xl hover:scale-105 transition-transform">
              <Link href="/menu">Order Again</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-16 rounded-full px-10 text-lg font-bold border-2 text-white hover:bg-white hover:text-primary transition-all">
              <a href="https://g.page/review" target="_blank" rel="noopener noreferrer">
                Write a Review
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
