"use client";

import { motion } from "framer-motion";
import { Coffee, Heart, Users, Award, Leaf, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/PageHero";

export default function AboutPage() {
  return (
    <div className="flex flex-col pb-20 md:pb-0">
      <PageHero 
        title="Our Story"
        subtitle="Brewing Happiness Since 2019"
        backgroundImage="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2070&auto=format&fit=crop"
      />

      {/* Story Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="container px-4 max-w-6xl relative z-10">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                <Coffee className="h-3 w-3" />
                Heritage
              </div>
              <h2 className="mb-8 text-4xl md:text-5xl font-serif font-bold leading-tight">Where It All <span className="text-primary italic">Began</span></h2>
              <div className="space-y-6 text-lg leading-relaxed text-muted-foreground font-medium">
                <p>
                  Cafe Republic was born from a simple dream – to create a space where great coffee meets warm hospitality. 
                  Founded in 2019 by two coffee enthusiasts, Arjun and Meera, our cafe started as a small corner shop 
                  with just 4 tables and a passion for the perfect brew.
                </p>
                <p>
                  Today, we've grown into a beloved community hub, but our core values remain unchanged: 
                  quality ingredients, handcrafted beverages, and a welcoming atmosphere that feels like home.
                </p>
                <p>
                  Every cup we serve carries our commitment to excellence. From sourcing the finest Arabica beans 
                  from Coorg to training our baristas in the art of latte art, we obsess over every detail.
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-2 gap-6"
            >
              <div className="aspect-[3/4] overflow-hidden rounded-[2.5rem] shadow-2xl shadow-primary/10">
                <img 
                  src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=1200&auto=format&fit=crop" 
                  alt="Coffee Beans" 
                  className="h-full w-full object-cover transition-transform duration-1000 hover:scale-110"
                />
              </div>
              <div className="aspect-[3/4] overflow-hidden rounded-[2.5rem] shadow-2xl shadow-primary/10 mt-12">
                <img 
                  src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop" 
                  alt="Barista at work" 
                  className="h-full w-full object-cover transition-transform duration-1000 hover:scale-110"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-muted/30 py-24 relative overflow-hidden">
        <div className="container px-4 max-w-6xl relative z-10">
          <div className="mb-16 text-center">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">What We Stand For</h2>
            <p className="text-muted-foreground font-medium">The pillars of our craft</p>
            <div className="mx-auto mt-4 h-1.5 w-24 bg-primary rounded-full" />
          </div>
  
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Coffee, title: "Quality First", desc: "We source only the finest ingredients and never compromise on taste." },
              { icon: Heart, title: "Made with Love", desc: "Every dish and drink is crafted with passion and attention to detail." },
              { icon: Users, title: "Community Focus", desc: "We're more than a cafe – we're a gathering place for our neighborhood." },
              { icon: Leaf, title: "Sustainability", desc: "Eco-friendly practices from farm to cup, because we care about tomorrow." },
              { icon: Award, title: "Excellence", desc: "Award-winning recipes and trained baristas ensure the best experience." },
              { icon: Clock, title: "Consistency", desc: "Same great taste, every single time you visit us." },
            ].map((value, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-[2.5rem] bg-white p-10 shadow-xl shadow-primary/5 border border-primary/5 hover:border-primary/20 transition-all group"
                >
                  <div className="mb-6 inline-flex rounded-2xl bg-primary/5 p-4 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    <value.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{value.title}</h3>
                  <p className="text-muted-foreground font-medium leading-relaxed">{value.desc}</p>
                </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container px-4 max-w-6xl relative z-10">
          <div className="mb-16 text-center">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">Meet Our Team</h2>
            <p className="text-muted-foreground font-medium">The experts behind the counter</p>
            <div className="mx-auto mt-4 h-1.5 w-24 bg-primary rounded-full" />
          </div>
  
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Arjun Mehta", role: "Founder & Head Barista", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop" },
              { name: "Meera Kapoor", role: "Co-Founder & Chef", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop" },
              { name: "Vikram Singh", role: "Operations Manager", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop" },
              { name: "Priya Nair", role: "Head of Experience", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop" },
            ].map((member, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center group"
              >
                <div className="mx-auto mb-6 h-48 w-48 overflow-hidden rounded-full shadow-2xl shadow-primary/10 border-4 border-white">
                  <img src={member.img} alt={member.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
                <h3 className="text-xl font-bold mb-1">{member.name}</h3>
                <p className="text-sm text-primary font-black uppercase tracking-widest">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-24 text-secondary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="container px-4 text-center relative z-10">
          <h2 className="mb-6 text-4xl md:text-5xl font-serif font-bold italic">Come Experience <span className="text-white not-italic">Cafe Republic</span></h2>
          <p className="mx-auto mb-10 max-w-xl text-secondary/80 text-lg font-medium leading-relaxed">
            We'd love to have you visit and see what makes us special. Join us for a cup of excellence today.
          </p>
          <Button asChild size="lg" variant="secondary" className="h-16 rounded-full px-12 text-lg font-bold shadow-2xl hover:scale-105 transition-transform">
            <Link href="/contact">Visit Us Today</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
