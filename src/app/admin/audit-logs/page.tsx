"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar,
  Download,
  RefreshCw,
  User,
  History,
  ShieldAlert,
  Info,
  AlertTriangle,
  Clock,
  LayoutGrid
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/context/AdminContext";

type AuditLog = {
  id: string;
  action: string;
  details: any;
  created_at: string;
  admin_users: {
    full_name: string;
    role: string;
  };
};

export default function AuditLogsPage() {
  const { selectedOutlet, hasPermission } = useAdmin();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!selectedOutlet) return;
    fetchAuditLogs();
  }, [selectedOutlet]);

  const fetchAuditLogs = async () => {
    if (!selectedOutlet) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          admin_users (
            full_name,
            role
          )
        `)
        .eq("outlet_id", selectedOutlet.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes("DELETE") || action.includes("CANCEL")) return <ShieldAlert className="h-4 w-4 text-red-500" />;
    if (action.includes("UPDATE")) return <History className="h-4 w-4 text-blue-500" />;
    if (action.includes("INSERT") || action.includes("CREATE")) return <Info className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.admin_users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasPermission("auditlogs.view")) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <FileText className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view audit logs</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Security and activity tracking for {selectedOutlet?.name}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={fetchAuditLogs} className="rounded-xl h-11">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by user, action or details..." 
              className="pl-10 rounded-xl h-10 border-muted bg-muted/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-xl h-10">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Time</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">User</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Entity Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                  <td className="p-6 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                        {log.admin_users?.full_name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{log.admin_users?.full_name || "System"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{log.admin_users?.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="text-xs font-black uppercase tracking-tight">{log.action}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="bg-muted/30 p-3 rounded-xl border">
                      <pre className="text-[10px] font-mono whitespace-pre-wrap break-all max-w-md">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="p-20 text-center">
            <History className="h-16 w-16 mx-auto text-muted-foreground/10 mb-4" />
            <p className="text-muted-foreground font-medium italic">No activity logs found for current outlet</p>
          </div>
        )}
      </div>
    </div>
  );
}
