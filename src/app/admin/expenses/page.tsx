"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/context/AdminContext";
import { 
  Plus, 
  Search, 
  Filter, 
  Wallet, 
  Calendar, 
  ArrowUpRight, 
  TrendingUp, 
  MoreHorizontal,
  Trash2,
  Edit3,
  Receipt,
  Download,
  LoaderCircle,
  FileText,
  CreditCard,
  Banknote,
  Smartphone
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

  type Expense = {
    id: string;
    expense_date: string;
    description: string;
    category: string;
    amount: number;
    payment_method: string;
    notes: string;
    is_recurring: boolean;
    frequency: string;
    vendor_name: string;
    invoice_number: string;
    created_at: string;
  };

  const EXPENSE_CATEGORIES = [
    "Operational",
    "Staff",
    "Inventory Purchase",
    "Marketing",
    "Maintenance",
    "Financial",
    "Others"
  ];

  const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Credit Card"];

  export default function ExpensesPage() {
    const { selectedOutlet, hasPermission } = useAdmin();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
      description: "",
      category: "Operational",
      amount: "",
      payment_method: "Cash",
      expense_date: new Date().toISOString().split('T')[0],
      notes: "",
      is_recurring: false,
      frequency: "monthly",
      vendor_name: "",
      invoice_number: ""
    });

    useEffect(() => {
      if (!selectedOutlet) return;
      fetchExpenses();
    }, [selectedOutlet]);

    const fetchExpenses = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("outlet_id", selectedOutlet?.id)
        .order("expense_date", { ascending: false });
      
      if (error) toast.error("Failed to load expenses");
      else setExpenses(data || []);
      setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.description || !formData.amount) {
        toast.error("Description and amount are required");
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          ...formData,
          amount: parseFloat(formData.amount),
          outlet_id: selectedOutlet?.id,
        };

        if (editingExpense) {
          const { error } = await supabase
            .from("expenses")
            .update(payload)
            .eq("id", editingExpense.id);
          if (error) throw error;
          toast.success("Expense updated");
        } else {
          const { error } = await supabase
            .from("expenses")
            .insert([payload]);
          if (error) throw error;
          toast.success("Expense recorded");
        }
        setShowAddModal(false);
        fetchExpenses();
      } catch (error) {
        toast.error("Failed to save expense");
      } finally {
        setSubmitting(false);
      }
    };


  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Deleted");
      fetchExpenses();
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          exp.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || exp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const topCategory = EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    total: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + Number(e.amount), 0)
  })).sort((a, b) => b.total - a.total)[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial OS</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm mt-1">
            <Wallet className="h-4 w-4" />
            Expense management for {selectedOutlet?.name}
          </p>
        </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 rounded-2xl">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
                onClick={() => {
                  setEditingExpense(null);
                  setFormData({
                    description: "",
                    category: "Operational",
                    amount: "",
                    payment_method: "Cash",
                    expense_date: new Date().toISOString().split('T')[0],
                    notes: "",
                    is_recurring: false,
                    frequency: "monthly",
                    vendor_name: "",
                    invoice_number: ""
                  });
                  setShowAddModal(true);
                }} 

              className="h-11 rounded-2xl font-bold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white rounded-[2.5rem] border shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <TrendingUp className="h-20 w-20 text-primary" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Expenditure</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-serif font-bold text-primary">₹{totalAmount.toFixed(0)}</p>
            </CardContent>
          </Card>
  
          <Card className="bg-white rounded-[2.5rem] border shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 text-orange-500">
              <Filter className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top Category</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600 truncate">{topCategory?.name || "N/A"}</p>
            </CardContent>
          </Card>
  
          <Card className="bg-white rounded-[2.5rem] border shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 text-blue-500">
              <Receipt className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Record Count</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-serif font-bold text-blue-600">{filteredExpenses.length}</p>
            </CardContent>
          </Card>
  
          <Card className="bg-primary text-secondary rounded-[2.5rem] border-none shadow-xl shadow-primary/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Calendar className="h-20 w-20" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest opacity-70">Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-serif font-bold">Daily Logs</p>
            </CardContent>
          </Card>
        </div>

      <Card className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="p-6 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search expenses or vendors..." 
              className="h-12 pl-12 rounded-2xl bg-white border-none shadow-sm focus:ring-primary font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-12 w-full md:w-48 rounded-2xl bg-white border-none shadow-sm font-bold">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b">
                  <th className="p-6">Date & Category</th>
                  <th className="p-6">Description</th>
                  <th className="p-6">Vendor / Invoice</th>
                  <th className="p-6 text-right">Amount</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="p-6"><div className="h-4 bg-muted rounded w-full" /></td>
                    </tr>
                  ))
                ) : filteredExpenses.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-center text-muted-foreground italic">No expenses recorded</td></tr>
                ) : (
                      filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="group hover:bg-muted/5 transition-colors">
                          <td className="p-6">
                            <p className="font-bold text-sm">{new Date(exp.expense_date).toLocaleDateString()}</p>
                            <Badge variant="outline" className="mt-1 rounded-xl text-[10px] font-black uppercase tracking-widest px-2 py-0">
                              {exp.category}
                            </Badge>
                          </td>
                          <td className="p-6">
                            <p className="font-bold text-gray-900">{exp.description}</p>
                            {exp.is_recurring && (
                              <span className="text-[10px] text-primary font-black uppercase tracking-tighter flex items-center gap-1 mt-1">
                                <ArrowUpRight className="h-3 w-3" /> Recurring ({exp.frequency})
                              </span>
                            )}
                          </td>
                          <td className="p-6 text-xs font-bold text-muted-foreground">
                            {exp.vendor_name || "-"} <br />
                            <span className="text-[10px] opacity-70">{exp.invoice_number || "#No Invoice"}</span>
                          </td>
                          <td className="p-6 text-right">
                            <span className="text-xl font-serif font-black text-red-600">₹{Number(exp.amount).toFixed(0)}</span>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {exp.payment_method === "UPI" && <Smartphone className="h-3 w-3 text-primary" />}
                              {exp.payment_method === "Cash" && <Banknote className="h-3 w-3 text-green-600" />}
                              {exp.payment_method === "Bank Transfer" && <CreditCard className="h-3 w-3 text-blue-600" />}
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">{exp.payment_method}</span>
                            </div>
                          </td>
                          <td className="p-6 text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-2xl hover:bg-muted"
                                onClick={() => {
                                  setEditingExpense(exp);
                                  setFormData({
                                    description: exp.description,
                                    category: exp.category,
                                    amount: exp.amount.toString(),
                                    payment_method: exp.payment_method,
                                    expense_date: exp.expense_date,
                                    notes: exp.notes || "",
                                    is_recurring: exp.is_recurring,
                                    frequency: exp.frequency || "monthly",
                                    vendor_name: exp.vendor_name || "",
                                    invoice_number: exp.invoice_number || ""
                                  });
                                  setShowAddModal(true);
                                }}
                              >
                                <Edit3 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-2xl hover:bg-red-50"
                                onClick={() => deleteExpense(exp.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                      </tr>
                    ))

                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl rounded-[3rem] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-serif font-bold text-center">
              {editingExpense ? "Edit Expense" : "Record New Expense"}
            </DialogTitle>
            <DialogDescription className="text-center">
              All financial records are immutable for audit safety.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Description</label>
                <Input 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Milk purchase 30L"
                  className="h-14 rounded-2xl font-bold border-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-red-500 tracking-widest ml-1">Amount (₹)</label>
                <Input 
                  type="number"
                  value={formData.amount} 
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="h-14 rounded-2xl text-2xl font-serif font-black border-2 border-red-50 focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Category</label>
                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="h-14 rounded-2xl font-bold border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Payment Method</label>
                <Select value={formData.payment_method} onValueChange={v => setFormData({ ...formData, payment_method: v })}>
                  <SelectTrigger className="h-14 rounded-2xl font-bold border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Date</label>
                  <Input 
                    type="date"
                    value={formData.expense_date} 
                    onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
                    className="h-14 rounded-2xl font-bold border-2"
                  />
                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Vendor Name</label>
                <Input 
                  value={formData.vendor_name} 
                  onChange={e => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder="Supplier name"
                  className="h-14 rounded-2xl font-bold border-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Invoice Number</label>
                <Input 
                  value={formData.invoice_number} 
                  onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="#INV-0000"
                  className="h-14 rounded-2xl font-bold border-2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Internal Notes</label>
              <textarea 
                value={formData.notes} 
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-2xl border-2 p-4 text-sm font-medium focus:ring-1 focus:ring-primary min-h-[100px]"
                placeholder="Add any extra context..."
              />
            </div>

            <DialogFooter className="pt-6 gap-3">
              <Button variant="outline" type="button" onClick={() => setShowAddModal(false)} className="h-14 rounded-2xl flex-1 font-bold">Cancel</Button>
              <Button type="submit" disabled={submitting} className="h-14 rounded-2xl flex-[2] font-bold text-lg">
                {submitting ? <LoaderCircle className="h-5 w-5 animate-spin mr-2" /> : editingExpense ? "Update Entry" : "Record Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
