"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Coffee,
  Search,
  Plus,
  ChevronRight,
  ShoppingCart,
  Clock,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  User,
  X,
  PlusCircle,
  MinusCircle,
  Receipt,
  Settings,
  LogOut,
  Info,
  Combine,
  Unlink,
  Check,
  Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";
import Link from "next/link";

type Table = {
  id: number;
  table_number: string;
  status: string;
  current_session?: TableSession;
  group_id?: string | null;
  current_order_id?: string | null;
};

type TableSession = {
  id: string;
  session_token: string;
  status: 'active' | 'closed';
  created_at: string;
};

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string;
};

type CartItem = MenuItem & { quantity: number };

// --- SUB-COMPONENT: ADMIN TABLES MANAGEMENT ---
function AdminTablesPage() {
  const { selectedOutlet, user, hasPermission } = useAdmin();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTableSettings, setShowTableSettings] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<number[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  useEffect(() => {
    if (!selectedOutlet) return;
    fetchTables();

    const tablesChannel = supabase
      .channel(`tables-changes-${selectedOutlet.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "cafe_tables",
        filter: `outlet_id=eq.${selectedOutlet.id}`
      }, fetchTables)
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
    };
  }, [selectedOutlet]);

  const fetchTables = async () => {
    if (!selectedOutlet) return;
    let query = supabase
      .from("cafe_tables")
      .select("*");

    if (!user?.is_super_admin) {
      query = query.eq("outlet_id", selectedOutlet.id);
    }

    const { data } = await query;

    if (data) {
      const sorted = [...data].sort((a, b) => {
        const numA = parseInt(a.table_number) || 0;
        const numB = parseInt(b.table_number) || 0;
        return numA - numB;
      });
      setTables(sorted);
    }
    setLoading(false);
  };

  const handleTableClick = (table: Table) => {
    if (table.status === "available") {
      toggleTableStatus(table);
    } else {
      setSelectedTable(table);
      setShowOptionsModal(true);
    }
  };

  const addTables = async (count: number) => {
    if (!hasPermission("tables.create")) return toast.error("Permission denied");
    if (!selectedOutlet) return;

    const currentMax = tables.length > 0 ? Math.max(...tables.map(t => parseInt(t.table_number) || 0)) : 0;
    const newTables = [];
    for (let i = 1; i <= count; i++) {
      const num = currentMax + i;
      newTables.push({
        outlet_id: selectedOutlet.id,
        table_number: num.toString(),
        status: "available",
        current_order_id: null
      });
    }

    const { error } = await supabase.from("cafe_tables").insert(newTables);
    if (error) toast.error("Failed to add tables");
    else { toast.success(`Added ${count} tables`); fetchTables(); }
  };

  const removeTables = async (count: number) => {
    if (!hasPermission("tables.delete")) return toast.error("Permission denied");
    if (!selectedOutlet) return;

    const availableTables = tables.filter(t => t.status === "available" && !t.group_id).sort((a, b) => b.id - a.id);
    if (availableTables.length < count) {
      toast.error(`Can only remove ${availableTables.length} free, non-merged tables`);
      return;
    }

    const tablesToRemove = availableTables.slice(0, count).map(t => t.id);
    const { error } = await supabase.from("cafe_tables").delete().in("id", tablesToRemove);
    if (error) toast.error("Failed to remove tables");
    else { toast.success(`Removed ${count} tables`); fetchTables(); }
  };

  const handleMerge = async () => {
    if (!hasPermission("tables.merge")) return toast.error("Permission denied");
    if (selectedForMerge.length < 2) return toast.error("Select at least 2 tables to merge");

    // Check if any selected table is already merged or busy
    const busyTables = tables.filter(t => selectedForMerge.includes(t.id) && (t.status !== "available" || t.group_id));
    if (busyTables.length > 0) {
      return toast.error("Can only merge available, non-merged tables");
    }

    const groupId = crypto.randomUUID();
    const { error } = await supabase
      .from("cafe_tables")
      .update({ group_id: groupId })
      .in("id", selectedForMerge);

    if (error) toast.error("Merge failed");
    else {
      toast.success(`Tables merged`);
      setShowMergeModal(false);
      setSelectedForMerge([]);
      fetchTables();
    }
  };

  const handleUnmerge = async (groupId: string) => {
    if (!hasPermission("tables.unmerge")) return toast.error("Permission denied");

    // Check if any table in group is occupied
    const groupTables = tables.filter(t => t.group_id === groupId);
    if (groupTables.some(t => t.status !== "available")) {
      return toast.error("Cannot unmerge occupied tables. Clear the tables first.");
    }

    const { error } = await supabase
      .from("cafe_tables")
      .update({ group_id: null })
      .eq("group_id", groupId);

    if (error) toast.error("Unmerge failed");
    else {
      toast.success("Tables unmerged successfully");
      fetchTables();
    }
  };

  const toggleTableStatus = async (table: Table) => {
    if (!hasPermission("tables.edit")) return;

    const newStatus = table.status === "available" ? "occupied" : "available";
    const { error } = await supabase
      .from("cafe_tables")
      .update({
        status: newStatus,
        current_order_id: newStatus === "available" ? null : table.current_order_id
      })
      .eq("id", table.id);

    if (error) {
      toast.error("Failed to update table status");
    } else {
      toast.success(`Table ${table.table_number} is now ${newStatus}`);
      fetchTables();
    }
  };

  const groupedTables = tables.reduce((acc, table) => {
    if (table.group_id) {
      if (!acc[table.group_id]) acc[table.group_id] = [];
      acc[table.group_id].push(table);
    }
    return acc;
  }, {} as Record<string, Table[]>);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tables & Seating</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Managing {tables.length} tables in {selectedOutlet?.name}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {hasPermission("tables.merge") && (
            <Button
              variant="outline"
              onClick={() => setShowMergeModal(true)}
              className="rounded-2xl border-2 flex-1 md:flex-none"
            >
              <Combine className="h-4 w-4 mr-2" />
              Merge Tables
            </Button>
          )}
          {hasPermission("settings.edit") && (
            <Button
              variant="outline"
              onClick={() => setShowTableSettings(true)}
              className="rounded-2xl border-2 flex-1 md:flex-none"
            >
              <Settings className="h-4 w-4 mr-2" />
              Config
            </Button>
          )}
          <Link href="/admin/billings" className="flex-1 md:flex-none">
            <Button className="rounded-2xl w-full shadow-lg shadow-primary/20">
              <Receipt className="h-4 w-4 mr-2" />
              Billings
            </Button>
          </Link>
        </div>
      </div>

      {Object.keys(groupedTables).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Merged Table Groups</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedTables).map(([groupId, groupTables]) => (
              <Card key={groupId} className="bg-primary/5 border-2 border-primary/10 rounded-[2.5rem] p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Combine className="h-4 w-4 text-primary" />
                    <span className="font-bold">Group {groupTables.map(t => t.table_number).join("-")}</span>
                  </div>
                  {hasPermission("tables.unmerge") && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full" onClick={() => handleUnmerge(groupId)}>
                      <Unlink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupTables.map(t => (
                    <Badge key={t.id} variant="secondary" className="rounded-lg py-1 px-3">Table {t.table_number}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">All Tables</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
          {tables.map(table => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5 }}
              onClick={() => handleTableClick(table)}
              className={cn(
                "relative group rounded-[2rem] p-6 text-center transition-all border-2 shadow-sm cursor-pointer",
                table.status === "available" ? "bg-white border-muted" : "bg-orange-50 border-orange-200",
                table.group_id && "border-primary/40 ring-2 ring-primary/5"
              )}
            >
              <div className={cn("text-3xl font-serif font-bold mb-1", table.status === "available" ? "text-foreground" : "text-orange-700")}>
                {table.table_number}
              </div>
              <div className={cn("text-[10px] font-bold uppercase tracking-widest", table.status === "available" ? "text-muted-foreground" : "text-orange-600")}>
                {table.status === "available" ? "Empty" : "Busy"}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <Dialog open={showOptionsModal} onOpenChange={setShowOptionsModal}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-serif font-bold">Table {selectedTable?.table_number}</DialogTitle>
            <p className="text-muted-foreground">Manage active session for this table</p>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            <Link href={`/admin/billings?table=${selectedTable?.table_number}`} className="w-full">
              <Button className="w-full h-16 rounded-2xl font-bold text-lg shadow-lg shadow-primary/10 flex items-center justify-between px-6">
                <div className="flex items-center gap-3"><Plus className="h-6 w-6" />Add Items / Manage Order</div>
                <ChevronRight className="h-5 w-5 opacity-50" />
              </Button>
            </Link>
            <Button variant="outline" onClick={() => { if (selectedTable) { toggleTableStatus(selectedTable); setShowOptionsModal(false); } }} className="w-full h-16 rounded-2xl font-bold text-lg border-2 flex items-center justify-between px-6 text-red-600 hover:bg-red-50">
              <div className="flex items-center gap-3"><LogOut className="h-6 w-6" />Clear Table</div>
              <ChevronRight className="h-5 w-5 opacity-50" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {showTableSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowTableSettings(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-serif font-bold text-center mb-8">Configure Tables</h2>
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Add New</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 5, 10, 20].map(num => <Button key={num} variant="outline" onClick={() => addTables(num)} className="rounded-2xl h-12 font-bold hover:bg-primary hover:text-white">+{num}</Button>)}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-red-500 mb-3">Remove Tables</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 5, 10, 20].map(num => (
                      <Button
                        key={num}
                        variant="outline"
                        onClick={() => removeTables(num)}
                        className="rounded-2xl h-12 font-bold border-red-100 text-red-500 hover:bg-red-50"
                      >
                        -{num}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <Button onClick={() => setShowTableSettings(false)} className="w-full mt-10 h-14 rounded-2xl text-lg font-bold">Done</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- MAIN COMPONENT: ORDERING CONSOLE (SHARED) ---
function SharedOrderingPage() {
  const { selectedOutlet, hasPermission, user } = useAdmin();
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    if (!selectedOutlet) return;
    fetchData();

    const tablesSubscription = supabase
      .channel('table-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_tables', filter: `outlet_id=eq.${selectedOutlet.id}` }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(tablesSubscription);
    };
  }, [selectedOutlet]);

  const fetchData = async () => {
    if (!selectedOutlet) return;

    let queryTables = supabase
      .from("cafe_tables")
      .select(`
          *,
          table_sessions!table_sessions_table_id_fkey (
            id,
            session_token,
            status,
            created_at
          )
        `);

    if (!user?.is_super_admin) {
      queryTables = queryTables.eq("outlet_id", selectedOutlet.id);
    }

    const { data: tablesData } = await queryTables.order("id");

    if (tablesData) {
      const processedTables = tablesData.map((t: any) => ({
        ...t,
        current_session: t.table_sessions?.find((s: any) => s.status === 'active')
      }));
      setTables(processedTables);
    }

    let queryMenu = supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true);

    if (!user?.is_super_admin) {
      queryMenu = queryMenu.eq("outlet_id", selectedOutlet.id);
    }

    const { data: menuData } = await queryMenu;

    if (menuData) setMenuItems(menuData);
    setLoading(false);
  };

  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [openingTableId, setOpeningTableId] = useState<number | null>(null);
  const [guestCount, setGuestCount] = useState("1");
  const [verifiedPhone, setVerifiedPhone] = useState("");

  const openSession = async () => {
    if (!openingTableId) return;
    if (!hasPermission("orders.create")) return toast.error("Permission denied");
    if (!selectedOutlet) return;

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const { data: session, error } = await supabase
      .from("table_sessions")
      .insert({
        table_id: openingTableId,
        session_token: token,
        status: 'active',
        outlet_id: selectedOutlet.id,
        opened_by: user?.id || 'SYSTEM',
        guest_count: parseInt(guestCount) || 1,
        verified_phone: verifiedPhone || null,
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to open table session");
      console.error("Session open error:", error);
    } else {
      toast.success("Table session opened");
      await supabase.from("cafe_tables").update({ status: 'occupied' }).eq("id", openingTableId);
      setShowOpenSessionModal(false);
      setOpeningTableId(null);
      setGuestCount("1");
      setVerifiedPhone("");
      fetchData();
    }
  };



  const closeSession = async (tableId: number, sessionId: string) => {
    await supabase.from("table_sessions").update({ status: 'closed' }).eq("id", sessionId);
    await supabase.from("cafe_tables").update({ status: 'available' }).eq("id", tableId);
    fetchData();
    setSelectedTable(null);
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const placeOrder = async () => {
    if (!selectedTable || !selectedTable.current_session || !selectedOutlet) return;
    const { data: order, error } = await supabase.from("orders").insert({
      table_id: selectedTable.id,
      session_id: selectedTable.current_session.id,
      outlet_id: selectedOutlet.id,
      total_amount: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0),
      status: 'new',
      is_approved: true,
      type: 'dine-in'
    }).select().single();

    if (error) return toast.error("Order failed");

    const items = cart.map(i => ({ order_id: order.id, menu_item_id: i.id, quantity: i.quantity, price_at_time: i.price }));
    await supabase.from("order_items").insert(items);
    toast.success("Order placed");
    setCart([]);
    setSelectedTable(null);
    fetchData();
  };

  const categories = ["All", ...Array.from(new Set(menuItems.map(i => i.category)))];
  const filteredMenu = menuItems.filter(item => (activeCategory === "All" || item.category === activeCategory) && item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="flex h-screen items-center justify-center"><Coffee className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className="flex flex-col h-screen -m-6 overflow-hidden bg-muted/30">
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center shrink-0">
        <div><h1 className="text-2xl font-serif font-bold text-primary">Ordering Console</h1><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{selectedOutlet?.name}</p></div>
        <div className="flex gap-4">
          <Badge variant="outline" className="h-10 rounded-full px-4 border-2 flex gap-2"><div className="h-2 w-2 rounded-full bg-green-500" />{tables.filter(t => !t.current_session).length} Free</Badge>
          <Badge variant="outline" className="h-10 rounded-full px-4 border-2 flex gap-2 bg-primary/5 border-primary/20"><div className="h-2 w-2 rounded-full bg-orange-500" />{tables.filter(t => t.current_session).length} Busy</Badge>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[400px] border-r bg-white p-6 overflow-y-auto space-y-6">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Table Map</h2>
          <div className="grid grid-cols-3 gap-4">
            {tables.map(table => (
              <button key={table.id} onClick={() => setSelectedTable(table)} className={cn("relative flex flex-col items-center justify-center aspect-square rounded-[1.5rem] border-2 transition-all", selectedTable?.id === table.id ? "border-primary bg-primary/5" : "border-muted bg-white", table.current_session && "border-orange-200 bg-orange-50/50")}>
                <span className="text-2xl font-serif font-bold">{table.table_number}</span>
                <span className="text-[9px] font-bold uppercase mt-1 opacity-60">{table.current_session ? "Active" : "Free"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-muted/20">
          {!selectedTable ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-40">
              <Coffee className="w-20 h-20 mb-4" />
              <h3 className="text-2xl font-serif font-bold italic">Select a table to begin</h3>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Session Header / Start Session Control */}
              <div className="bg-white px-8 py-6 border-b flex justify-between items-center shrink-0">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "h-16 w-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-serif font-bold transition-colors",
                    selectedTable.current_session ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {selectedTable.table_number}
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif font-bold">Table {selectedTable.table_number}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedTable.current_session ? (
                        <>
                          <Badge className="bg-green-500 rounded-full px-3 py-1">SESSION ACTIVE</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Started {new Date(selectedTable.current_session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      ) : (
                        <Badge variant="secondary" className="rounded-full px-3 py-1">SESSION INACTIVE</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  {selectedTable.current_session ? (
                    <Button
                      variant="destructive"
                      className="rounded-2xl h-14 px-8 font-bold text-lg shadow-lg shadow-red-200"
                      onClick={() => closeSession(selectedTable.id, selectedTable.current_session!.id)}
                    >
                      <LogOut className="mr-2 h-5 w-5" />
                      End Session
                    </Button>
                  ) : (
                    <Button
                      className="rounded-2xl h-14 px-10 font-bold text-xl shadow-xl shadow-primary/20 animate-pulse hover:animate-none"
                      onClick={() => {
                        setOpeningTableId(selectedTable.id);
                        setShowOpenSessionModal(true);
                      }}
                    >
                      <Play className="mr-2 h-6 w-6 fill-current" />
                      START SESSION
                    </Button>
                  )}
                </div>
              </div>

              <Dialog open={showOpenSessionModal} onOpenChange={setShowOpenSessionModal}>
                <DialogContent className="max-w-md rounded-[2.5rem] p-10 border-none shadow-2xl">
                  <DialogHeader className="mb-8 text-center">
                    <DialogTitle className="text-3xl font-serif font-bold">Open Table {selectedTable.table_number}</DialogTitle>
                    <DialogDescription className="text-lg">Set up a new dining session for this table</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-primary">Guest Count</label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={guestCount}
                        onChange={(e) => setGuestCount(e.target.value)}
                        className="h-14 rounded-2xl text-xl font-bold border-2 focus:border-primary shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-primary">Customer Phone (Optional)</label>
                      <Input
                        type="tel"
                        placeholder="+91"
                        value={verifiedPhone}
                        onChange={(e) => setVerifiedPhone(e.target.value)}
                        className="h-14 rounded-2xl text-xl font-bold border-2 focus:border-primary shadow-sm"
                      />
                    </div>
                    <Button
                      onClick={openSession}
                      className="w-full h-16 rounded-2xl text-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 mt-4"
                    >
                      ACTIVATE TABLE
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>


              {selectedTable.current_session ? (
                <div className="flex-1 flex overflow-hidden">
                  {/* Menu Selection Section */}
                  <div className="flex-1 flex flex-col overflow-hidden p-8 gap-8">
                    <div className="flex flex-col md:flex-row gap-4 shrink-0">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          placeholder="Search menu items..."
                          className="pl-12 h-14 rounded-2xl bg-white border-2 text-lg shadow-sm focus:border-primary"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {categories.map(cat => (
                          <Button
                            key={cat}
                            variant={activeCategory === cat ? "default" : "outline"}
                            onClick={() => setActiveCategory(cat)}
                            className="rounded-xl h-14 px-6 font-bold whitespace-nowrap border-2"
                          >
                            {cat}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                      {filteredMenu.map(item => (
                        <motion.div
                          key={item.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card
                            className="rounded-[2rem] border-2 hover:border-primary transition-all p-5 flex flex-col gap-4 cursor-pointer h-full group bg-white shadow-sm hover:shadow-xl"
                            onClick={() => addToCart(item)}
                          >
                            <div className="aspect-square w-full rounded-2xl bg-muted overflow-hidden relative">
                              <img src={item.image_url || "/placeholder-food.jpg"} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                              <div className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                                <Plus className="h-6 w-6 text-primary" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-lg leading-tight">{item.name}</h4>
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{item.category}</span>
                                <span className="text-xl font-serif font-bold text-primary">₹{item.price}</span>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Cart Section */}
                  <div className="w-[400px] bg-white border-l flex flex-col shadow-2xl z-10">
                    <div className="p-8 border-b bg-muted/5 flex items-center justify-between">
                      <h3 className="text-2xl font-serif font-bold flex items-center gap-3">
                        <ShoppingCart className="h-6 w-6 text-primary" />
                        Live Cart
                      </h3>
                      <Badge className="bg-primary/10 text-primary h-8 px-4 rounded-full font-bold">{cart.reduce((acc, i) => acc + i.quantity, 0)} Items</Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                      {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Plus className="h-10 w-10" />
                          </div>
                          <p className="font-serif italic text-lg">Your cart is empty</p>
                        </div>
                      ) : (
                        cart.map(item => (
                          <div key={item.id} className="flex gap-4 items-center bg-muted/20 p-5 rounded-[1.5rem] group relative">
                            <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0">
                              <img src={item.image_url || "/placeholder-food.jpg"} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm truncate">{item.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-lg bg-white shadow-sm"
                                  onClick={(e) => { e.stopPropagation(); setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i).filter(i => i.quantity > 0)); }}
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                                <span className="font-bold w-6 text-center">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-lg bg-white shadow-sm"
                                  onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-primary block">₹{item.price * item.quantity}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-8 bg-muted/5 border-t space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-muted-foreground font-medium">
                          <span>Subtotal</span>
                          <span>₹{cart.reduce((acc, i) => acc + (i.price * i.quantity), 0)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground font-medium">
                          <span>Tax (GST 5%)</span>
                          <span>₹{(cart.reduce((acc, i) => acc + (i.price * i.quantity), 0) * 0.05).toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-3xl font-serif font-bold text-primary pt-2 border-t border-primary/10">
                          <span>Total</span>
                          <span>₹{(cart.reduce((acc, i) => acc + (i.price * i.quantity), 0) * 1.05).toFixed(0)}</span>
                        </div>
                      </div>
                      <Button
                        className="w-full h-16 rounded-[1.5rem] text-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        disabled={cart.length === 0}
                        onClick={placeOrder}
                      >
                        <CheckCircle2 className="mr-2 h-6 w-6" />
                        PLACE ORDER
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-20 bg-white/50">
                  <div className="relative mb-8">
                    <div className="h-32 w-32 rounded-full bg-primary/5 flex items-center justify-center animate-pulse">
                      <Play className="h-16 w-16 text-primary fill-primary/20" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-2xl font-serif font-bold text-primary border-2 border-primary/10">
                      {selectedTable.table_number}
                    </div>
                  </div>
                  <h3 className="text-3xl font-serif font-bold mb-4 italic text-primary">Table {selectedTable.table_number} is ready</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-10 text-lg">Start a new session to begin taking orders for this table. This will generate a temporary token for the customer QR code.</p>
                  <Button
                    className="rounded-2xl h-16 px-12 font-bold text-2xl shadow-2xl shadow-primary/20 flex items-center gap-4"
                    onClick={() => {
                      setOpeningTableId(selectedTable.id);
                      setShowOpenSessionModal(true);
                    }}
                  >
                    <Plus className="h-8 w-8" />
                    START NEW SESSION
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CombinedTablesPage() {
  const [activeView, setActiveView] = useState("console");

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="bg-white p-1 rounded-2xl border shadow-sm flex gap-1">
          <Button
            variant={activeView === "console" ? "default" : "ghost"}
            onClick={() => setActiveView("console")}
            className="rounded-xl px-6 font-bold"
          >
            Ordering Console
          </Button>
          <Button
            variant={activeView === "management" ? "default" : "ghost"}
            onClick={() => setActiveView("management")}
            className="rounded-xl px-6 font-bold"
          >
            Table Management
          </Button>
        </div>
      </div>

      {activeView === "console" ? <SharedOrderingPage /> : <AdminTablesPage />}
    </div>
  );
}
