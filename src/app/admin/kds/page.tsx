"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ChefHat, 
  Clock, 
  Check, 
  RefreshCw,
  Bell,
  Utensils,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";

type OrderItem = {
  id: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  menu_items: {
    name: string;
    category: string;
  };
};

type Order = {
  id: string;
  table_number: string;
  status: string;
  created_at: string;
  order_items: OrderItem[];
};

export default function KDSPage() {
  const { selectedOutlet, hasPermission } = useAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (!selectedOutlet) return;
    fetchKDSOrders();

    const channel = supabase
      .channel(`kds_updates_${selectedOutlet.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders',
        filter: `outlet_id=eq.${selectedOutlet.id}`
      }, (payload) => {
        if (soundEnabled) playAlert();
        fetchKDSOrders();
        toast.info("New order received in kitchen!");
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `outlet_id=eq.${selectedOutlet.id}`
      }, fetchKDSOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedOutlet, soundEnabled]);

  const fetchKDSOrders = async () => {
    if (!selectedOutlet) return;
    const { data } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          quantity,
          status,
          menu_items (name, category)
        )
      `)
      .eq("outlet_id", selectedOutlet.id)
      .eq("is_approved", true)
      .in("status", ['preparing', 'ready'])
      .order("created_at", { ascending: true });

    if (data) setOrders(data);
    setLoading(false);
  };

  const playAlert = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
  };

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    if (!hasPermission("kds.update.status")) return toast.error("Permission denied");
    const { error } = await supabase
      .from("order_items")
      .update({ status: newStatus })
      .eq("id", itemId);

    if (error) toast.error("Failed to update status");
    else fetchKDSOrders();
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!hasPermission("kds.update.status")) return toast.error("Permission denied");
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) toast.error("Failed to update status");
    else fetchKDSOrders();
  };

  if (!hasPermission("kds.view")) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ChefHat className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view KDS</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Display (KDS)</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Live cooking queue for {selectedOutlet?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full" 
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" className="rounded-full" onClick={fetchKDSOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {orders.map((order) => {
            const timeElapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
            const isLate = timeElapsed > 15;

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "flex flex-col bg-white rounded-[2.5rem] border-4 shadow-xl overflow-hidden h-[500px]",
                  isLate ? "border-red-200" : order.status === 'new' ? "border-blue-200" : "border-orange-200"
                )}
              >
                {/* Header */}
                <div className={cn(
                  "p-6 flex justify-between items-center",
                  isLate ? "bg-red-50" : order.status === 'new' ? "bg-blue-50" : "bg-orange-50"
                )}>
                  <div>
                    <h3 className="text-4xl font-serif font-extrabold">T-{order.table_number}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className={cn("h-4 w-4", isLate ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-bold", isLate ? "text-red-600" : "text-muted-foreground")}>
                        {timeElapsed}m ago
                      </span>
                    </div>
                  </div>
                  <Badge className={cn(
                    "text-xs font-black uppercase px-3 py-1 rounded-full",
                    isLate ? "bg-red-600 animate-bounce" : order.status === 'new' ? "bg-blue-600" : "bg-orange-600"
                  )}>
                    {isLate ? "DELAYED" : order.status}
                  </Badge>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {order.order_items.map((item) => (
                    <div 
                      key={item.id} 
                      className={cn(
                        "flex items-start justify-between p-4 rounded-3xl border-2 transition-all cursor-pointer",
                        item.status === 'ready' ? "bg-green-50 border-green-200 opacity-50" : "bg-muted/30 border-transparent hover:border-primary/20"
                      )}
                      onClick={() => updateItemStatus(item.id, item.status === 'ready' ? 'pending' : 'ready')}
                    >
                      <div className="flex gap-4">
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center font-bold text-xl text-primary shadow-sm border">
                          {item.quantity}
                        </div>
                        <div>
                          <p className={cn("font-bold text-lg leading-tight", item.status === 'ready' && "line-through text-muted-foreground")}>
                            {item.menu_items.name}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{item.menu_items.category}</p>
                        </div>
                      </div>
                      {item.status === 'ready' && <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="p-4 bg-muted/10 border-t mt-auto">
                  {order.status === 'new' ? (
                    <Button 
                      className="w-full h-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-xl font-black shadow-lg shadow-blue-200"
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                    >
                      START ORDER
                    </Button>
                  ) : order.status === 'preparing' ? (
                    <Button 
                      className="w-full h-16 rounded-[1.5rem] bg-orange-600 hover:bg-orange-700 text-xl font-black shadow-lg shadow-orange-200"
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                    >
                      ORDER READY
                    </Button>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-green-600 font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        WAITING FOR PICKUP
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {orders.length === 0 && (
          <div className="col-span-full py-32 text-center">
            <ChefHat className="h-24 w-24 mx-auto text-muted-foreground/10 mb-6" />
            <h2 className="text-3xl font-serif font-bold text-muted-foreground/20 italic">No pending orders. Kitchen is clean!</h2>
          </div>
        )}
      </div>
    </div>
  );
}
