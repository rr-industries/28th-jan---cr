"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Leaf, 
  Flame, 
  Star, 
  CheckCircle2,
  X,
  AlertTriangle,
  Coffee
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  is_vegetarian: boolean;
  is_spicy: boolean;
  is_bestseller: boolean;
  is_available: boolean;
};

const categories = [
  "All",
  "Appetizers",
  "Pasta", 
  "Grilled Sandwich",
  "Open Sandwich",
  "Pizza",
  "Hot Coffee",
  "Cold Coffee",
  "Cold Brew",
  "Mocktails",
  "On The Rocks",
  "Shakes",
  "Hot Beverages",
  "Desserts",
  "Water & Soft Drinks"
];

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [tableNumber, setTableNumber] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [validTables, setValidTables] = useState<number[]>([]);
  const { cart, addToCart, updateQuantity, removeFromCart, totalPrice, totalItems, clearCart } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    fetchMenuItems();
    fetchValidTables();
  }, []);

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("name");
    
    if (error) {
      toast.error("Failed to load menu items");
    } else {
      setItems(data || []);
    }
  };

  const fetchValidTables = async () => {
    const { data, error } = await supabase
      .from("cafe_tables")
      .select("id");
    
    if (!error && data) {
      setValidTables(data.map(t => t.id));
    }
  };

  const filteredItems = selectedCategory === "All" 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const handlePlaceOrder = async () => {
    if (!tableNumber) {
      toast.error("Please enter your table number");
      return;
    }

    const tableNum = parseInt(tableNumber);
    
    if (!validTables.includes(tableNum)) {
      toast.error(`Table ${tableNum} is not available in this cafe. Please check your table number.`, {
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
        duration: 5000
      });
      return;
    }

    setIsOrdering(true);
    try {
      const { data: tableData, error: tableError } = await supabase
        .from("cafe_tables")
        .select("*, current_order_id")
        .eq("id", tableNum)
        .single();
      
      if (tableError || !tableData) {
        toast.error(`Table ${tableNum} does not exist. Please enter a valid table number.`);
        setIsOrdering(false);
        return;
      }

      if (tableData.current_order_id && tableData.status === 'occupied') {
        const { data: existingOrder } = await supabase
          .from("orders")
          .select("id, total_price, status")
          .eq("id", tableData.current_order_id)
          .single();
        
        if (existingOrder && existingOrder.status !== 'completed' && existingOrder.status !== 'cancelled') {
          const orderItems = cart.map(item => ({
            order_id: existingOrder.id,
            menu_item_id: item.id,
            quantity: item.quantity,
            price_at_order: item.price
          }));

          const { error: itemsError } = await supabase
            .from("order_items")
            .insert(orderItems);

          if (itemsError) throw itemsError;

          const newTotal = Number(existingOrder.total_price) + totalPrice;
          await supabase
            .from("orders")
            .update({ 
              total_price: newTotal,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingOrder.id);

          setOrderSuccess(true);
          setShowCart(false);
          clearCart();
          toast.success("Items added to your existing order!");
          return;
        }
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          table_number: tableNum,
          total_price: totalPrice,
          status: 'new',
          is_paid: false,
          order_source: 'customer_online'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price_at_order: item.price
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      await supabase
        .from("cafe_tables")
        .update({ 
          status: "occupied", 
          current_order_id: order.id 
        })
        .eq("id", tableNum);

      setOrderSuccess(true);
      setShowCart(false);
      clearCart();
      toast.success("Order placed successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsOrdering(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="flex h-screen flex-col items-center justify-center px-6 text-center bg-gradient-to-br from-[#1a1512] to-[#2d241e]">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-6 rounded-full bg-green-100 p-6 text-green-600"
        >
          <CheckCircle2 className="h-16 w-16" />
        </motion.div>
        <h1 className="mb-2 text-3xl font-serif font-bold text-white">Thanks for ordering!</h1>
        <p className="mb-8 text-lg text-white/70">
          Would you like to order something else?
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button onClick={() => setOrderSuccess(false)} className="h-14 rounded-full text-lg font-bold">
            Yes, Order More
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'} className="h-14 rounded-full text-lg border-white/30 text-white hover:bg-white/10">
            No, Thank You
          </Button>
        </div>
      </div>
    );
  }

    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 h-16 flex items-center justify-center bg-white/95 backdrop-blur-md border-b px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Coffee className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-serif font-bold text-primary">CAFE REPUBLIC</span>
          </Link>
        </header>

      <div className="sticky top-[64px] z-40 flex gap-2 overflow-x-auto bg-background/95 p-4 backdrop-blur-md hide-scrollbar border-b">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-colors",
              selectedCategory === cat 
                ? "bg-primary text-white" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="container grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 pb-32">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const cartItem = cart.find(i => i.id === item.id);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex gap-4 rounded-2xl bg-white p-3 shadow-sm border"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <img 
                    src={item.image_url || `https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=200&auto=format&fit=crop`} 
                    alt={item.name} 
                    className="h-full w-full object-cover"
                  />
                  {item.is_bestseller && (
                    <div className="absolute top-1 left-1 rounded-full bg-yellow-400 p-1 text-[8px] font-bold uppercase shadow-sm">
                      <Star className="h-2 w-2 fill-current" />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-1 flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold leading-tight">{item.name}</h3>
                      <span className="font-bold text-primary">₹{item.price.toFixed(0)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {item.is_vegetarian && <Leaf className="h-3 w-3 text-green-500" title="Vegetarian" />}
                      {item.is_spicy && <Flame className="h-3 w-3 text-red-500" title="Spicy" />}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-end">
                    {cartItem ? (
                      <div className="flex items-center gap-3 rounded-full bg-muted px-2 py-1">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="rounded-full bg-white p-1 shadow-sm hover:bg-primary hover:text-white"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-bold w-4 text-center">{cartItem.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="rounded-full bg-white p-1 shadow-sm hover:bg-primary hover:text-white"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => addToCart({
                          id: item.id,
                          name: item.name,
                          price: item.price,
                          quantity: 1,
                          image_url: item.image_url
                        })}
                        className="h-8 rounded-full px-4 text-xs font-bold"
                      >
                        Add <Plus className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {totalItems > 0 && !showCart && (
        <div className="fixed bottom-24 left-4 right-4 z-40 md:bottom-8 md:left-auto md:right-8 md:w-80">
          <Button 
            onClick={() => setShowCart(true)}
            className="h-14 w-full justify-between rounded-full bg-primary px-6 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">
                  {totalItems}
                </span>
              </div>
              <span className="font-bold uppercase tracking-wider">View Cart</span>
            </div>
            <span className="text-xl font-serif font-bold">₹{totalPrice.toFixed(0)}</span>
          </Button>
        </div>
      )}

      <AnimatePresence>
        {showCart && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-6 pb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif font-bold">Your Order</h2>
                <button 
                  onClick={() => setShowCart(false)}
                  className="rounded-full p-2 hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6 max-h-[30vh] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 rounded-xl bg-muted/30 p-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img 
                        src={item.image_url || `https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=200&auto=format&fit=crop`} 
                        alt={item.name} 
                        className="h-full w-full object-cover" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">₹{item.price} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white px-2 py-1 shadow-sm">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="rounded-full p-1 hover:bg-muted"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="rounded-full p-1 hover:bg-muted"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold">Table Number</label>
                  <Input 
                    type="number" 
                    placeholder="Enter your table number" 
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="h-12 rounded-xl text-center text-lg font-bold"
                  />
                  {tableNumber && !validTables.includes(parseInt(tableNumber)) && (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      This table number is not available. Valid tables: {validTables.slice(0, 10).join(', ')}{validTables.length > 10 ? '...' : ''}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{(totalPrice / 1.05).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (5% GST)</span>
                    <span>₹{(totalPrice - totalPrice / 1.05).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-primary">₹{totalPrice.toFixed(0)}</span>
                  </div>
                </div>

                <Button 
                  onClick={handlePlaceOrder} 
                  disabled={isOrdering || !tableNumber || !validTables.includes(parseInt(tableNumber))}
                  className="h-14 w-full rounded-full text-lg font-bold mb-4"
                >
                  {isOrdering ? "Placing Order..." : "Confirm Order"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
        </AnimatePresence>
    </div>
  );
}
