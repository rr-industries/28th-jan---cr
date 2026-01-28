"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Bell,
  Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { toast } from "sonner";

// SSR-safe Recharts imports
const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then((mod) => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((mod) => mod.Area), { ssr: false });

type Order = {
  id: string;
  table_number: number;
  total_price: number;
  status: string;
  created_at: string;
  payment_mode?: string;
};

export default function AdminOverview() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    liveOrders: 0,
    totalOrders: 0,
    avgPrepTime: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    fetchStats();
    fetchRecentOrders();
    
    const ordersSubscription = supabase
      .channel('admin_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          toast.info(`New order received!`);
        }
        fetchStats();
        fetchRecentOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
      .from("orders")
      .select("total_price, status, created_at, updated_at")
      .gte('created_at', today.toISOString());

    if (orders) {
      const completed = orders.filter(o => o.status === 'completed');
      const cancelled = orders.filter(o => o.status === 'cancelled');
      const live = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
      const revenue = completed.reduce((acc, o) => acc + Number(o.total_price), 0);
      
      let totalPrepTime = 0;
      let prepCount = 0;
      completed.forEach(o => {
        if (o.updated_at && o.created_at) {
          const diff = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000;
          if (diff > 0 && diff < 120) {
            totalPrepTime += diff;
            prepCount++;
          }
        }
      });

      const hourlyData: Record<string, number> = {};
      orders.forEach(o => {
        const hour = new Date(o.created_at).getHours();
        const label = `${hour.toString().padStart(2, '0')}:00`;
        hourlyData[label] = (hourlyData[label] || 0) + Number(o.total_price);
      });

      const chartArray = Object.entries(hourlyData)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setChartData(chartArray.length > 0 ? chartArray : [
        { name: "08:00", total: 0 },
        { name: "12:00", total: 0 },
        { name: "16:00", total: 0 },
        { name: "20:00", total: 0 },
      ]);
      
      setStats({
        todayRevenue: revenue,
        liveOrders: live.length,
        totalOrders: orders.length,
        avgPrepTime: prepCount > 0 ? Math.round(totalPrepTime / prepCount) : 15,
        completedOrders: completed.length,
        cancelledOrders: cancelled.length,
      });
    }
  };

  const fetchRecentOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setRecentOrders(data);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'new': return "bg-blue-100 text-blue-600";
      case 'preparing': return "bg-orange-100 text-orange-600";
      case 'ready': return "bg-green-100 text-green-600";
      case 'completed': return "bg-gray-100 text-gray-600";
      case 'cancelled': return "bg-red-100 text-red-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now.getTime() - then.getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  const statCards = [
    { 
      label: "Today's Revenue", 
      value: `₹${stats.todayRevenue.toFixed(0)}`, 
      icon: DollarSign, 
      color: "text-green-600",
      bg: "bg-green-100",
      trend: `${stats.completedOrders} completed`,
      isUp: true
    },
    { 
      label: "Live Orders", 
      value: stats.liveOrders.toString(), 
      icon: Bell, 
      color: "text-blue-600",
      bg: "bg-blue-100",
      trend: "Active now",
      isUp: true
    },
    { 
      label: "Total Orders", 
      value: stats.totalOrders.toString(), 
      icon: ShoppingBag, 
      color: "text-orange-600",
      bg: "bg-orange-100",
      trend: `${stats.cancelledOrders} cancelled`,
      isUp: stats.cancelledOrders === 0
    },
    { 
      label: "Avg Prep Time", 
      value: `${stats.avgPrepTime}m`, 
      icon: Clock, 
      color: "text-purple-600",
      bg: "bg-purple-100",
      trend: stats.avgPrepTime < 20 ? "Efficient" : "Normal",
      isUp: stats.avgPrepTime < 20
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">Real-time cafe performance</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="overflow-hidden border-none shadow-sm rounded-[2.5rem]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={cn("rounded-2xl p-3", stat.bg)}>
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-bold",
                    stat.isUp ? "text-green-600" : "text-red-600"
                  )}>
                    {stat.trend}
                    {stat.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">{stat.label}</h3>
                  <p className="mt-1 text-3xl font-serif font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Revenue Chart */}
          <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Revenue Overview (Today)</CardTitle>
            </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c2d12" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#7c2d12" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E1D9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v: any) => [`₹${v}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#7c2d12" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

          {/* Hourly Orders */}
          <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Hourly Performance</CardTitle>
            </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E1D9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v: any) => [`₹${v}`, 'Revenue']}
                />
                <Bar 
                  dataKey="total" 
                  fill="#ECD8B6" 
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Live Orders Feed */}
      <Card className="border-none shadow-sm overflow-hidden rounded-[2.5rem]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold">Live Status Feed</CardTitle>
          <Button variant="ghost" asChild size="sm">
            <Link href="/admin/orders">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Table</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold">Table {order.table_number}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                        getStatusStyle(order.status)
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {getTimeAgo(order.created_at)}
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">₹{Number(order.total_price).toFixed(0)}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      No orders yet today
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
