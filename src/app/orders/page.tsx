"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Coffee, AlertCircle, CheckCircle2, ShoppingBag, Loader2, ArrowRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { toast } from "sonner";

interface TableSession {
  id: string;
  outlet_id: string;
  table_id: number;
  session_token: string;
  bound_device_id: string | null;
  status: string;
  cafe_tables: {
    table_number: string;
  };
  outlets: {
    name: string;
  };
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  description: string;
}

function OrderingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [session, setSession] = useState<TableSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateSession();
    } else {
      setError("No session token provided. Please scan a QR code.");
      setLoading(false);
    }
  }, [token]);

  const validateSession = async () => {
    try {
      const { data, error: sessionError } = await supabase
        .from("table_sessions")
        .select(`
          *,
          cafe_tables (table_number),
          outlets (name)
        `)
        .eq("session_token", token)
        .eq("status", "active")
        .single();

      if (sessionError || !data) {
        setError("Invalid or expired session. Please contact staff.");
        setLoading(false);
        return;
      }

      // Device Binding
      let deviceId = localStorage.getItem("order_device_id");
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem("order_device_id", deviceId);
      }

      if (data.bound_device_id && data.bound_device_id !== deviceId) {
        setError("This session is bound to another device.");
        setLoading(false);
        return;
      }

      if (!data.bound_device_id) {
        await supabase
          .from("table_sessions")
          .update({ bound_device_id: deviceId })
          .eq("id", data.id);
      }

      setSession(data);
      fetchMenu(data.outlet_id);
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async (outletId: string) => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("outlet_id", outletId)
      .eq("is_available", true);
    
    if (data) setMenuItems(data);
  };

  const addToCart = (id: string) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 1) {
        newCart[id]--;
      } else {
        delete newCart[id];
      }
      return newCart;
    });
  };

  const calculateTotal = () => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const item = menuItems.find(i => i.id === id);
      return total + (item?.price || 0) * qty;
    }, 0);
  };

  const placeOrder = async () => {
    if (!session || Object.keys(cart).length === 0) return;

    setIsOrdering(true);
    try {
      const deviceId = localStorage.getItem("order_device_id");
      
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          outlet_id: session.outlet_id,
          table_id: session.table_id,
          session_id: session.id,
          device_id: deviceId,
          total_amount: calculateTotal(),
          status: "pending",
          is_approved: false,
          type: "dine-in"
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = Object.entries(cart).map(([itemId, quantity]) => ({
        order_id: orderData.id,
        menu_item_id: itemId,
        quantity,
        price_at_time: menuItems.find(i => i.id === itemId)?.price || 0
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setOrderSuccess(true);
      setCart({});
      toast.success("Order placed! Waiting for staff approval.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Coffee className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] p-4">
        <div className="bg-white p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center max-w-md w-full border border-primary/5">
          <div className="h-20 w-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-8 font-medium leading-relaxed">{error}</p>
          <Button onClick={() => window.location.reload()} size="lg" variant="outline" className="w-full h-14 rounded-full font-bold border-2">
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6] p-4">
        <div className="bg-white p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center max-w-md w-full border border-primary/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-green-500" />
          <div className="h-20 w-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-4">Order Received</h1>
          <p className="text-muted-foreground mb-8 font-medium leading-relaxed">
            Your selection has been sent to our baristas. Please relax, we'll notify you once it's approved!
          </p>
          <Button onClick={() => setOrderSuccess(false)} size="lg" className="w-full h-14 rounded-full font-bold shadow-xl shadow-primary/20">
            Order More
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] pb-32 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full -translate-x-1/2 translate-y-1/2 blur-[120px]" />

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-primary/5 px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif font-bold text-primary tracking-tight">CAFE REPUBLIC</h1>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Table {session?.cafe_tables.table_number}
              </p>
            </div>
          </div>
        <div className="h-11 w-11 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
          <Coffee className="w-5 h-5" />
        </div>
      </header>

      {/* Menu Sections */}
      <div className="p-6 space-y-10 relative z-10">
        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
          {["All Items", "Coffee", "Tea", "Snacks", "Main Course"].map((cat, i) => (
            <button 
              key={cat} 
              className={`px-8 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                i === 0 
                ? "bg-primary text-white shadow-xl shadow-primary/20" 
                : "bg-white text-muted-foreground border border-primary/5 hover:border-primary/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuItems.map(item => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/5 border border-primary/5 group transition-all duration-500 hover:shadow-primary/10"
            >
              <div className="relative h-56">
                <Image 
                  src={item.image_url || "/placeholder-food.jpg"} 
                  alt={item.name} 
                  fill 
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-serif font-bold text-gray-900 group-hover:text-primary transition-colors">{item.name}</h3>
                  <span className="text-primary font-bold text-lg">₹{item.price}</span>
                </div>
                <p className="text-sm text-muted-foreground font-medium line-clamp-2 mb-6 leading-relaxed">{item.description}</p>
                <div className="flex items-center justify-between pt-6 border-t border-primary/5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest">
                    <Star className="h-3 w-3 fill-current" />
                    {item.category}
                  </div>
                  <div className="flex items-center gap-4">
                    {cart[item.id] > 0 && (
                      <>
                        <motion.button 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          onClick={() => removeFromCart(item.id)}
                          className="w-10 h-10 rounded-2xl border-2 border-primary/20 flex items-center justify-center text-primary font-bold hover:bg-primary/5 transition-colors"
                        >
                          -
                        </motion.button>
                        <span className="font-bold text-base min-w-[20px] text-center">{cart[item.id]}</span>
                      </>
                    )}
                    <button 
                      onClick={() => addToCart(item.id)}
                      className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <span className="font-bold text-xl">+</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Cart Drawer Bar */}
      <AnimatePresence>
        {Object.keys(cart).length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-6 right-6 z-50 md:left-auto md:right-8 md:w-[400px]"
          >
            <div className="bg-primary text-white p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(var(--primary),0.3)] flex items-center justify-between border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-5">
                <div className="bg-white/10 p-4 rounded-[1.5rem] relative group overflow-hidden">
                  <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1 bg-white text-primary text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-primary">
                    {Object.values(cart).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-0.5">Subtotal</p>
                  <p className="text-2xl font-serif font-bold">₹{calculateTotal()}</p>
                </div>
              </div>
              <Button 
                onClick={placeOrder} 
                disabled={isOrdering}
                className="bg-white text-primary hover:bg-white/90 rounded-[1.5rem] px-10 h-14 font-black text-sm uppercase tracking-widest group"
              >
                {isOrdering ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Confirm
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrderingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
        <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <OrderingContent />
    </Suspense>
  );
}
