"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { X, LoaderCircle, ImageIcon, Star, Filter } from "lucide-react";
import { PageHero } from "@/components/PageHero";

type GalleryCategory = {
  id: string;
  name: string;
};

type GalleryImage = {
  id: string;
  image_url: string;
  alt_text: string;
  category_id: string;
  category?: GalleryCategory;
};

const defaultImages = [
  { src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop", alt: "Coffee Pour", category: "Coffee" },
  { src: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1200&auto=format&fit=crop", alt: "Latte Art", category: "Coffee" },
  { src: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=1200&auto=format&fit=crop", alt: "Cafe Interior", category: "Ambiance" },
  { src: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop", alt: "Pastry Display", category: "Food" },
  { src: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=1200&auto=format&fit=crop", alt: "Coffee Beans", category: "Coffee" },
  { src: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=1200&auto=format&fit=crop", alt: "Cappuccino", category: "Coffee" },
  { src: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=1200&auto=format&fit=crop", alt: "Croissants", category: "Food" },
  { src: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=1200&auto=format&fit=crop", alt: "Pizza", category: "Food" },
  { src: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?q=80&w=1200&auto=format&fit=crop", alt: "Cozy Corner", category: "Ambiance" },
  { src: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1200&auto=format&fit=crop", alt: "Coffee Counter", category: "Ambiance" },
  { src: "https://images.unsplash.com/photo-1612874742237-6526221588e3?q=80&w=1200&auto=format&fit=crop", alt: "Pasta", category: "Food" },
  { src: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=1200&auto=format&fit=crop", alt: "Cold Brew", category: "Coffee" },
];

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    const { data: catData } = await supabase
      .from("gallery_categories")
      .select("*")
      .order("name");
    
    const { data: imgData } = await supabase
      .from("gallery_images")
      .select(`*, category:gallery_categories(*)`)
      .order("created_at", { ascending: false });

    if (catData) setCategories(catData);
    if (imgData && imgData.length > 0) {
      setImages(imgData);
    }
    setLoading(false);
  };

  const displayImages = images.length > 0 
    ? images.map(img => ({
        src: img.image_url,
        alt: img.alt_text,
        category: img.category?.name || "Uncategorized"
      }))
    : defaultImages;

  const displayCategories = categories.length > 0 
    ? ["All", ...categories.map(c => c.name)]
    : ["All", "Coffee", "Food", "Ambiance"];

  const filteredImages = selectedCategory === "All" 
    ? displayImages 
    : displayImages.filter(img => img.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#faf9f6]">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-20 md:pb-0">
      <PageHero 
        title="Our Gallery"
        subtitle="A Visual Journey Through Cafe Republic"
        backgroundImage="https://images.unsplash.com/photo-1453614512568-c4024d13c247?q=80&w=2070&auto=format&fit=crop"
      />

      {/* Filter Tabs */}
      <section className="sticky top-16 z-30 border-b bg-white/80 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10 shrink-0">
            <Filter className="h-3 w-3" />
            Filter
          </div>
          {displayCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-6 py-2 text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
                selectedCategory === cat 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl opacity-50" />
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            <AnimatePresence mode="popLayout">
              {filteredImages.map((image, i) => (
                <motion.div
                  key={image.src}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="group cursor-pointer break-inside-avoid relative"
                  onClick={() => setSelectedImage(image.src)}
                >
                  <div className="overflow-hidden rounded-[2rem] shadow-xl shadow-primary/5 border border-primary/5 bg-muted">
                    <img 
                      src={image.src} 
                      alt={image.alt}
                      className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <span className="text-white font-serif text-lg font-bold">{image.alt}</span>
                      <span className="text-secondary/80 text-[10px] font-black uppercase tracking-widest">{image.category}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-10"
            onClick={() => setSelectedImage(null)}
          >
            <motion.button 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-8 top-8 rounded-2xl bg-white/10 p-3 text-white transition-all hover:bg-white/20 hover:scale-110 border border-white/10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-8 w-8" />
            </motion.button>
            
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              src={selectedImage}
              alt="Gallery Lightbox"
              className="max-h-full max-w-full rounded-[2.5rem] object-contain shadow-[0_0_100px_rgba(236,216,182,0.15)] border-4 border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
