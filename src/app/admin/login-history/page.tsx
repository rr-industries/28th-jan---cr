"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, 
  Download, 
  LogIn,
  LogOut as LogOutIcon,
  Monitor,
  Clock,
  LoaderCircle,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SessionLog = {
  id: string;
  admin_user_id: string;
  login_at: string;
  logout_at: string | null;
  device_info: string | null;
  ip_address: string | null;
  status: "active" | "logged_out";
  admin_user?: {
    name: string;
    email: string;
    role: string;
  };
};

export default function LoginHistoryPage() {
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("admin_sessions")
      .select(`
        *,
        admin_user:admin_users (
          name,
          email,
          role
        )
      `)
      .order("login_at", { ascending: false });

    if (error) {
      toast.error("Failed to load login history");
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  const formatDuration = (loginAt: string, logoutAt: string | null) => {
    if (!logoutAt) return "Currently Active";
    
    const start = new Date(loginAt).getTime();
    const end = new Date(logoutAt).getTime();
    const duration = end - start;
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = ["Employee", "Email", "Role", "Login Time", "Logout Time", "Duration", "IP Address", "Status"];
      const rows = sessions.map(session => [
        session.admin_user?.name || "Unknown",
        session.admin_user?.email || "Unknown",
        session.admin_user?.role || "Unknown",
        new Date(session.login_at).toLocaleString(),
        session.logout_at ? new Date(session.logout_at).toLocaleString() : "Active",
        formatDuration(session.login_at, session.logout_at),
        session.ip_address || "Unknown",
        session.status
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `login-history-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Login history exported successfully");
    } catch (error) {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const filteredSessions = sessions.filter(session => 
    session.admin_user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.admin_user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todaySessions = filteredSessions.filter(session => {
    const today = new Date().toDateString();
    return new Date(session.login_at).toDateString() === today;
  });

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Login & logout tracking for all admin users</p>
        </div>
        <Button 
          onClick={exportToCSV} 
          disabled={exporting}
          variant="outline" 
          className="rounded-xl"
        >
          {exporting ? (
            <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 mr-2" />
          )}
          Export Logs
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">Today&apos;s Logins</div>
          <div className="text-3xl font-serif font-bold text-primary">{todaySessions.length}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">Active Sessions</div>
          <div className="text-3xl font-serif font-bold text-green-600">
            {sessions.filter(s => s.status === "active").length}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">Total Records</div>
          <div className="text-3xl font-serif font-bold">{sessions.length}</div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Login / Logout</th>
              <th className="px-6 py-4">Duration</th>
              <th className="px-6 py-4">Device & IP</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSessions.map((session) => (
              <tr key={session.id} className="group hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                      {session.admin_user?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-bold">{session.admin_user?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{session.admin_user?.role || "unknown"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <LogIn className="h-3 w-3 text-green-500" />
                      {new Date(session.login_at).toLocaleString()}
                    </div>
                    {session.logout_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LogOutIcon className="h-3 w-3 text-red-500" />
                        {new Date(session.logout_at).toLocaleString()}
                      </div>
                    )}
                    {!session.logout_at && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        Currently Active
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {formatDuration(session.login_at, session.logout_at)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Monitor className="h-3 w-3 text-muted-foreground" />
                      {session.device_info || "Unknown Device"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.ip_address || "Unknown IP"}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                    session.status === "active" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-gray-100 text-gray-700"
                  )}>
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      session.status === "active" ? "bg-green-500" : "bg-gray-500"
                    )} />
                    {session.status === "active" ? "Active" : "Logged Out"}
                  </span>
                </td>
              </tr>
            ))}
            {filteredSessions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  No login records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
