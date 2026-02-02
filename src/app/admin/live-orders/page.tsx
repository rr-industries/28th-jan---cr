"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  ChefHat,
  RefreshCw,
  MoreVertical,
  Printer,
  ChevronRight,
  UtensilsCrossed,
  LayoutGrid,
  Search,
  Check,
  X,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";
import { createNotification } from "@/lib/notifications";

type OrderItem = {
  id: string;
  quantity: number;
  menu_items: {
    name: string;
    image_url: string;
  };
  status: string;
};

type Order = {
  id: string;
  table_number: string;
  status: 'new' | 'preparing' | 'ready' | 'served';
  type: string;
  customer_name: string;
  total_amount: number;
  created_at: string;
  order_items: OrderItem[];
  is_approved: boolean;
};

export default function LiveOrdersPage() {
  const { selectedOutlet, user, hasPermission } = useAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedOutlet) return;
    fetchLiveOrders();

    let filter = `outlet_id=eq.${selectedOutlet.id}`;
    if (user?.is_super_admin) {
      filter = "outlet_id=not.is.null"; // Or just omit filter if allowed, but this is safer for realtime channel syntax usually
      // Actually, many times you want to omit the filter for all. 
      // But Supabase JS client filter syntax for 'all' is tricky in one-liner.
    }

    const channel = supabase
      .channel(`live_orders_${selectedOutlet.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: user?.is_super_admin ? undefined : filter
      }, fetchLiveOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedOutlet]);

  const fetchLiveOrders = async () => {
    if (!selectedOutlet) return;
    let query = supabase
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          quantity,
          status,
          menu_items (name, image_url)
        )
      `)
      .not("status", "in", '("completed","cancelled")');

    if (!user?.is_super_admin) {
      query = query.eq("outlet_id", selectedOutlet.id);
    }

    const { data, error } = await query
      .order("is_approved", { ascending: true }) // Show unapproved first
      .order("created_at", { ascending: true });

    if (data) setOrders(data);
    setLoading(false);
  };

  const approveOrder = async (orderId: string) => {
    if (!hasPermission("orders.live.update")) return toast.error("Permission denied");
    const order = orders.find(o => o.id === orderId);
    const { error } = await supabase
      .from("orders")
      .update({ is_approved: true, status: 'preparing' })
      .eq("id", orderId);

    if (error) toast.error("Failed to approve order");
    else {
      // Notify Customer
      await createNotification({
        title: "Order Confirmed",
        message: `Your order from Table ${order?.table_number} has been approved and is being prepared.`,
        type: "success",
        category: "customer",
        reference_id: orderId,
        reference_type: "order"
      });

      toast.success("Order approved and sent to kitchen");
      fetchLiveOrders();
    }
  };

  const rejectOrder = async (orderId: string) => {
    if (!hasPermission("orders.live.update")) return toast.error("Permission denied");
    const order = orders.find(o => o.id === orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: 'cancelled', rejection_reason: 'Rejected by staff' })
      .eq("id", orderId);

    if (error) toast.error("Failed to reject order");
    else {
      // Notify Customer
      await createNotification({
        title: "Order Cancelled",
        message: `Your order from Table ${order?.table_number} has been cancelled.`,
        type: "error",
        category: "customer",
        reference_id: orderId,
        reference_type: "order"
      });

      toast.error("Order rejected");
      fetchLiveOrders();
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!hasPermission("orders.live.update")) return toast.error("Permission denied");
    const order = orders.find(o => o.id === orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) toast.error("Failed to update status");
    else {
      // Notify Customer if order is ready
      if (newStatus === 'ready') {
        await createNotification({
          title: "Your Order is Ready 🍽️",
          message: `Order for Table ${order?.table_number} is ready to be served.`,
          type: "success",
          priority: "high",
          category: "customer",
          reference_id: orderId,
          reference_type: "order"
        });
      }

      toast.success(`Order is now ${newStatus}`);
    }
  };

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    if (!hasPermission("kds.update.status")) return toast.error("Permission denied");
    const { error } = await supabase
      .from("order_items")
      .update({ status: newStatus })
      .eq("id", itemId);

    if (error) toast.error("Failed to update item status");
    else fetchLiveOrders();
  };

  if (!hasPermission("orders.live.view")) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view live orders</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Orders</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Kitchen Display System (KDS) for {selectedOutlet?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-4 py-2 rounded-full border-2 border-primary/20 text-primary font-bold">
            {orders.length} ACTIVE ORDERS
          </Badge>
          <Button variant="outline" size="icon" className="rounded-full" onClick={fetchLiveOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                "flex flex-col bg-white rounded-[2.5rem] border-2 shadow-sm overflow-hidden transition-all",
                order.status === 'new' ? "border-blue-200 ring-4 ring-blue-50" :
                  order.status === 'ready' ? "border-green-200 ring-4 ring-green-50" : "border-muted"
              )}
            >
              {/* Header */}
              <div className={cn(
                "p-6 flex justify-between items-start",
                order.status === 'new' ? "bg-blue-50" :
                  order.status === 'ready' ? "bg-green-50" : "bg-muted/30"
              )}>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl font-serif font-bold tracking-tighter">T-{order.table_number}</span>
                    <Badge className={cn(
                      "uppercase text-[10px] font-bold px-2 py-0.5",
                      order.status === 'new' ? "bg-blue-500" :
                        order.status === 'ready' ? "bg-green-500" : "bg-orange-500"
                    )}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <Clock className="h-3 w-3" />
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Dine-in</p>
                  <p className="text-lg font-bold">₹{Number(order.total_amount).toFixed(0)}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 p-6 space-y-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded-2xl flex items-center justify-center font-bold text-lg text-primary/40">
                        {item.quantity}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{item.menu_items.name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase">{item.status}</p>
                      </div>
                    </div>
                    {item.status !== 'ready' && order.status !== 'ready' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full hover:bg-green-50 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => updateItemStatus(item.id, 'ready')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-muted/10 border-t flex flex-col gap-2">
                {!order.is_approved ? (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 rounded-2xl bg-green-600 hover:bg-green-700 h-12 font-bold"
                      onClick={() => approveOrder(order.id)}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-2xl h-12 font-bold"
                      onClick={() => rejectOrder(order.id)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {order.status === 'new' && (
                      <Button
                        className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 h-12 font-bold"
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                      >
                        Start Cooking
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button
                        className="flex-1 rounded-2xl bg-orange-600 hover:bg-orange-700 h-12 font-bold"
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                      >
                        Order Ready
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button
                        className="flex-1 rounded-2xl bg-green-600 hover:bg-green-700 h-12 font-bold"
                        onClick={() => updateOrderStatus(order.id, 'served')}
                      >
                        Mark Served
                      </Button>
                    )}
                  </div>
                )}
                <Button variant="outline" className="w-full rounded-2xl h-10 border-dashed text-xs font-bold text-muted-foreground">
                  <Printer className="h-3 w-3 mr-2" />
                  Print KOT
                </Button>
              </div>

            </motion.div>
          ))}
        </AnimatePresence>

        {orders.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="h-24 w-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/20" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-muted-foreground/40 italic">Kitchen is currently quiet...</h3>
          </div>
        )}
      </div>
    </div>
  );
}
