"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Search, 
  Filter, 
  Calendar,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Receipt,
  LayoutGrid
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/context/AdminContext";

type Payment = {
  id: string;
  amount: number;
  method: string;
  transaction_id: string;
  created_at: string;
  bills: {
    bill_number: string;
    customer_name: string;
    table_number: string;
  };
};

export default function PaymentsPage() {
  const { selectedOutlet, hasPermission } = useAdmin();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  useEffect(() => {
    if (!selectedOutlet) return;
    fetchPayments();
  }, [selectedOutlet, methodFilter]);

  const fetchPayments = async () => {
    if (!selectedOutlet) return;
    setLoading(true);
    try {
      let query = supabase
        .from("payments")
        .select(`
          *,
          bills (
            bill_number,
            customer_name,
            table_number
          )
        `)
        .eq("outlet_id", selectedOutlet.id)
        .order("created_at", { ascending: false });

      if (methodFilter !== "all") {
        query = query.eq("method", methodFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => 
    (p.bills?.customer_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (p.bills?.bill_number?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (p.transaction_id?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const getMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash': return <Banknote className="h-5 w-5 text-green-600" />;
      case 'upi': return <Smartphone className="h-5 w-5 text-purple-600" />;
      case 'card': return <CreditCard className="h-5 w-5 text-blue-600" />;
      default: return <Wallet className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const totalCollected = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (!hasPermission("payments.view")) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <CreditCard className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view payments</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments & Transactions</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Monitoring financial logs for {selectedOutlet?.name}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="bg-primary/5 border-2 border-primary/10 px-6 py-2 rounded-2xl flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground leading-none mb-1">Total Result</p>
              <p className="text-xl font-bold text-primary leading-none">₹{totalCollected.toFixed(0)}</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchPayments} className="rounded-xl h-14">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-2">Search Transaction</label>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search by Bill No, Customer or TXN ID..." 
                className="pl-10 h-12 rounded-2xl border-muted bg-muted/20 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-2">Payment Method</label>
            <select 
              className="w-full h-12 rounded-2xl border border-muted bg-muted/20 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash Only</option>
              <option value="upi">UPI Only</option>
              <option value="card">Card Only</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full h-12 rounded-2xl font-bold border-2">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transaction ID</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bill & Table</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Method</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date & Time</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-6">
                    <span className="font-mono text-xs font-bold text-muted-foreground">#{payment.transaction_id || payment.id.slice(0, 8)}</span>
                  </td>
                  <td className="p-6">
                    <div>
                      <p className="font-bold text-sm">{payment.bills?.bill_number}</p>
                      <p className="text-[10px] font-bold text-primary uppercase">Table {payment.bills?.table_number}</p>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-sm font-medium">{payment.bills?.customer_name || "Guest"}</span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className="bg-muted p-2 rounded-xl">
                        {getMethodIcon(payment.method)}
                      </div>
                      <span className="text-xs font-bold uppercase">{payment.method}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-lg font-black text-primary">₹{Number(payment.amount).toFixed(0)}</span>
                  </td>
                  <td className="p-6 text-xs text-muted-foreground">
                    {new Date(payment.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </td>
                  <td className="p-6">
                    <Badge className="bg-green-500/10 text-green-600 border-none rounded-lg px-3 py-1 font-bold text-[10px] uppercase">
                      Success
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPayments.length === 0 && (
          <div className="p-20 text-center">
            <Wallet className="h-16 w-16 mx-auto text-muted-foreground/10 mb-4" />
            <p className="text-muted-foreground font-medium italic">No transactions found for current filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
