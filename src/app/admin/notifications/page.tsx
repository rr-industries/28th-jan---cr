"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Bell, 
  Check, 
  Trash2, 
  Clock, 
  Filter, 
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Calendar,
  MoreVertical,
  ChevronRight,
  RefreshCw,
  Archive
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { markAsRead, markAllAsRead } from "@/lib/notifications";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-full-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const success = await markAsRead(id);
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleMarkAllRead = async () => {
    const success = await markAllAsRead();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("All marked as read");
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         n.message.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === "unread") return matchesSearch && !n.is_read;
    if (filter === "high") return matchesSearch && n.priority === "high";
    return matchesSearch;
  });

  const getIcon = (type: string, priority: string) => {
    const className = cn("h-5 w-5", priority === 'high' ? "text-red-500" : "");
    switch (type) {
      case 'success': return <CheckCircle2 className={cn(className, "text-green-500")} />;
      case 'warning': return <AlertTriangle className={cn(className, "text-yellow-500")} />;
      case 'error': return <XCircle className={cn(className, "text-red-500")} />;
      default: return <Info className={cn(className, "text-blue-500")} />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Notifications</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Track orders, bookings, and alerts in real-time
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="flex-1 md:flex-none h-11 rounded-xl">
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
          <Button variant="outline" size="sm" onClick={fetchNotifications} className="h-11 w-11 rounded-xl p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border space-y-6">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex bg-muted p-1 rounded-2xl w-full md:w-auto overflow-x-auto">
            {['all', 'unread', 'high'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  filter === f 
                    ? "bg-white text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search notifications..." 
              className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus:ring-primary font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading && notifications.length === 0 ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse h-24 bg-muted/50 rounded-3xl" />
          ))
        ) : filteredNotifications.length === 0 ? (
          <Card className="rounded-[2.5rem] border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Archive className="h-16 w-16 text-muted-foreground opacity-10 mb-4" />
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No notifications found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredNotifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "group relative flex flex-col md:flex-row items-start md:items-center gap-6 p-6 rounded-[2rem] border-2 transition-all hover:shadow-xl",
                  n.is_read ? "bg-white border-transparent shadow-sm" : "bg-primary/[0.02] border-primary/10 shadow-md"
                )}
              >
                <div className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner",
                  n.priority === 'high' ? "bg-red-50" : "bg-gray-50"
                )}>
                  {getIcon(n.type, n.priority)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className={cn(
                      "text-lg font-bold truncate",
                      !n.is_read ? "text-gray-900" : "text-gray-500"
                    )}>
                      {n.title}
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary/60">
                      {n.category}
                    </Badge>
                    {n.priority === 'high' && (
                      <Badge className="bg-red-500 text-white border-none text-[10px] font-black uppercase tracking-widest">
                        High Priority
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed font-medium">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Calendar className="h-3 w-3" />
                      {new Date(n.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto pt-4 md:pt-0">
                  {n.deep_link && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => router.push(n.deep_link)}
                      className="flex-1 md:flex-none h-11 rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest border-primary/20 hover:bg-primary hover:text-white transition-all"
                    >
                      View Details
                      <ChevronRight className="h-3 w-3 ml-2" />
                    </Button>
                  )}
                  {!n.is_read && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleMarkAsRead(n.id)}
                      className="h-11 w-11 rounded-xl text-green-600 hover:bg-green-50"
                      title="Mark as read"
                    >
                      <Check className="h-5 w-5" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(n.id)}
                    className="h-11 w-11 rounded-xl text-red-500 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
