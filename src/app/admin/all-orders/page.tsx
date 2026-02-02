"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Search,
    Filter,
    Download,
    Trash2,
    Calendar,
    Clock,
    MoreVertical,
    ChevronDown,
    LoaderCircle,
    X,
    FileText,
    User,
    Hash,
    ShoppingBag,
    ExternalLink,
    CheckCircle2,
    XCircle,
    AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/context/AdminContext";

type OrderItem = {
    id: string;
    quantity: number;
    price_at_time: number;
    menu_items: {
        name: string;
    };
};

type Order = {
    id: string;
    created_at: string;
    status: string;
    total_amount: number;
    customer_name: string;
    cafe_tables: {
        table_number: string;
    } | null;
    bills: {
        payment_status: string;
        bill_number: string;
    }[] | null;
    order_items: OrderItem[];
};

export default function AllOrdersPage() {
    const { selectedOutlet, user, hasPermission } = useAdmin();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (selectedOutlet) {
            fetchOrders();
        }
    }, [selectedOutlet]);

    const fetchOrders = async () => {
        if (!selectedOutlet) return;
        setLoading(true);
        try {
            let query = supabase
                .from("orders")
                .select(`
          *,
          cafe_tables!table_id(table_number),
          order_items (
            id,
            quantity,
            price_at_time,
            menu_items (name)
          ),
          bills (
            bill_number,
            payment_status
          )
        `);

            if (!user?.is_super_admin) {
                query = query.eq("outlet_id", selectedOutlet.id);
            }

            const { data, error } = await query.order("created_at", { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            toast.error("Failed to load orders");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!hasPermission("orders.delete")) return toast.error("Permission denied");

        setDeleting(true);
        try {
            // Delete order items first due to FK
            await supabase.from("order_items").delete().eq("order_id", orderId);
            // Delete bills associated with this order
            await supabase.from("bills").delete().eq("order_id", orderId);
            // Delete the order
            const { error } = await supabase.from("orders").delete().eq("id", orderId);

            if (error) throw error;

            toast.success("Order deleted successfully");
            setOrders(orders.filter(o => o.id !== orderId));
            setSelectedOrders(selectedOrders.filter(id => id !== orderId));
        } catch (err) {
            toast.error("Failed to delete order");
        } finally {
            setDeleting(false);
            setOrderToDelete(null);
        }
    };

    const handleBulkDelete = async () => {
        if (!hasPermission("orders.delete")) return toast.error("Permission denied");

        setDeleting(true);
        try {
            await supabase.from("order_items").delete().in("order_id", selectedOrders);
            await supabase.from("bills").delete().in("order_id", selectedOrders);
            const { error } = await supabase.from("orders").delete().in("id", selectedOrders);

            if (error) throw error;

            toast.success(`${selectedOrders.length} orders deleted successfully`);
            setOrders(orders.filter(o => !selectedOrders.includes(o.id)));
            setSelectedOrders([]);
        } catch (err) {
            toast.error("Failed to delete orders");
        } finally {
            setDeleting(false);
            setShowBulkDeleteConfirm(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedOrders.length === filteredOrders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(filteredOrders.map(o => o.id));
        }
    };

    const toggleSelectOrder = (orderId: string) => {
        if (selectedOrders.includes(orderId)) {
            setSelectedOrders(selectedOrders.filter(id => id !== orderId));
        } else {
            setSelectedOrders([...selectedOrders, orderId]);
        }
    };

    const filteredOrders = orders.filter(order => {
        const customer = order.customer_name || "Guest";
        const table = order.cafe_tables?.table_number || "N/A";
        const matchesSearch =
            customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            table.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || order.status === statusFilter;

        const orderDate = new Date(order.created_at);
        const matchesStart = !startDate || orderDate >= new Date(startDate);
        const matchesEnd = !endDate || orderDate <= new Date(new Date(endDate).setHours(23, 59, 59));

        return matchesSearch && matchesStatus && matchesStart && matchesEnd;
    });

    const exportCSV = () => {
        const headers = ["Order ID", "Date", "Customer", "Table", "Cashier", "Items", "Amount", "Status", "Payment"];
        const rows = filteredOrders.map(order => [
            order.id.slice(0, 8),
            new Date(order.created_at).toLocaleString(),
            order.customer_name || "Guest",
            order.cafe_tables?.table_number || "N/A",
            "N/A",
            order.order_items.map(i => `${i.quantity}x ${i.menu_items.name}`).join("; "),
            order.total_amount,
            order.status,
            order.bills?.[0]?.payment_status || "N/A"
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            completed: "bg-green-100 text-green-700 border-green-200",
            cancelled: "bg-red-100 text-red-700 border-red-200",
            new: "bg-blue-100 text-blue-700 border-blue-200",
            preparing: "bg-orange-100 text-orange-700 border-orange-200",
            ready: "bg-purple-100 text-purple-700 border-purple-200",
            served: "bg-indigo-100 text-indigo-700 border-indigo-200"
        };
        return (
            <Badge variant="outline" className={cn("rounded-lg font-bold uppercase tracking-wider text-[10px]", variants[status] || "bg-gray-100")}>
                {status}
            </Badge>
        );
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">All Orders</h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        View and manage all historical orders
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedOrders.length > 0 && (
                        <Button
                            variant="destructive"
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="rounded-xl font-bold"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected ({selectedOrders.length})
                        </Button>
                    )}
                    <Button onClick={exportCSV} variant="outline" className="rounded-xl border-2 font-bold">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search Customer/Table</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Customer name or table..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 rounded-xl h-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="pl-9 rounded-xl h-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="pl-9 rounded-xl h-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                            <div className="flex gap-2">
                                <select
                                    className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="ready">Ready</option>
                                    <option value="preparing">Preparing</option>
                                    <option value="new">New</option>
                                </select>
                                {(startDate || endDate || searchTerm || statusFilter !== "all") && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setSearchTerm("");
                                            setStartDate("");
                                            setEndDate("");
                                            setStatusFilter("all");
                                        }}
                                        className="rounded-xl"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="rounded-[2rem] bg-white border border-border/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-muted/30 text-[10px] uppercase font-black tracking-[0.1em] text-muted-foreground border-b">
                                <th className="px-6 py-4 w-12 text-center">
                                    <Checkbox
                                        checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4">Order ID & Date</th>
                                <th className="px-6 py-4">Customer & Table</th>
                                <th className="px-6 py-4">Cashier</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            <AnimatePresence mode="popLayout">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-24 text-center">
                                            <LoaderCircle className="h-8 w-8 animate-spin text-primary mx-auto" />
                                            <p className="mt-2 text-sm text-muted-foreground font-medium">Loading orders...</p>
                                        </td>
                                    </tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-20">
                                                <ShoppingBag className="h-12 w-12" />
                                                <p className="text-lg font-bold">No orders found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <motion.tr
                                            key={order.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className={cn(
                                                "group hover:bg-primary/[0.02] transition-colors",
                                                selectedOrders.includes(order.id) && "bg-primary/[0.04]"
                                            )}
                                        >
                                            <td className="px-6 py-4 text-center">
                                                <Checkbox
                                                    checked={selectedOrders.includes(order.id)}
                                                    onCheckedChange={() => toggleSelectOrder(order.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-[10px] font-bold uppercase text-primary tracking-tighter">#{order.id.slice(0, 8)}</span>
                                                    <span className="text-xs font-medium text-muted-foreground">{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{order.customer_name || "Guest"}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Hash className="h-3 w-3" />
                                                        Table {order.cafe_tables?.table_number || "N/A"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-muted-foreground">N/A</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-bold">{order.order_items.length} Items</span>
                                                    <div className="flex -space-x-1 overflow-hidden">
                                                        {order.order_items.slice(0, 3).map((item, i) => (
                                                            <div key={i} className="h-5 w-5 rounded-full border border-white bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary" title={item.menu_items.name}>
                                                                {item.menu_items.name.charAt(0)}
                                                            </div>
                                                        ))}
                                                        {order.order_items.length > 3 && (
                                                            <div className="h-5 w-5 rounded-full border border-white bg-muted flex items-center justify-center text-[8px] font-bold" title={`+${order.order_items.length - 3} more`}>
                                                                +{order.order_items.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-black text-primary">₹{Number(order.total_amount).toFixed(0)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(order.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    {order.bills?.[0]?.payment_status || "UNPAID"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-none">
                                                        <DropdownMenuItem className="text-xs font-bold" onClick={() => toast.info("Details view coming soon")}>
                                                            <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-xs font-bold text-red-600 focus:bg-red-50 focus:text-red-600"
                                                            onClick={() => setOrderToDelete(order.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                            Delete Order
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {!loading && filteredOrders.length > 0 && (
                    <div className="p-4 bg-muted/20 border-t flex items-center justify-between text-xs font-bold text-muted-foreground">
                        <span>Showing {filteredOrders.length} orders</span>
                        <span>Total Value: ₹{filteredOrders.reduce((acc, curr) => acc + Number(curr.total_amount), 0).toFixed(0)}</span>
                    </div>
                )}
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
                    <AlertDialogHeader>
                        <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-serif font-bold text-gray-900">Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-gray-500">
                            Are you sure you want to delete this order? This will also remove associated bill records and order items. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 gap-3">
                        <AlertDialogCancel className="h-14 rounded-2xl flex-1 font-bold border-2">Keep Order</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => orderToDelete && handleDeleteOrder(orderToDelete)}
                            disabled={deleting}
                            className="h-14 rounded-2xl flex-1 font-bold bg-red-600 hover:bg-red-700 shadow-xl shadow-red-600/20"
                        >
                            {deleting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : "Delete Permanently"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation */}
            <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
                    <AlertDialogHeader>
                        <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-serif font-bold text-gray-900">Bulk Delete Orders</AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-gray-500">
                            You are about to delete {selectedOrders.length} orders. This will remove all associated records and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 gap-3">
                        <AlertDialogCancel className="h-14 rounded-2xl flex-1 font-bold border-2">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={deleting}
                            className="h-14 rounded-2xl flex-1 font-bold bg-red-600 hover:bg-red-700 shadow-xl shadow-red-600/20"
                        >
                            {deleting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : "Delete Selected"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
