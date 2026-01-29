"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/context/AdminContext";
import { format, differenceInMinutes, differenceInHours } from "date-fns";
import {
    Shield,
    Activity,
    Lock,
    Search,
    Filter,
    Download,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Globe,
    Smartphone,
    MoreHorizontal,
    LogOut,
    Eye,
    FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

type AuditLog = {
    id: string;
    action: string;
    entity: string;
    details: any;
    admin_user_id: string;
    session_id: string;
    created_at: string;
    severity?: 'low' | 'medium' | 'high';
};

type AdminSession = {
    id: string;
    admin_user_id: string;
    login_at: string;
    logout_at: string | null;
    ip_address: string;
    device_info: string;
    status: 'active' | 'logged_out' | 'expired';
    risk_score?: number;
};

export default function SecurityCenter() {
    const { user, selectedOutlet } = useAdmin();
    const [activeTab, setActiveTab] = useState("activity");
    const [loading, setLoading] = useState(true);

    // Data
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [sessions, setSessions] = useState<AdminSession[]>([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filterAction, setFilterAction] = useState("all");

    // Selection
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [selectedSession, setSelectedSession] = useState<AdminSession | null>(null);

    useEffect(() => {
        if (selectedOutlet) {
            if (activeTab === "activity") fetchAuditLogs();
            else fetchSessions();
        }
    }, [selectedOutlet, activeTab]);

    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("audit_logs")
                .select("*")
                .eq("outlet_id", selectedOutlet?.id)
                .order("created_at", { ascending: false })
                .limit(100);

            if (filterAction !== "all") {
                query = query.eq("action", filterAction);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Enhance logs with risk detection
            const enhancedLogs = (data || []).map((log: any) => ({
                ...log,
                severity: detectLogSeverity(log)
            }));

            setLogs(enhancedLogs);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    };

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("admin_sessions")
                .select("*")
                .eq("outlet_id", selectedOutlet?.id)
                .order("login_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            setSessions(data || []);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load sessions");
        } finally {
            setLoading(false);
        }
    };

    const detectLogSeverity = (log: AuditLog): 'low' | 'medium' | 'high' => {
        const highRiskActions = ['DELETE', 'UPDATE_PERMISSION', 'FORCE_LOGOUT', 'EXPORT'];
        if (highRiskActions.some(a => log.action.toUpperCase().includes(a))) return 'high';
        if (log.action.toUpperCase().includes('UPDATE')) return 'medium';
        return 'low';
    };

    const calculateDuration = (start: string, end: string | null) => {
        if (!end) return "Active";
        const minutes = differenceInMinutes(new Date(end), new Date(start));
        if (minutes < 60) return `${minutes}m`;
        return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    };

    const handleForceLogout = async (sessionId: string) => {
        if (user?.role !== 'Super Admin') {
            toast.error("Only Super Admins can force logout");
            return;
        }

        try {
            const { error } = await supabase
                .from("admin_sessions")
                .update({ status: 'logged_out', logout_at: new Date().toISOString() })
                .eq("id", sessionId);

            if (error) throw error;

            // Log this action
            await supabase.from("audit_logs").insert({
                action: "FORCE_LOGOUT",
                entity: "Session",
                details: { target_session: sessionId },
                admin_user_id: user.id,
                outlet_id: selectedOutlet?.id
            });

            toast.success("Session terminated");
            fetchSessions();
        } catch (e) {
            toast.error("Action failed");
        }
    };

    const handleExport = () => {
        const dataToExport = activeTab === "activity" ? logs : sessions;
        const filename = `${activeTab}_${format(new Date(), "yyyy-MM-dd")}.csv`;

        // Convert to CSV
        const headers = Object.keys(dataToExport[0] || {}).join(",");
        const rows = dataToExport.map((row: any) =>
            Object.values(row).map(v =>
                typeof v === 'object' ? JSON.stringify(v).replace(/,/g, ";") : v
            ).join(",")
        ).join("\n");

        const csvContent = `${headers}\n${rows}`;
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = filename;
        link.href = url;
        link.click();

        // Log Export
        if (selectedOutlet && user) {
            supabase.from("audit_logs").insert({
                action: "EXPORT_DATA",
                entity: "Security Logs",
                details: { type: activeTab },
                admin_user_id: user.id,
                outlet_id: selectedOutlet.id
            }).then(() => { }); // Fire and forget
        }
    };

    const filteredLogs = logs.filter(log =>
        JSON.stringify(log).toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6 pb-20 max-w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-2xl">
                            <Shield className="h-7 w-7 text-blue-700" />
                        </div>
                        Security Center
                    </h1>
                    <p className="text-muted-foreground mt-1">Audit logs, login history, and threat monitoring</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Logs
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="rounded-[2rem] border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="py-4">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider">Active Sessions</CardDescription>
                        <CardTitle className="text-2xl">{sessions.filter(s => s.status === 'active').length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="rounded-[2rem] border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="py-4">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider">High Risk Events</CardDescription>
                        <CardTitle className="text-2xl text-red-600">{logs.filter(l => l.severity === 'high').length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="rounded-[2rem] border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="py-4">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider">Total Actions Today</CardDescription>
                        <CardTitle className="text-2xl">{logs.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="rounded-[2rem] border-l-4 border-l-purple-500 shadow-sm">
                    <CardHeader className="py-4">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider">System Status</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                            Secure
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white p-1 rounded-2xl border mb-6 h-auto">
                    <TabsTrigger value="activity" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <Activity className="h-4 w-4 mr-2" />
                        Activity Logs
                    </TabsTrigger>
                    <TabsTrigger value="access" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <Lock className="h-4 w-4 mr-2" />
                        Access Logs (Logins)
                    </TabsTrigger>
                </TabsList>

                {/* --- ACTIVITY LOGS TAB --- */}
                <TabsContent value="activity">
                    <Card className="rounded-[2.5rem] border-2 shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-muted/20 flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search logs..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-10 rounded-xl bg-white"
                                />
                            </div>
                            <Select value={filterAction} onValueChange={setFilterAction}>
                                <SelectTrigger className="w-[180px] rounded-xl bg-white">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Action Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    <SelectItem value="LOGIN">Logins</SelectItem>
                                    <SelectItem value="UPDATE">Updates</SelectItem>
                                    <SelectItem value="DELETE">Deletes</SelectItem>
                                    <SelectItem value="EXPORT">Exports</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">Time</th>
                                        <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">Action</th>
                                        <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">Admin</th>
                                        <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">Entity</th>
                                        <th className="text-center p-4 font-bold text-xs uppercase tracking-wider">Risk</th>
                                        <th className="text-right p-4 font-bold text-xs uppercase tracking-wider"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-muted/5 group">
                                            <td className="p-4 whitespace-nowrap text-muted-foreground">
                                                {format(new Date(log.created_at), "MMM dd, HH:mm:ss")}
                                            </td>
                                            <td className="p-4 font-bold">
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-mono">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-mono">{log.admin_user_id.substring(0, 8)}...</td>
                                            <td className="p-4">{log.entity}</td>
                                            <td className="p-4 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "uppercase text-[10px]",
                                                        log.severity === 'high' ? "bg-red-100 text-red-700 border-red-200" :
                                                            log.severity === 'medium' ? "bg-orange-100 text-orange-700 border-orange-200" :
                                                                "bg-green-100 text-green-700 border-green-200"
                                                    )}
                                                >
                                                    {log.severity}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>View Details</Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center p-12 text-muted-foreground">No logs found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* --- ACCESS LOGS TAB --- */}
                <TabsContent value="access">
                    <Card className="rounded-[2.5rem] border-2 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">Status</th>
                                        <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">User</th>
                                        <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">Login Time</th>
                                        <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">Duration</th>
                                        <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">IP / Device</th>
                                        <th className="text-right p-4 font-bold text-xs uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {sessions.map((session) => (
                                        <tr key={session.id} className="hover:bg-muted/5">
                                            <td className="p-4">
                                                <Badge variant="outline" className={cn(
                                                    session.status === 'active' ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500"
                                                )}>
                                                    {session.status}
                                                </Badge>
                                            </td>
                                            <td className="p-4 font-mono text-xs">{session.admin_user_id.substring(0, 8)}...</td>
                                            <td className="p-4">{format(new Date(session.login_at), "MMM dd, HH:mm")}</td>
                                            <td className="p-4 font-mono text-muted-foreground">
                                                {calculateDuration(session.login_at, session.logout_at)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-bold flex items-center gap-1"><Globe className="h-3 w-3" /> {session.ip_address}</span>
                                                    <span className="text-muted-foreground truncate max-w-[150px]">{session.device_info}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {session.status === 'active' && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={() => handleForceLogout(session.id)}
                                                        >
                                                            <LogOut className="h-3 w-3 mr-1" />
                                                            Kill Session
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs">View Activity</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Detail Dialog */}
            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Audit Log Details</DialogTitle>
                        <DialogDescription className="font-mono text-xs">{selectedLog?.id}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-muted rounded-xl">
                                <span className="text-xs font-bold uppercase text-muted-foreground">Action</span>
                                <p className="font-bold">{selectedLog?.action}</p>
                            </div>
                            <div className="p-3 bg-muted rounded-xl">
                                <span className="text-xs font-bold uppercase text-muted-foreground">Entity</span>
                                <p className="font-bold">{selectedLog?.entity}</p>
                            </div>
                        </div>

                        <div>
                            <span className="text-xs font-bold uppercase text-muted-foreground mb-2 block">JSON Payload</span>
                            <ScrollArea className="h-[200px] w-full rounded-xl border bg-slate-950 p-4 text-slate-50 font-mono text-xs">
                                <pre>{JSON.stringify(selectedLog?.details, null, 2)}</pre>
                            </ScrollArea>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
