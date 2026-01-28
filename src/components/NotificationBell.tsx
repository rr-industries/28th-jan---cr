"use client";

import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Check, 
  Trash2, 
  ExternalLink, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { 
  markAsRead, 
  markAllAsRead, 
  NotificationType, 
  NotificationPriority 
} from "@/lib/notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Play a sound or show a toast for high priority
          if (payload.new.priority === 'high') {
            toast.info(`High Priority: ${payload.new.title}`, {
              description: payload.new.message,
              action: payload.new.deep_link ? {
                label: 'View',
                onClick: () => router.push(payload.new.deep_link)
              } : undefined
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          setNotifications(prev => 
            prev.map(n => n.id === payload.new.id ? payload.new : n)
          );
          updateUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const updateUnreadCount = () => {
    setUnreadCount(prev => {
      const count = notifications.filter(n => !n.is_read).length;
      return count;
    });
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await markAsRead(id);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllRead = async () => {
    const success = await markAllAsRead();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleNotificationClick = (n: any) => {
    if (!n.is_read) {
      markAsRead(n.id);
      setNotifications(prev => 
        prev.map(item => item.id === n.id ? { ...item, is_read: true } : item)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (n.deep_link) {
      router.push(n.deep_link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 relative bg-primary/5 hover:bg-primary/10 text-primary transition-all">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 rounded-2xl p-0 shadow-2xl border-primary/10 overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-primary/5 border-b border-primary/10">
          <div>
            <h3 className="text-sm font-bold text-primary">Notifications</h3>
            <p className="text-[10px] text-primary/60 font-bold uppercase tracking-wider">{unreadCount} Unread Messages</p>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllRead}
              className="h-7 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 text-primary"
            >
              Mark all as read
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto bg-white">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-400">No notifications yet</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">We'll let you know when something happens</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "group relative flex gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer",
                    !n.is_read && "bg-primary/[0.02]"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    n.priority === 'high' ? "bg-red-50" : "bg-gray-50"
                  )}>
                    {getIcon(n.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={cn(
                        "text-sm font-bold truncate pr-6",
                        !n.is_read ? "text-gray-900" : "text-gray-500"
                      )}>
                        {n.title}
                      </h4>
                      {!n.is_read && (
                        <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </div>
                      <div className="h-1 w-1 rounded-full bg-gray-200" />
                      <div className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                        {n.category}
                      </div>
                    </div>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white rounded-lg border shadow-sm"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3 text-green-600" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-2 bg-gray-50 border-t">
            <Button 
              variant="ghost" 
              className="w-full h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white"
              onClick={() => router.push('/admin/notifications')}
            >
              View all history
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
