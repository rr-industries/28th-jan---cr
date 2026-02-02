"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Calendar,
  Trash2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MoreVertical,
  Check,
  X,
  Phone,
  User,
  CalendarDays,
  CheckCircle,
  Plus,
  Shield,
  CalendarCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdmin } from "@/context/AdminContext";
import { createNotification } from "@/lib/notifications";

type Booking = {
  id: string;
  customer_name: string;
  phone_number: string;
  guest_count: number;
  booking_date: string;
  booking_time: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};

export default function BookingsPage() {
  const { selectedOutlet, user, hasPermission } = useAdmin();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedOutlet) return;
    fetchBookings();

    // Real-time subscription
    const bookingsSubscription = supabase
      .channel('bookings-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'table_bookings',
        filter: user?.is_super_admin ? undefined : `outlet_id=eq.${selectedOutlet.id}`
      }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsSubscription);
    };
  }, [dateFilter, selectedOutlet]);

  const fetchBookings = async () => {
    if (!selectedOutlet) return;
    setLoading(true);
    try {
      let query = supabase
        .from("table_bookings")
        .select("*");

      if (!user?.is_super_admin) {
        query = query.eq("outlet_id", selectedOutlet.id);
      }

      query = query
        .order("booking_date", { ascending: true })
        .order("booking_time", { ascending: true });

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      if (dateFilter === "today") {
        query = query.eq('booking_date', today);
      } else if (dateFilter === "tomorrow") {
        query = query.eq('booking_date', tomorrow);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: "confirmed" | "cancelled") => {
    if (!hasPermission("bookings.edit")) return toast.error("Permission denied");
    try {
      const booking = bookings.find(b => b.id === id);
      const { error } = await supabase
        .from("table_bookings")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      // Send notification to customer/staff
      await createNotification({
        title: status === 'confirmed' ? "Your Table is Confirmed ☕" : "Booking Cancelled",
        message: status === 'confirmed'
          ? `Your booking for ${booking?.guest_count} guests on ${booking?.booking_date} at ${booking?.booking_time} is confirmed.`
          : `Your booking for ${booking?.booking_date} at ${booking?.booking_time} has been cancelled.`,
        type: status === 'confirmed' ? "success" : "error",
        priority: "normal",
        category: "customer",
        reference_id: id,
        reference_type: "booking"
      });

      toast.success(`Booking ${status}`);
      fetchBookings();
    } catch (error) {
      toast.error("Status update failed");
    }
  };

  const deleteBooking = async (id: string) => {
    if (!hasPermission("bookings.cancel")) return toast.error("Permission denied");
    try {
      const { error } = await supabase
        .from("table_bookings")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Booking deleted");
      fetchBookings();
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const deleteSelectedBookings = async () => {
    if (!hasPermission("bookings.cancel")) return toast.error("Permission denied");
    try {
      const { error } = await supabase
        .from("table_bookings")
        .delete()
        .in("id", selectedBookings);

      if (error) throw error;
      toast.success(`${selectedBookings.length} bookings deleted`);
      setSelectedBookings([]);
      fetchBookings();
    } catch (error) {
      toast.error("Batch delete failed");
    }
  };

  const filteredBookings = bookings.filter(b =>
    b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.phone_number.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-500 text-white font-bold uppercase text-[10px] px-2 py-0.5 border-none shadow-sm"><CheckCircle className="h-3 w-3 mr-1" /> Confirmed</Badge>;
      case 'cancelled': return <Badge className="bg-red-500 text-white font-bold uppercase text-[10px] px-2 py-0.5 border-none shadow-sm"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      default: return <Badge variant="outline" className="text-[10px] font-bold uppercase px-2 py-0.5">Pending</Badge>;
    }
  };

  const toggleSelectAll = () => {
    if (selectedBookings.length === filteredBookings.length && filteredBookings.length > 0) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(filteredBookings.map(b => b.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedBookings(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!hasPermission("bookings.view")) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Shield className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view bookings</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Table Bookings</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Manage reservations for {selectedOutlet?.name}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={fetchBookings} variant="outline" size="sm" className="flex-1 md:flex-none h-11 rounded-xl">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {selectedBookings.length > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelectedBookings} className="flex-1 md:flex-none h-11 rounded-xl">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedBookings.length})
            </Button>
          )}
          {hasPermission("bookings.create") && (
            <Button className="flex-1 md:flex-none h-11 rounded-xl shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border space-y-6">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex bg-muted p-1 rounded-2xl w-full md:w-auto">
            {['all', 'today', 'tomorrow'].map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={cn(
                  "flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize",
                  dateFilter === filter
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filter === 'all' ? 'All Dates' : filter}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by phone or name..."
              className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t pt-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={toggleSelectAll}>
            <Checkbox
              checked={selectedBookings.length === filteredBookings.length && filteredBookings.length > 0}
              onCheckedChange={toggleSelectAll}
              className="rounded-md"
            />
            <span className="text-sm font-bold text-muted-foreground">Select All ({filteredBookings.length})</span>
          </div>
          {filteredBookings.some(b => b.status === 'confirmed') && (
            <Badge className="bg-green-100 text-green-700 border-green-200 rounded-lg">Bookings accepted</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse h-64 bg-muted/50 rounded-[2.5rem]" />
          ))
        ) : filteredBookings.length === 0 ? (
          <div className="col-span-full py-24 text-center">
            <CalendarDays className="h-16 w-16 mx-auto text-muted-foreground opacity-10 mb-4" />
            <p className="text-muted-foreground font-medium">No reservations found for this period</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "group relative bg-white rounded-[2.5rem] border-2 p-7 transition-all hover:shadow-2xl hover:border-primary/20",
                selectedBookings.includes(booking.id) ? "border-primary" : "border-transparent shadow-md"
              )}
            >
              <div className="absolute top-5 left-5 z-10">
                <Checkbox
                  checked={selectedBookings.includes(booking.id)}
                  onCheckedChange={() => toggleSelect(booking.id)}
                  className="rounded-md h-5 w-5"
                />
              </div>

              <div className="flex justify-between items-start mb-6 pl-8">
                <div className="space-y-1">
                  <h3 className="font-bold text-xl line-clamp-1">{booking.customer_name}</h3>
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Phone className="h-3.5 w-3.5" />
                    <span className="text-sm tracking-tighter">{booking.phone_number}</span>
                  </div>
                </div>
                {getStatusBadge(booking.status)}
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Date
                    </div>
                    <p className="text-sm font-bold">{formatDate(booking.booking_date)}</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                      <Clock className="h-3 w-3" /> Time
                    </div>
                    <p className="text-sm font-bold">{booking.booking_time}</p>
                  </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-xl">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-bold text-lg text-primary">{booking.guest_count} Guests</span>
                  </div>
                  <Badge variant="outline" className="bg-white border-primary/20 text-[10px] font-bold uppercase">Reserved</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-dashed">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Booked On</p>
                  <p className="text-[10px] font-medium">{new Date(booking.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                </div>

                <div className="flex gap-2">
                  {booking.status === 'pending' && hasPermission("bookings.edit") && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full border-2 border-transparent hover:border-green-200"
                      onClick={() => updateStatus(booking.id, 'confirmed')}
                    >
                      <Check className="h-5 w-5" />
                    </Button>
                  )}
                  {hasPermission("bookings.cancel") && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full border-2 border-transparent hover:border-red-200"
                      onClick={() => deleteBooking(booking.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
