"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-browser";
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  Timer, 
  ArrowRight, 
  Printer, 
  MoreVertical,
  Table as TableIcon,
  CreditCard,
  Banknote,
  Smartphone,
  XCircle,
  Edit3,
  Receipt,
  Trash2,
  Calendar,
  LoaderCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/invoice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdmin } from "@/context/AdminContext";

type OrderItem = {
  id: string;
  quantity: number;
  price_at_order: number;
  menu_items: {
    name: string;
  };
};

type Order = {
  id: string;
  table_number: number;
  status: string;
  total_price: number;
  created_at: string;
  updated_at?: string;
  payment_mode?: string;
  is_paid?: boolean;
  order_items: OrderItem[];
};

const statusFlow = ['new', 'preparing', 'ready', 'served', 'completed'];

export default function AdminOrders() {
  const { selectedOutlet } = useAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [userRole, setUserRole] = useState<string>('employee');
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const viewOrder = orders.find(o => o.id === viewOrderId);

  useEffect(() => {
    if (!selectedOutlet) return;
    
    fetchOrders();
    fetchUserRole();

    const channel = supabase
      .channel('admin_orders')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders',
        filter: `outlet_id=eq.${selectedOutlet.id}`
      }, (payload) => {
        toast.info(`New order from Table ${payload.new.table_number}!`);
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log("Audio play failed:", e));
        }
        fetchOrders();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `outlet_id=eq.${selectedOutlet.id}`
      }, fetchOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedOutlet]);

  const fetchUserRole = async () => {
    const browserSupabase = createClient();
    const { data: { session } } = await browserSupabase.auth.getSession();
    
    if (session) {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("role")
        .eq("auth_user_id", session.user.id)
        .single();
      
      if (adminUser) {
        setUserRole(adminUser.role || 'employee');
      }
    }
  };

  const fetchOrders = async () => {
    if (!selectedOutlet) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          quantity,
          price_at_order,
          menu_items (name)
        )
      `)
      .eq('outlet_id', selectedOutlet.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load orders");
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (orderId: string, currentStatus: string) => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex < statusFlow.length - 1) {
      const nextStatus = statusFlow[currentIndex + 1];
      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) toast.error("Failed to update status");
      else toast.success(`Order moved to ${nextStatus}`);
    }
  };

  const cancelOrder = async (orderId: string) => {
    setCancellingOrder(true);
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      if (!order.is_paid && order.status !== 'new') {
        toast.error("Order must be paid before cancellation");
        setCancellingOrder(false);
        return;
      }

      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (orderError) throw orderError;

      await supabase
        .from("cafe_tables")
        .update({ status: 'available', current_order_id: null })
        .eq('current_order_id', orderId);

      toast.success("Order cancelled successfully");
      setCancelOrderId(null);
      fetchOrders();
    } catch (error) {
      toast.error("Failed to cancel order");
    } finally {
      setCancellingOrder(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);

      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Order deleted successfully");
      setDeleteOrderId(null);
      fetchOrders();
    } catch (error) {
      toast.error("Failed to delete order");
    }
  };

  const saveInvoiceToDatabase = async (order: Order, paymentMode: string) => {
    const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`;
    const subtotal = Number(order.total_price) / 1.05;
    const taxAmount = Number(order.total_price) - subtotal;

    const { error } = await supabase
      .from("invoices")
      .insert({
        order_id: order.id,
        invoice_number: invoiceNumber,
        table_number: order.table_number,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: Number(order.total_price),
        payment_mode: paymentMode,
        items: order.order_items.map(i => ({
          name: i.menu_items.name,
          quantity: i.quantity,
          price: Number(i.price_at_order),
          total: i.quantity * Number(i.price_at_order)
        }))
      });

    if (error && !error.message.includes('duplicate')) {
      console.error("Failed to save invoice:", error);
    }
  };

  const completeAndFreeTable = async (orderId: string, paymentMode: string = 'cash') => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      await supabase
        .from("orders")
        .update({ 
          status: 'completed', 
          payment_mode: paymentMode, 
          is_paid: true,
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      await supabase
        .from("cafe_tables")
        .update({ status: 'available', current_order_id: null })
        .eq('current_order_id', orderId);

      await saveInvoiceToDatabase(order, paymentMode);
      handleGenerateInvoice(order, paymentMode);
      toast.success("Order completed & table freed");
      fetchOrders();
    } catch (error) {
      toast.error("Failed to complete order");
    }
  };

  const handleGenerateInvoice = (order: Order, paymentMode: string = order.payment_mode || 'cash') => {
    generateInvoicePDF({
      invoiceNumber: order.id.slice(0, 8).toUpperCase(),
      tableNumber: order.table_number,
      date: new Date().toLocaleString(),
      customerName: "Guest",
      customerNumber: "N/A",
      cashierName: "Staff",
      items: order.order_items.map(i => ({
        name: i.menu_items.name,
        quantity: i.quantity,
        price: Number(i.price_at_order)
      })),
      total: Number(order.total_price),
      paymentMode
    });
    toast.success("Invoice generated successfully");
  };

  const getTimeSince = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return "Just now";
    return `${minutes}m ago`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getPaymentModeIcon = (mode?: string) => {
    switch (mode) {
      case 'cash': return <Banknote className="h-3 w-3 text-green-600" />;
      case 'upi': return <Smartphone className="h-3 w-3 text-purple-600" />;
      case 'card': return <CreditCard className="h-3 w-3 text-blue-600" />;
      default: return null;
    }
  };

  const getPaymentModeBadge = (mode?: string) => {
    const styles: Record<string, string> = {
      cash: "bg-green-100 text-green-700",
      upi: "bg-purple-100 text-purple-700",
      card: "bg-blue-100 text-blue-700"
    };
    return (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        styles[mode || 'cash'] || "bg-gray-100 text-gray-700"
      )}>
        {getPaymentModeIcon(mode)}
        {mode || 'N/A'}
      </span>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  return (
    <div className="flex flex-col gap-8">
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
      
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-bold">Active Orders</h2>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-secondary">
              {activeOrders.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live Update Enabled
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {activeOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Card className={cn(
                  "overflow-hidden border-2 transition-colors",
                  order.status === 'new' ? "border-blue-200 bg-blue-50/30" : 
                  order.status === 'preparing' ? "border-orange-200 bg-orange-50/30" :
                  order.status === 'ready' ? "border-green-200 bg-green-50/30" : "border-border"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-secondary">
                        <span className="text-lg font-bold">{order.table_number}</span>
                      </div>
                      <div>
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Table</CardTitle>
                        <p className="text-xs font-medium text-muted-foreground">{getTimeSince(order.created_at)}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => updateStatus(order.id, 'completed')}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark as Completed
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-green-600" onClick={() => completeAndFreeTable(order.id, 'cash')}>
                          <Banknote className="h-4 w-4 mr-2" />
                          Complete (Cash)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-purple-600" onClick={() => completeAndFreeTable(order.id, 'upi')}>
                          <Smartphone className="h-4 w-4 mr-2" />
                          Complete (UPI)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-blue-600" onClick={() => completeAndFreeTable(order.id, 'card')}>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Complete (Card)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => setCancelOrderId(order.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Order
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              <span className="font-bold text-primary mr-2">{item.quantity}x</span>
                              {item.menu_items.name}
                            </span>
                            <span className="text-muted-foreground">₹{(item.quantity * item.price_at_order).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-3 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Total Amount</span>
                        <span className="text-lg font-serif font-bold text-primary">₹{Number(order.total_price).toFixed(0)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {order.status !== 'completed' && (
                          <Button 
                            onClick={() => updateStatus(order.id, order.status)}
                            className="col-span-1 rounded-xl font-bold uppercase tracking-wider text-[10px]"
                            variant={order.status === 'ready' ? 'secondary' : 'default'}
                          >
                            {order.status === 'new' ? 'Start Prep' : 
                             order.status === 'preparing' ? 'Mark Ready' : 
                             order.status === 'ready' ? 'Mark Served' : 'Next Step'}
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                        
                        {(order.status === 'served' || order.status === 'ready') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="col-span-1 border-2 rounded-xl font-bold uppercase tracking-wider text-[10px]"
                              >
                                <Printer className="mr-1 h-3 w-3" /> Invoice
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-40">
                              <DropdownMenuItem onClick={() => handleGenerateInvoice(order, 'cash')}>
                                <Banknote className="mr-2 h-4 w-4" /> Cash
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateInvoice(order, 'upi')}>
                                <Smartphone className="mr-2 h-4 w-4" /> UPI
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateInvoice(order, 'card')}>
                                <CreditCard className="mr-2 h-4 w-4" /> Card
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-2 rounded-full bg-muted/50 py-1.5 px-3">
                        <span className={cn(
                          "h-2 w-2 rounded-full",
                          order.status === 'new' ? "bg-blue-500" : 
                          order.status === 'preparing' ? "bg-orange-500" :
                          order.status === 'ready' ? "bg-green-500" : "bg-primary"
                        )} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Status: {order.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-xl font-serif font-bold text-muted-foreground">Recently Completed</h2>
        <div className="overflow-hidden rounded-[2.5rem] bg-white shadow-sm border">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4">Table</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {completedOrders.slice(0, 10).map((order) => (
                <tr key={order.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-bold">Table {order.table_number}</td>
                  <td className="px-6 py-4 text-sm">
                    {order.order_items.length} items
                  </td>
                  <td className="px-6 py-4 font-bold text-primary">₹{Number(order.total_price).toFixed(0)}</td>
                  <td className="px-6 py-4">
                    {order.status === 'cancelled' ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-red-100 text-red-700">
                        <XCircle className="h-3 w-3" />
                        Cancelled
                      </span>
                    ) : (
                      getPaymentModeBadge(order.payment_mode)
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(order.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleGenerateInvoice(order)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setViewOrderId(order.id)}>
                            <Receipt className="h-4 w-4 mr-2" />
                            View Full Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerateInvoice(order)}>
                            <Printer className="h-4 w-4 mr-2" />
                            Re-print Invoice
                          </DropdownMenuItem>
                          {userRole === 'super_admin' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => setDeleteOrderId(order.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Order
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AlertDialog open={!!cancelOrderId} onOpenChange={() => setCancelOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the order and free up the table. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => cancelOrderId && cancelOrder(cancelOrderId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancellingOrder}
            >
              {cancellingOrder ? "Cancelling..." : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this order from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteOrderId && deleteOrder(deleteOrderId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewOrderId} onOpenChange={() => setViewOrderId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Order Details - Table {viewOrder?.table_number}
            </DialogTitle>
            <DialogDescription>
              Order placed on {viewOrder ? formatDateTime(viewOrder.created_at) : ''}
            </DialogDescription>
          </DialogHeader>

          {viewOrder && (
            <div className="space-y-6">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="space-y-3">
                  {viewOrder.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="font-bold">{item.menu_items.name}</span>
                        <span className="text-xs text-muted-foreground">₹{Number(item.price_at_order).toFixed(0)} x {item.quantity}</span>
                      </div>
                      <span className="font-bold">₹{(item.quantity * item.price_at_order).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{(viewOrder.total_price / 1.05).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (5% GST)</span>
                    <span>₹{(viewOrder.total_price - (viewOrder.total_price / 1.05)).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-serif font-bold text-primary">
                    <span>Total Amount</span>
                    <span>₹{Number(viewOrder.total_price).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm px-1">
                  <span className="text-muted-foreground">Status</span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    viewOrder.status === 'completed' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {viewOrder.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm px-1">
                  <span className="text-muted-foreground">Payment Mode</span>
                  {getPaymentModeBadge(viewOrder.payment_mode)}
                </div>
                <div className="flex items-center justify-between text-sm px-1">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono text-[10px] uppercase">{viewOrder.id.slice(0, 8)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" className="w-full" onClick={() => handleGenerateInvoice(viewOrder)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="default" className="w-full" onClick={() => setViewOrderId(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
