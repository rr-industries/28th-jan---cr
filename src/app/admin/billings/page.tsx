"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, 
  Receipt, 
  Printer, 
  User, 
  Phone, 
  UserCircle,
  LoaderCircle,
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Eye,
  RefreshCw,
  History,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { generateInvoicePDF } from "@/lib/invoice";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
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
  table_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: OrderItem[];
};

type RecentInvoice = {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  payment_mode: string;
  generated_at: string;
  table_number: string;
  cashier_name: string;
  order_id: string;
  items: any[];
};

export default function BillingsPage() {
  const { selectedOutlet, hasPermission } = useAdmin();
  const [tableSearch, setTableSearch] = useState("");
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Invoice form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cashierName, setCashierName] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");

  useEffect(() => {
    if (!selectedOutlet) return;
    fetchRecentInvoices();
  }, [selectedOutlet]);

  const fetchRecentInvoices = async () => {
    if (!selectedOutlet) return;
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("outlet_id", selectedOutlet.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setRecentInvoices(data.map((d: any) => ({
        id: d.id,
        invoice_number: d.bill_number,
        customer_name: d.customer_name || "Guest",
        customer_phone: d.customer_phone || "N/A",
        total_amount: Number(d.total_amount),
        payment_mode: d.payment_status,
        generated_at: d.created_at,
        table_number: d.table_number || "N/A",
        cashier_name: d.cashier_name || "Admin",
        order_id: d.order_id,
        items: d.details?.items || []
      })));
    }
  };

  const findOrder = async () => {
    if (!tableSearch || !selectedOutlet) return;
    setLoading(true);
    setActiveOrder(null);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            quantity,
            price_at_time,
            menu_items (name)
          ),
          cafe_tables!inner(table_number)
        `)
        .eq("outlet_id", selectedOutlet.id)
        .eq("cafe_tables.table_number", tableSearch)
        .not("status", "in", '("completed","cancelled")')
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error(`No active order found for Table ${tableSearch}`);
      } else {
        setActiveOrder({
          ...data[0],
          table_number: data[0].cafe_tables.table_number,
          total_amount: Number(data[0].total_amount),
          order_items: data[0].order_items.map((i: any) => ({
            ...i,
            price_at_order: i.price_at_time
          }))
        });
        toast.success(`Active order found for Table ${tableSearch}`);
      }
    } catch (err) {
      toast.error("Error searching for order");
    } finally {
      setLoading(false);
    }
  };

  const finalizeInvoice = async () => {
    if (!hasPermission("billings.generate")) return toast.error("Permission denied");
    if (!activeOrder || !customerName || !customerPhone || !cashierName || !selectedOutlet) {
      toast.error("Please fill all details");
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const invoiceNumber = `INV-${today.replace(/-/g, "")}-${activeOrder.id.slice(0, 4).toUpperCase()}`;
      
      const subtotal = Number(activeOrder.total_amount) / 1.05;
      const taxAmount = Number(activeOrder.total_amount) - subtotal;

      const invoiceItems = activeOrder.order_items.map(i => ({
        name: i.menu_items.name,
        quantity: i.quantity,
        price: Number(i.price_at_order),
        total: i.quantity * Number(i.price_at_order)
      }));

      const { data: bill, error: billError } = await supabase
        .from("bills")
        .insert({
          outlet_id: selectedOutlet.id,
          order_id: activeOrder.id,
          bill_number: invoiceNumber,
          table_number: activeOrder.table_number,
          subtotal: subtotal,
          tax: taxAmount,
          total_amount: Number(activeOrder.total_amount),
          payment_status: 'paid',
          customer_name: customerName,
          customer_phone: customerPhone,
          cashier_name: cashierName,
          details: { items: invoiceItems, payment_mode: paymentMode }
        })
        .select()
        .single();

      if (billError) throw billError;

      // Update order status
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({ status: 'completed' })
        .eq('id', activeOrder.id);
      
      if (orderUpdateError) throw orderUpdateError;

      // Make table available
      await supabase
        .from("cafe_tables")
        .update({ status: 'available', current_order_id: null })
        .eq('outlet_id', selectedOutlet.id)
        .eq('table_number', activeOrder.table_number);

      // Generate PDF
      generateInvoicePDF({
        invoiceNumber: invoiceNumber,
        tableNumber: parseInt(activeOrder.table_number, 10) || 0,
        date: new Date().toLocaleString(),
        customerName: customerName,
        customerNumber: customerPhone,
        cashierName: cashierName,
        items: invoiceItems,
        total: Number(activeOrder.total_amount),
        paymentMode: paymentMode
      });

      toast.success("Invoice generated and order completed!");
      setShowInvoiceModal(false);
      setActiveOrder(null);
      setTableSearch("");
      setCustomerName("");
      setCustomerPhone("");
      setCashierName("");
      fetchRecentInvoices();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate bill");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasPermission("billings.view")) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Receipt className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view billings</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billings</h1>
        <p className="text-muted-foreground font-medium flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Manage final bills for {selectedOutlet?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Quick Billings Section */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-xl border-none bg-gradient-to-br from-primary/5 to-transparent overflow-hidden rounded-[2.5rem]">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl font-serif">
                <Search className="h-7 w-7 text-primary" />
                Find Active Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                  Enter table number
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input 
                      placeholder="e.g. 5"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && findOrder()}
                      className="h-12 pl-10 text-xl font-bold rounded-2xl border-primary/20 focus:ring-primary bg-white"
                    />
                  </div>
                  <Button onClick={findOrder} disabled={loading} className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/20">
                    {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {activeOrder ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-3xl border-2 border-primary/10 bg-white p-6 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-primary/10 px-4 py-2 rounded-2xl">
                        <h3 className="font-bold text-xl text-primary">Table {activeOrder.table_number}</h3>
                        <p className="text-[10px] font-mono text-primary/60 uppercase">#{activeOrder.id.slice(0, 8)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Total Payable</p>
                        <p className="text-3xl font-serif font-bold text-primary">₹{Number(activeOrder.total_amount).toFixed(0)}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 border-y border-dashed py-4">
                      {activeOrder.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="font-medium">{item.menu_items.name} <span className="text-muted-foreground text-xs">x{item.quantity}</span></span>
                          <span className="font-bold">₹{(item.quantity * item.price_at_order).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>

                    <Button 
                      className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-primary/30" 
                      onClick={() => setShowInvoiceModal(true)}
                    >
                      <Receipt className="mr-2 h-6 w-6" />
                      Generate Bill
                    </Button>
                  </motion.div>
                ) : (
                  <div className="py-12 text-center bg-muted/30 rounded-3xl border-2 border-dashed border-muted-foreground/10">
                    <History className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">Find an active order to start billing</p>
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        {/* Recently Billed Section */}
          <div className="lg:col-span-8">
            <Card className="border-none shadow-xl h-full overflow-hidden rounded-[2.5rem]">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/20 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-3 text-2xl font-serif">
                    <CheckCircle2 className="h-7 w-7 text-green-500" />
                    Recently Billed
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Last 20 invoices in {selectedOutlet?.name}</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-48 hidden md:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search history..." 
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="h-9 pl-8 rounded-2xl text-xs"
                    />
                  </div>
                  <Button variant="outline" size="icon" className="rounded-2xl" onClick={fetchRecentInvoices}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-muted">
                  {recentInvoices.filter(inv => inv.table_number.toString().includes(historySearch) || inv.customer_name.toLowerCase().includes(historySearch.toLowerCase())).map((inv) => (
                    <div key={inv.id} className="bg-white p-6 hover:bg-muted/10 transition-colors border-b md:border-r">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[9px] font-mono font-bold tracking-tighter rounded-xl py-0 px-1.5 uppercase">
                            {inv.invoice_number}
                          </Badge>
                          <h4 className="font-bold text-xl flex items-center gap-2">
                            Table {inv.table_number}
                          </h4>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-serif font-bold text-primary">₹{Number(inv.total_amount).toFixed(0)}</p>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">{inv.payment_mode}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-bold truncate">{inv.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{inv.customer_phone}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Cashier</p>
                          <p className="text-xs font-bold">{inv.cashier_name}</p>
                        </div>
                      </div>
  
                      <div className="flex justify-between items-center pt-4 border-t border-muted">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {new Date(inv.generated_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
                          })}
                        </span>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="h-8 px-3 rounded-xl text-[10px] font-bold uppercase shadow-sm" 
                              onClick={() => generateInvoicePDF({
                                invoiceNumber: inv.invoice_number,
                                tableNumber: parseInt(inv.table_number, 10) || 0,
                                date: new Date(inv.generated_at).toLocaleString(),
                                customerName: inv.customer_name,
                                customerNumber: inv.customer_phone,
                                cashierName: inv.cashier_name,
                                items: inv.items,
                                total: Number(inv.total_amount),
                                paymentMode: inv.payment_mode
                              })}
                          >
                            <Printer className="h-3.5 w-3.5 mr-1.5" />
                            Print
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
      </div>

      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-md rounded-[2.5rem] overflow-hidden p-0 border-none shadow-2xl">
          <div className="bg-primary p-8 text-white relative">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif font-bold">Finalize Billing</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">
                Complete details for Table {activeOrder?.table_number} invoice
              </DialogDescription>
            </DialogHeader>
            <div className="absolute -bottom-6 right-8 bg-white text-primary px-6 py-3 rounded-2xl shadow-xl border-2 border-primary/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount Due</p>
              <p className="text-3xl font-serif font-bold">₹{Number(activeOrder?.total_amount || 0).toFixed(0)}</p>
            </div>
          </div>

          <div className="p-8 pt-10 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Enter name"
                    className="pl-10 h-11 rounded-xl"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="10 digits"
                    type="tel"
                    className="pl-10 h-11 rounded-xl"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Cashier Name</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Billing Agent Name"
                  className="pl-10 h-11 rounded-xl"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Payment Mode</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'cash', icon: Banknote, label: 'Cash' },
                  { id: 'upi', icon: Smartphone, label: 'UPI' },
                  { id: 'card', icon: CreditCard, label: 'Card' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setPaymentMode(mode.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all",
                      paymentMode === mode.id 
                        ? "border-primary bg-primary/5 text-primary scale-105" 
                        : "border-muted hover:border-primary/20 hover:bg-primary/5"
                    )}
                  >
                    <mode.icon className="h-6 w-6" />
                    <span className="text-[10px] font-bold uppercase">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 pt-0 flex gap-3">
            <Button variant="outline" onClick={() => setShowInvoiceModal(false)} className="flex-1 h-14 rounded-2xl border-2 font-bold uppercase tracking-wider text-xs">
              Cancel
            </Button>
            <Button onClick={finalizeInvoice} disabled={submitting} className="flex-[2] h-14 rounded-2xl text-lg font-bold uppercase tracking-widest shadow-xl shadow-primary/20">
              {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : "Finalize & Print"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
