"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  ArrowUpRight, 
  History,
  Trash2,
  Edit3,
  LoaderCircle,
  RefreshCw,
  Box,
  Layers,
  BarChart2,
  LayoutGrid,
  ShieldAlert,
  ArrowDownLeft,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Info,
  Lock,
  Download,
  Calendar,
  AlertCircle
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
  DialogDescription as DialogDesc,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAdmin } from "@/context/AdminContext";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type InventoryItem = {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  max_stock_level: number;
  status: string;
  opening_stock: number;
  daily_consumption: number;
  daily_wastage: number;
  created_at: string;
  sku: string;
};

type Movement = {
  id: string;
  inventory_id: string;
  type: "Incoming" | "Outgoing" | "Neutral";
  amount: number;
  reason: string;
  created_at: string;
  inventory?: { item_name: string; unit: string };
};

const UNIT_MAP: Record<string, { category: string; unit: string; decimals: boolean }> = {
  "rice": { category: "Dry Goods", unit: "kg", decimals: true },
  "flour": { category: "Dry Goods", unit: "kg", decimals: true },
  "sugar": { category: "Dry Goods", unit: "kg", decimals: true },
  "milk": { category: "Liquids", unit: "Liter", decimals: true },
  "oil": { category: "Liquids", unit: "Liter", decimals: true },
  "syrup": { category: "Liquids", unit: "Liter", decimals: true },
  "egg": { category: "Countables", unit: "Pieces", decimals: false },
  "bread": { category: "Countables", unit: "Pieces", decimals: false },
  "cup": { category: "Consumables", unit: "Pieces", decimals: false },
  "straw": { category: "Consumables", unit: "Pieces", decimals: false },
};

export default function InventoryPage() {
  const { selectedOutlet, hasPermission } = useAdmin();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showItemModal, setShowItemModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isClosingDay, setIsClosingDay] = useState(false);

  // Form states
  const [itemFormData, setItemFormData] = useState({
    item_name: "",
    category: "Dry Goods",
    unit: "kg",
    low_stock_threshold: 5,
    max_stock_level: 100,
    sku: "",
    status: "Active"
  });

  const [movementFormData, setMovementFormData] = useState({
    type: "Incoming" as "Incoming" | "Outgoing" | "Neutral",
    amount: 0,
    reason: "Purchase",
  });

  useEffect(() => {
    if (!selectedOutlet) return;
    fetchData();
  }, [selectedOutlet]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchInventory(), fetchMovements()]);
    setLoading(false);
  };

  const [todayMetrics, setTodayMetrics] = useState({ consumption: 0, wastage: 0 });

  const fetchInventory = async () => {
    if (!selectedOutlet) return;
    
    // Fetch Inventory Master (Identity)
    const { data: masterData, error: masterError } = await supabase
      .from("inventory")
      .select("*")
      .eq("outlet_id", selectedOutlet.id)
      .order("item_name");
    
    if (masterError) return toast.error("Failed to load inventory master");

    // Fetch Current Stock (Calculated from movements via view)
    const { data: stockData, error: stockError } = await supabase
      .from("live_stock")
      .select("*")
      .eq("outlet_id", selectedOutlet.id);

    if (stockError) console.error("Stock fetch error:", stockError);

    // Fetch Today's Movements for metrics
    const today = new Date().toISOString().split('T')[0];
    const { data: todayMoves, error: moveError } = await supabase
      .from("inventory_movements")
      .select("amount, type, reason, inventory_id")
      .eq("outlet_id", selectedOutlet.id)
      .gte("created_at", `${today}T00:00:00Z`);

    if (!moveError && todayMoves) {
      const consumption = todayMoves
        .filter(m => m.type === "Outgoing" && m.reason !== "Wastage")
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      const wastage = todayMoves
        .filter(m => m.reason === "Wastage")
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      setTodayMetrics({ consumption, wastage });
    }

    // Merge identity with calculated stock
    const mergedItems = (masterData || []).map(item => {
      const stock = stockData?.find(s => s.inventory_id === item.id);
      
      // Calculate daily consumption per item from todayMoves
      const itemConsumption = todayMoves
        ?.filter(m => m.inventory_id === item.id && m.type === "Outgoing" && m.reason !== "Wastage")
        .reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const itemWastage = todayMoves
        ?.filter(m => m.inventory_id === item.id && m.reason === "Wastage")
        .reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      return {
        ...item,
        quantity: stock ? stock.current_stock : 0,
        daily_consumption: itemConsumption,
        daily_wastage: itemWastage
      };
    });

    setItems(mergedItems);
  };

  const fetchMovements = async () => {
    if (!selectedOutlet) return;
    const { data, error } = await supabase
      .from("inventory_movements")
      .select("*, inventory(item_name, unit)")
      .eq("outlet_id", selectedOutlet.id)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) console.error("Movements error:", error);
    else setMovements(data || []);
  };

  // Unit Auto-Detection
  useEffect(() => {
    const name = itemFormData.item_name.toLowerCase();
    for (const [keyword, config] of Object.entries(UNIT_MAP)) {
      if (name.includes(keyword)) {
        setItemFormData(prev => ({
          ...prev,
          category: config.category,
          unit: config.unit
        }));
        break;
      }
    }
  }, [itemFormData.item_name]);

  const handleItemSubmit = async () => {
    if (!hasPermission("inventory.update")) return toast.error("Permission denied");
    if (!itemFormData.item_name || !selectedOutlet) return toast.error("Name is required");
    setSubmitting(true);

    try {
      if (editingItem) {
        const { error } = await supabase
          .from("inventory")
          .update(itemFormData)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Identity updated");
      } else {
        const { error } = await supabase
          .from("inventory")
          .insert({
            ...itemFormData,
            quantity: 0,
            opening_stock: 0,
            outlet_id: selectedOutlet.id
          });
        if (error) throw error;
        toast.success("Item registered. Add stock via movements.");
      }
      setShowItemModal(false);
      fetchInventory();
    } catch (error) {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMovementSubmit = async () => {
    if (!selectedItemForMovement || !selectedOutlet) return;
    setSubmitting(true);

    try {
      // 1. Record movement
      const { error: moveError } = await supabase
        .from("inventory_movements")
        .insert({
          inventory_id: selectedItemForMovement.id,
          outlet_id: selectedOutlet.id,
          type: movementFormData.type,
          amount: movementFormData.amount,
          reason: movementFormData.reason
        });
      
      if (moveError) throw moveError;

      // 2. We NO LONGER update the quantity column in inventory table
      // as it's now calculated real-time from movements.

      toast.success("Stock updated successfully");
      setShowMovementModal(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to update stock");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDailyClosing = async () => {
    if (!selectedOutlet) return;
    setIsClosingDay(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Create snapshots
      const snapshots = items.map(item => ({
        outlet_id: selectedOutlet.id,
        inventory_id: item.id,
        date: today,
        opening_stock: item.opening_stock,
        used_today: item.daily_consumption,
        wastage: item.daily_wastage,
        closing_stock: item.quantity,
        unit: item.unit,
        is_locked: true
      }));

      const { error: snapError } = await supabase
        .from("inventory_snapshots")
        .upsert(snapshots);

      if (snapError) throw snapError;

      // 2. Set opening_stock for tomorrow in the master table
      await Promise.all(items.map(item => 
        supabase.from("inventory")
          .update({
            opening_stock: item.quantity
          })
          .eq("id", item.id)
      ));

      toast.success("Day closed successfully. Snapshots generated.");
      fetchData();
    } catch (error) {
      toast.error("Daily closing failed");
    } finally {
      setIsClosingDay(false);
    }
  };

  const exportToCSV = (type: 'daily' | 'monthly' | 'movements') => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = "";

    if (type === 'daily') {
      csvContent += "Item Name,Opening,Used Today,Wastage,Closing,Unit\n";
      items.forEach(item => {
        csvContent += `${item.item_name},${item.opening_stock},${item.daily_consumption},${item.daily_wastage},${item.quantity},${item.unit}\n`;
      });
      filename = `daily_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'movements') {
      csvContent += "Date,Item,Type,Quantity,Reason\n";
      movements.forEach(m => {
        csvContent += `${new Date(m.created_at).toLocaleString()},${m.inventory?.item_name},${m.type},${m.amount},${m.reason}\n`;
      });
      filename = `stock_movements_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredItems = items.filter(item => 
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = items.filter(item => Number(item.quantity) <= Number(item.low_stock_threshold));
    const totalConsumption = todayMetrics.consumption;
    const totalWastage = todayMetrics.wastage;

  if (!hasPermission("inventory.view")) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view inventory</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory OS</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Measured consumption for {selectedOutlet?.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button onClick={fetchData} variant="outline" size="sm" className="h-11 rounded-2xl border-2">
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Sync
          </Button>
          <Button 
            onClick={handleDailyClosing} 
            disabled={isClosingDay}
            variant="outline" 
            className="h-11 rounded-2xl border-2 border-primary/20 bg-primary/5 hover:bg-primary hover:text-white transition-all font-bold"
          >
            {isClosingDay ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
            Daily Closing
          </Button>
          <Button 
            onClick={() => { 
              setEditingItem(null); 
              setItemFormData({ item_name: "", category: "Dry Goods", unit: "kg", low_stock_threshold: 5, max_stock_level: 100, sku: "", status: "Active" }); 
              setShowItemModal(true); 
            }} 
            className="h-11 rounded-2xl font-bold shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Register Item
          </Button>
        </div>
      </div>

      {/* Enhanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-primary text-secondary rounded-[2rem] border-none shadow-xl shadow-primary/10 relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Total SKUs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-serif font-black">{items.length}</p>
          </CardContent>
          <Box className="absolute -bottom-4 -right-4 h-24 w-24 opacity-10" />
        </Card>

        <Card className="bg-white rounded-[2rem] border shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-serif font-black text-primary">{lowStockItems.length}</p>
          </CardContent>
          <AlertTriangle className="absolute -bottom-4 -right-4 h-24 w-24 text-orange-500 opacity-5" />
        </Card>

        <Card className="bg-white rounded-[2rem] border shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Today's Consumption</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-serif font-black text-primary italic">{totalConsumption.toFixed(0)}</p>
          </CardContent>
          <TrendingUp className="absolute -bottom-4 -right-4 h-24 w-24 text-green-500 opacity-5" />
        </Card>

        <Card className="bg-white rounded-[2rem] border shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Today's Wastage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-serif font-black text-primary italic">{totalWastage.toFixed(0)}</p>
          </CardContent>
          <Trash2 className="absolute -bottom-4 -right-4 h-24 w-24 text-red-500 opacity-5" />
        </Card>

        <Card className="bg-white rounded-[2rem] border shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <p className="text-4xl font-serif font-black text-primary">~2.4</p>
              <span className="text-[10px] font-bold text-muted-foreground">DAYS</span>
            </div>
          </CardContent>
          <Calendar className="absolute -bottom-4 -right-4 h-24 w-24 text-blue-500 opacity-5" />
        </Card>
      </div>

      <Tabs defaultValue="master" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <TabsList className="bg-white p-1 rounded-2xl border shadow-sm h-14 w-full md:w-auto">
            <TabsTrigger value="master" className="rounded-xl font-bold px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-white">Inventory Master</TabsTrigger>
            <TabsTrigger value="live" className="rounded-xl font-bold px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-white">Live Stock</TabsTrigger>
            <TabsTrigger value="consumption" className="rounded-xl font-bold px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-white">Daily Consumption</TabsTrigger>
            <TabsTrigger value="movements" className="rounded-xl font-bold px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-white">History</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filter items..." 
                className="h-11 pl-10 rounded-2xl bg-white border-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-11 rounded-2xl border-2" onClick={() => exportToCSV('daily')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* 1. Inventory Master View */}
        <TabsContent value="master">
          <div className="bg-white rounded-[2.5rem] overflow-hidden border shadow-xl">
            <CardContent className="p-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b">
                    <th className="p-6">Item Identity</th>
                    <th className="p-6">Category</th>
                    <th className="p-6">Unit</th>
                    <th className="p-6">Status</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="group hover:bg-muted/5">
                      <td className="p-6">
                        <p className="font-bold text-base">{item.item_name}</p>
                        <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/40">{item.sku || 'NO-SKU'}</p>
                      </td>
                      <td className="p-6"><Badge variant="outline" className="rounded-xl font-bold text-[10px]">{item.category}</Badge></td>
                      <td className="p-6 text-sm font-bold uppercase text-muted-foreground">{item.unit}</td>
                      <td className="p-6">
                        <Badge className={cn(
                          "rounded-xl font-bold text-[10px] px-2 py-0.5",
                          item.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}>{item.status}</Badge>
                      </td>
                      <td className="p-6 text-right">
                        <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10" onClick={() => { setEditingItem(item); setItemFormData({...item}); setShowItemModal(true); }}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </div>
        </TabsContent>

        {/* 2. Live Stock View */}
        <TabsContent value="live">
          <div className="bg-white rounded-[2.5rem] overflow-hidden border shadow-xl">
            <CardContent className="p-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b">
                    <th className="p-6">Item</th>
                    <th className="p-6">Opening Stock</th>
                    <th className="p-6">Current Stock</th>
                    <th className="p-6">Threshold</th>
                    <th className="p-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="group hover:bg-muted/5">
                      <td className="p-6 font-bold">{item.item_name}</td>
                      <td className="p-6 font-medium text-muted-foreground">{item.opening_stock} <span className="text-[9px] uppercase">{item.unit}</span></td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-2xl font-serif font-black",
                            item.quantity <= item.low_stock_threshold ? "text-red-600" : "text-primary"
                          )}>{item.quantity}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.unit}</span>
                        </div>
                      </td>
                      <td className="p-6 font-bold text-muted-foreground">{item.low_stock_threshold} <span className="text-[9px] uppercase">{item.unit}</span></td>
                      <td className="p-6">
                        {item.quantity <= item.low_stock_threshold ? (
                          <div className="flex items-center gap-1 text-red-600 font-bold text-[10px] uppercase">
                            <AlertCircle className="h-3 w-3" />
                            Low Stock
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600 font-bold text-[10px] uppercase">
                            <Box className="h-3 w-3" />
                            OK
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </div>
        </TabsContent>

        {/* 3. Daily Consumption View */}
        <TabsContent value="consumption">
          <div className="bg-white rounded-[2.5rem] overflow-hidden border shadow-xl">
            <CardContent className="p-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b">
                    <th className="p-6">Item</th>
                    <th className="p-6">Opening</th>
                    <th className="p-6">Used Today</th>
                    <th className="p-6">Wastage</th>
                    <th className="p-6">Closing</th>
                    <th className="p-6">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="group hover:bg-muted/5">
                      <td className="p-6 font-bold">{item.item_name}</td>
                      <td className="p-6 font-medium">{item.opening_stock}</td>
                      <td className="p-6 font-serif font-black text-blue-600">-{item.daily_consumption}</td>
                      <td className="p-6 font-serif font-black text-red-500">-{item.daily_wastage}</td>
                      <td className="p-6 font-serif font-black text-primary">{item.quantity}</td>
                      <td className="p-6 text-[10px] font-bold uppercase text-muted-foreground">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </div>
        </TabsContent>

        {/* 4. Movements View */}
        <TabsContent value="movements">
          <div className="bg-white rounded-[2.5rem] overflow-hidden border shadow-xl">
            <CardContent className="p-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b">
                    <th className="p-6">Time</th>
                    <th className="p-6">Item</th>
                    <th className="p-6">Type</th>
                    <th className="p-6">Qty</th>
                    <th className="p-6">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movements.map(move => (
                    <tr key={move.id} className="hover:bg-muted/5">
                      <td className="p-6 text-[10px] font-bold text-muted-foreground">
                        {new Date(move.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-6 font-bold">{move.inventory?.item_name}</td>
                      <td className="p-6">
                        <Badge className={cn(
                          "rounded-xl font-bold text-[9px] uppercase px-2",
                          move.type === 'Incoming' ? 'bg-green-100 text-green-700' : move.type === 'Outgoing' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        )}>{move.type}</Badge>
                      </td>
                      <td className="p-6 font-serif font-black">
                        {move.type === 'Outgoing' ? '-' : '+'}{move.amount}
                      </td>
                      <td className="p-6 text-xs font-medium text-muted-foreground">{move.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center pt-8">
        <Button 
          onClick={() => { setSelectedItemForMovement(items[0]); setShowMovementModal(true); }}
          className="h-14 rounded-full px-10 font-black text-lg shadow-2xl shadow-primary/20 hover:scale-105 transition-transform"
        >
          <ArrowRightLeft className="mr-3 h-6 w-6" />
          Quick Movement
        </Button>
      </div>

      {/* Identity Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6 text-center">
            <DialogTitle className="text-3xl font-serif font-bold">{editingItem ? "Edit Identity" : "Register Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Item Identity</label>
              <Input value={itemFormData.item_name} onChange={e => setItemFormData({...itemFormData, item_name: e.target.value})} className="h-14 rounded-2xl text-lg font-bold border-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Category</label>
                <Select value={itemFormData.category} onValueChange={v => setItemFormData({...itemFormData, category: v})}>
                  <SelectTrigger className="h-14 rounded-2xl font-bold border-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Dry Goods", "Liquids", "Countables", "Dairy", "Consumables"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Unit</label>
                <Input value={itemFormData.unit} onChange={e => setItemFormData({...itemFormData, unit: e.target.value})} className="h-14 rounded-2xl font-bold border-2" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-8 gap-3">
             <Button variant="outline" onClick={() => setShowItemModal(false)} className="h-14 rounded-2xl flex-1 font-bold">Cancel</Button>
             <Button onClick={handleItemSubmit} disabled={submitting} className="h-14 rounded-2xl flex-[2] font-bold">
               {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : "Confirm Master Entry"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement Modal */}
      <Dialog open={showMovementModal} onOpenChange={setShowMovementModal}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6 text-center">
            <DialogTitle className="text-3xl font-serif font-bold">Update Stock</DialogTitle>
            <DialogDesc className="font-bold text-primary">{selectedItemForMovement?.item_name}</DialogDesc>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Movement Type</label>
              <Select value={movementFormData.type} onValueChange={(v: any) => setMovementFormData({...movementFormData, type: v})}>
                <SelectTrigger className="h-14 rounded-2xl font-bold border-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Incoming">➕ Incoming (Purchase)</SelectItem>
                  <SelectItem value="Outgoing">➖ Outgoing (Consumption/Wastage)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Quantity ({selectedItemForMovement?.unit})</label>
              <Input type="number" value={movementFormData.amount} onChange={e => setMovementFormData({...movementFormData, amount: Number(e.target.value)})} className="h-14 rounded-2xl text-2xl font-serif font-black border-2" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Reason</label>
              <Select value={movementFormData.reason} onValueChange={v => setMovementFormData({...movementFormData, reason: v})}>
                <SelectTrigger className="h-14 rounded-2xl font-bold border-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Wastage">Wastage</SelectItem>
                  <SelectItem value="Order Consumption">Order Consumption</SelectItem>
                  <SelectItem value="Opening Stock">Opening Stock</SelectItem>
                  <SelectItem value="Manual Adjustment">Manual Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-8 gap-3">
             <Button variant="outline" onClick={() => setShowMovementModal(false)} className="h-14 rounded-2xl flex-1 font-bold">Cancel</Button>
             <Button onClick={handleMovementSubmit} disabled={submitting} className="h-14 rounded-2xl flex-[2] font-bold">
               {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : "Execute Movement"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
