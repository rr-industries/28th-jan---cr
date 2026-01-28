"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./HeroSlider.module.css";

const heroImages = [
  {
    src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop",
    alt: "Premium Coffee Experience",
    title: "Signature Brews",
    description: "Handcrafted with love"
  },
  {
    src: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1200&auto=format&fit=crop",
    alt: "Artisan Latte Art",
    title: "Artisan Lattes",
    description: "Every cup is a masterpiece"
  },
  {
    src: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=1200&auto=format&fit=crop",
    alt: "Cozy Cafe Interior",
    title: "Cozy Ambiance",
    description: "Your perfect escape"
  },
  {
    src: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop",
    alt: "Fresh Pastries",
    title: "Fresh Bakery",
    description: "Baked daily with passion"
  },
  {
    src: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=1200&auto=format&fit=crop",
    alt: "Coffee Beans",
    title: "Premium Beans",
    description: "Sourced from the finest farms"
  },
  {
    src: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=1200&auto=format&fit=crop",
    alt: "Delicious Pizza",
    title: "Italian Pizzas",
    description: "Wood-fired perfection"
  }
];

export default function HeroSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const getPositionClass = useCallback((imageIndex) => {
    const totalImages = heroImages.length;
    const diff = (imageIndex - currentIndex + totalImages) % totalImages;
    
    if (diff === 0) return styles.center;
    if (diff === 1) return styles.right20;
    if (diff === 2) return styles.right10;
    if (diff === totalImages - 1) return styles.left20;
    if (diff === totalImages - 2) return styles.left10;
    return styles.hidden;
  }, [currentIndex]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % heroImages.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  }, []);

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  return (
    <section 
      className={styles.heroSection}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <header className={styles.topBar}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </div>
          <span className={styles.logoText}>CAFE REPUBLIC</span>
        </Link>
      </header>

      <div className={styles.overlay} />
      
      <div className={styles.sliderContainer}>
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`${styles.slide} ${getPositionClass(index)}`}
            onClick={() => goToSlide(index)}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 768px) 80vw, 500px"
              priority={index === 0}
              className={styles.slideImage}
            />
            <div className={styles.slideCaption}>
              <h3>{image.title}</h3>
              <p>{image.description}</p>
            </div>
          </div>
        ))}

        <div className={styles.navArrows}>
          <button 
            className={styles.navArrow} 
            onClick={prevSlide}
            aria-label="Previous slide"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button 
            className={styles.navArrow} 
            onClick={nextSlide}
            aria-label="Next slide"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <h1 className={styles.brandName}>CAFE REPUBLIC</h1>
        <p className={styles.tagline}>"Fresh Coffee. Cozy Vibes."</p>
        
        <div className={styles.ctaButtons}>
          <Link href="/menu" className={styles.btnPrimary}>
            View Menu
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/contact" className={styles.btnOutline}>
            Contact Us
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </Link>
        </div>

        <div className={styles.dots}>
          {heroImages.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
