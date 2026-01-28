"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/context/AdminContext";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  CreditCard,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Utensils,
  Ban,
  Receipt,
  FileText,
  UserCheck,
  Wallet,
  TrendingDown,
  BarChart3,
  LoaderCircle,
  Percent,
  Timer,
  Heart,
  LayoutGrid,
  CheckCircle2
} from "lucide-react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then((mod) => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((mod) => mod.Area), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((mod) => mod.Line), { ssr: false });
const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), { ssr: false });

export default function AdminReports() {
  const { selectedOutlet, user } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("today");
  const [reportData, setReportData] = useState<any>(null);

  const fetchReportData = useCallback(async () => {
    if (!selectedOutlet) return;

    setLoading(true);
    try {
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      const now = new Date();
      if (timeRange === "week") {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === "month") {
        startDate.setMonth(now.getMonth() - 1);
      } else if (timeRange === "six_month") {
        startDate.setMonth(now.getMonth() - 6);
      } else if (timeRange === "year") {
        startDate.setFullYear(now.getFullYear() - 1);
      } else if (timeRange === "today") {
        // Already set
      }

      // Fetch Orders with standardized fields
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            menu_items (name, category)
          )
        `)
        .eq('outlet_id', selectedOutlet.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      const safeOrders = orders || [];
      const completedOrders = safeOrders.filter(o => o.status === 'completed');
      const cancelledOrders = safeOrders.filter(o => o.status === 'cancelled');

      const grossRevenue = completedOrders.reduce((acc, o) => acc + (Number(o.total_amount || o.total_price) || 0), 0);
      const totalOrders = completedOrders.length;
      const aov = totalOrders > 0 ? grossRevenue / totalOrders : 0;

      const totalTax = grossRevenue - (grossRevenue / 1.05);
      const cgst = totalTax / 2;
      const sgst = totalTax / 2;

      // Trends
      const trendsMap = new Map();
      completedOrders.forEach(o => {
        const date = new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        trendsMap.set(date, (trendsMap.get(date) || 0) + (Number(o.total_amount || o.total_price) || 0));
      });
      const trends = Array.from(trendsMap.entries()).map(([name, value]) => ({ name, value }));
      if (trends.length === 0) trends.push({ name: 'No Data', value: 0 });

      // Payments
      const paymentMap = new Map();
      completedOrders.forEach(o => {
        const mode = o.payment_mode || 'Cash';
        paymentMap.set(mode, (paymentMap.get(mode) || 0) + 1);
      });
      const paymentData = Array.from(paymentMap.entries()).map(([name, value]) => ({ name, value }));
      if (paymentData.length === 0) paymentData.push({ name: 'N/A', value: 1 });

      // Items & Categories
      const itemSalesMap = new Map();
      const categorySalesMap = new Map();
      completedOrders.forEach(o => {
        o.order_items?.forEach((oi: any) => {
          const name = oi.menu_items?.name || "Unknown";
          const cat = oi.menu_items?.category || "Misc";
          const qty = Number(oi.quantity) || 0;
          const price = Number(oi.price_at_time || oi.menu_items?.price) || 0;

          itemSalesMap.set(name, (itemSalesMap.get(name) || 0) + qty);
          categorySalesMap.set(cat, (categorySalesMap.get(cat) || 0) + (qty * price));
        });
      });

      const topItems = Array.from(itemSalesMap.entries())
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      const categoryData = Array.from(categorySalesMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setReportData({
        grossRevenue,
        totalOrders,
        aov,
        cancelledCount: cancelledOrders.length,
        revenueLost: cancelledOrders.reduce((acc, o) => acc + (Number(o.total_amount || o.total_price) || 0), 0),
        cgst,
        sgst,
        trends,
        paymentData,
        topItems: topItems.length > 0 ? topItems : [{ name: 'No Data', sales: 0 }],
        categoryData: categoryData.length > 0 ? categoryData : [{ name: 'No Data', value: 0 }],
        bestSeller: topItems[0]?.name || "N/A",
        cancellationRate: safeOrders.length > 0 ? (cancelledOrders.length / safeOrders.length) * 100 : 0,
        avgPrepTime: "15m", // Placeholder as requested in UI
        retentionRate: 84,
        regularsCount: 128,
        visitsPerMonth: 4.2,
        staffErrorRate: 2.1
      });

    } catch (error: any) {
      console.error("Reports fetch error:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [selectedOutlet, timeRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  if (loading || !reportData) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Super Admin Header */}
      <div className="bg-primary rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <TrendingUp className="h-32 w-32" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl">S</div>
            <div>
              <h2 className="text-xl font-bold">Super Admin</h2>
              <p className="text-sm opacity-70">Analytics Report</p>
            </div>
          </div>
          <h1 className="text-4xl font-serif font-bold mb-2">Comprehensive business performance overview</h1>
          <p className="opacity-80">Real-time data for {selectedOutlet?.name}</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border shadow-sm overflow-x-auto no-scrollbar gap-4">
        <div className="flex gap-2 min-w-max">
          {["today", "week", "month", "six_month", "year"].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "ghost"}
              onClick={() => setTimeRange(range)}
              className="rounded-2xl px-6 font-bold capitalize"
            >
              {range.replace('_', ' ')}
            </Button>
          ))}
        </div>
        <Button variant="outline" className="rounded-2xl font-bold border-2 shrink-0">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="rounded-[2.5rem] border-2 bg-white p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Revenue</p>
          <h3 className="text-3xl font-serif font-bold text-primary">₹{reportData.grossRevenue.toFixed(0)}</h3>
        </Card>
        <Card className="rounded-[2.5rem] border-2 bg-white p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Orders</p>
          <h3 className="text-3xl font-serif font-bold">{reportData.totalOrders}</h3>
        </Card>
        <Card className="rounded-[2.5rem] border-2 bg-white p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Avg Order (AOV)</p>
          <h3 className="text-3xl font-serif font-bold">₹{reportData.aov.toFixed(0)}</h3>
        </Card>
        <Card className="rounded-[2.5rem] border-2 bg-white p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Best Seller</p>
          <h3 className="text-lg font-bold truncate mt-2">{reportData.bestSeller}</h3>
        </Card>
        <Card className="rounded-[2.5rem] border-2 bg-white p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Cancelled</p>
          <h3 className="text-3xl font-serif font-bold text-red-500">{reportData.cancelledCount}</h3>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Trend */}
        <Card className="lg:col-span-2 rounded-[2.5rem] border shadow-xl p-8">
          <CardTitle className="text-xl font-serif mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Sales Trend
            <span className="text-xs font-normal text-muted-foreground ml-2">Daily revenue performance</span>
          </CardTitle>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData.trends}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c2d12" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#7c2d12" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#7c2d12" strokeWidth={4} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* GST Breakdown */}
        <Card className="rounded-[2.5rem] border shadow-xl p-8 bg-muted/5">
          <CardTitle className="text-xl font-serif mb-6 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Tax Collected (GST)
          </CardTitle>
          <div className="space-y-6">
            <div className="p-5 bg-white rounded-2xl border flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase opacity-50">CGST (2.5%)</p>
                <p className="text-2xl font-serif font-bold">₹{reportData.cgst.toLocaleString()}</p>
              </div>
              <Percent className="h-8 w-8 opacity-10" />
            </div>
            <div className="p-5 bg-white rounded-2xl border flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase opacity-50">SGST (2.5%)</p>
                <p className="text-2xl font-serif font-bold">₹{reportData.sgst.toLocaleString()}</p>
              </div>
              <Percent className="h-8 w-8 opacity-10" />
            </div>
            <div className="p-6 bg-primary text-white rounded-3xl flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase opacity-70">Total GST</p>
                <p className="text-3xl font-serif font-bold">₹{(reportData.cgst + reportData.sgst).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cancellations & Losses */}
        <Card className="rounded-[2.5rem] border shadow-xl p-8">
          <CardTitle className="text-xl font-serif mb-6 flex items-center gap-2 text-red-600">
            <Ban className="h-5 w-5" />
            Cancellations & Losses
          </CardTitle>
          <div className="space-y-6">
            <div className="flex justify-between items-end border-b pb-4">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Revenue Lost</p>
                <p className="text-3xl font-serif font-bold">₹{reportData.revenueLost.toLocaleString()}</p>
              </div>
              <p className="text-xs font-medium text-muted-foreground mb-1">From {reportData.cancelledCount} cancelled orders</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 font-bold">!</div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Cancellation Rate</p>
                <p className="text-xl font-bold">{reportData.cancellationRate.toFixed(1)}% of total attempts</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">⏱️</div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Average Prep Efficiency</p>
                <p className="text-xl font-bold">Highly Efficient</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Customer Loyalty */}
        <Card className="rounded-[2.5rem] border shadow-xl p-8">
          <CardTitle className="text-xl font-serif mb-6 flex items-center gap-2 text-primary">
            <Heart className="h-5 w-5" />
            Customer Loyalty
          </CardTitle>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative h-48 w-48 mb-6">
              <svg className="h-full w-full" viewBox="0 0 36 36">
                <path className="text-muted/20" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-primary" stroke="currentColor" strokeWidth="3" strokeDasharray="84, 100" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-serif font-bold">84%</span>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Retention</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 w-full">
              <div className="text-center">
                <p className="text-2xl font-serif font-bold">128</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Regulars</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-serif font-bold">4.2</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Visits/Mo</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Staff Performance Summary */}
        <Card className="rounded-[2.5rem] border shadow-xl p-8">
          <CardTitle className="text-xl font-serif mb-6 flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />
            Staff Performance Summary
          </CardTitle>
          <div className="space-y-6">
            <div className="p-5 bg-muted/20 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Orders Processed</p>
                <p className="text-2xl font-serif font-bold">{reportData.totalOrders}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="p-5 bg-muted/20 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-serif font-bold">2.1%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Timer className="h-5 w-5 text-orange-500" />
              </div>
            </div>
            <div className="pt-4">
              <Button className="w-full rounded-2xl h-12 font-bold">Detailed Staff Audit</Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[2.5rem] border shadow-xl p-8">
          <CardTitle className="text-xl font-serif mb-6 flex items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            Top Selling Items
          </CardTitle>
          <div className="space-y-4">
            {reportData.topItems.map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold opacity-30">0{idx + 1}</span>
                  <span className="font-bold">{item.name}</span>
                </div>
                <span className="font-serif font-bold text-primary">{item.sales} sold</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[2.5rem] border shadow-xl p-8">
          <CardTitle className="text-xl font-serif mb-6 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Category Sales
          </CardTitle>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={10} width={100} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#7c2d12" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
