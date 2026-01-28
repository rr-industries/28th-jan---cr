"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  backgroundImage: string;
  className?: string;
}

export function PageHero({ title, subtitle, backgroundImage, className }: PageHeroProps) {
  return (
    <section className={cn("relative h-[40vh] min-h-[400px] w-full overflow-hidden", className)}>
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 hover:scale-105"
        style={{ 
          backgroundImage: `url('${backgroundImage}')`,
          filter: "brightness(0.6)"
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
      <div className="relative flex h-full flex-col items-center justify-center px-4 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-4"
        >
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight drop-shadow-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xl md:text-2xl text-secondary font-medium tracking-wide drop-shadow-md italic">
              {subtitle}
            </p>
          )}
          <div className="mx-auto mt-6 h-1 w-24 bg-secondary rounded-full shadow-lg" />
        </motion.div>
      </div>
    </section>
  );
}
