"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Shield,
    Search,
    Store,
    Check,
    Lock,
    Settings,
    ChevronRight,
    User,
    LoaderCircle,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type PermissionRecord = {
    key: string;
    section: string;
    description: string;
};

type UserRecord = {
    id: string;
    employee_id: string;
    name: string;
    role: string;
    is_active: boolean;
};

type OutletRecord = {
    id: string;
    name: string;
};

export default function AccessMatrixPage() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [outlets, setOutlets] = useState<OutletRecord[]>([]);
    const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
    const [selectedOutlet, setSelectedOutlet] = useState<OutletRecord | null>(null);
    const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [usersRes, outletsRes, permsRes] = await Promise.all([
            supabase.from("employees").select("*").order("name"),
            supabase.from("outlets").select("*").order("name"),
            supabase.from("permissions").select("*").order("section")
        ]);

        if (usersRes.data) setUsers(usersRes.data);
        if (outletsRes.data) {
            setOutlets(outletsRes.data);
            if (outletsRes.data.length > 0) {
                setSelectedOutlet(outletsRes.data[0]);
            }
        }
        if (permsRes.data) setPermissions(permsRes.data);
        setLoading(false);
    };

    useEffect(() => {
        if (selectedUser && selectedOutlet) {
            fetchUserPermissions(selectedUser.id, selectedOutlet.id);
        } else {
            setUserPermissions({});
        }
    }, [selectedUser, selectedOutlet]);

    const fetchUserPermissions = async (userId: string, outletId: string) => {
        const { data } = await supabase
            .from("user_outlets")
            .select("permissions")
            .eq("user_id", userId)
            .eq("outlet_id", outletId)
            .maybeSingle();

        setUserPermissions(data?.permissions || {});
    };

    const togglePermission = (key: string) => {
        if (!selectedUser) return;
        setUserPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const savePermissions = async () => {
        if (!selectedUser || !selectedOutlet) return;
        setSaving(true);

        // Optimistic UI update already happened via state
        const { error } = await supabase
            .from("user_outlets")
            .upsert({
                user_id: selectedUser.id,
                outlet_id: selectedOutlet.id,
                permissions: userPermissions
            }, { onConflict: "user_id,outlet_id" });

        if (error) {
            toast.error("Failed to save permissions");
            // Revert would be complex here, so we just user to retry
        } else {
            toast.success(`Access Matrix updated for ${selectedUser.name}`);
        }
        setSaving(false);
    };

    const sections = Array.from(new Set(permissions.map(p => p.section)));

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] -m-4 lg:-m-8 flex flex-col lg:flex-row bg-[#fafaf9]">
            {/* Sidebar - User Selection */}
            <div className="w-full lg:w-96 border-r bg-white flex flex-col h-full z-10 shadow-sm">
                <div className="p-6 border-b space-y-4">
                    <div>
                        <h1 className="text-2xl font-serif font-bold tracking-tight">Access Matrix</h1>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                            Security & Permissions
                        </p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Find employee..."
                            className="pl-9 bg-muted/30 border-none rounded-xl font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {users
                                .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.employee_id.includes(searchTerm))
                                .map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                                            selectedUser?.id === user.id
                                                ? "bg-primary/5 border-2 border-primary/10 shadow-lg shadow-primary/5"
                                                : "hover:bg-muted/50 border-2 border-transparent"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-colors",
                                            selectedUser?.id === user.id ? "bg-primary text-white" : "bg-white border text-muted-foreground"
                                        )}>
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm font-bold truncate",
                                                selectedUser?.id === user.id ? "text-primary" : "text-foreground"
                                            )}>{user.name}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{user.employee_id}</span>
                                                <span className="text-[10px] font-bold text-muted-foreground/60">•</span>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{user.role}</span>
                                            </div>
                                        </div>
                                        {selectedUser?.id === user.id && (
                                            <ChevronRight className="h-4 w-4 text-primary" />
                                        )}
                                    </button>
                                ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content - Matrix */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {!selectedUser ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                        <div className="h-24 w-24 rounded-3xl bg-gray-100 flex items-center justify-center mb-6">
                            <User className="h-10 w-10 opacity-20" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Select an Employee</h2>
                        <p className="max-w-md text-sm font-medium">Choose an employee from the sidebar to configure their system-wide access rights and permissions.</p>
                    </div>
                ) : (
                    <>
                        {/* Header / Actions */}
                        <div className="h-20 border-b bg-white px-8 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Manage Permissions</h3>
                            </div>

                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={savePermissions}
                                    disabled={saving}
                                    className="h-10 rounded-xl font-bold shadow-lg shadow-primary/20"
                                >
                                    {saving ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                                    {saving ? "Deploying..." : "Update Rights"}
                                </Button>
                            </div>
                        </div>

                        {/* Matrix Scroll Area */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#fafaf9]">
                            <div className="max-w-4xl mx-auto space-y-12 pb-20">

                                {/* ID Card Header */}
                                <div className="flex items-center gap-6 p-6 rounded-[2rem] bg-white shadow-sm border border-gray-100">
                                    <div className="h-20 w-20 rounded-2xl bg-primary text-white flex items-center justify-center text-3xl font-bold shadow-xl shadow-primary/20">
                                        {selectedUser.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-serif font-bold">{selectedUser.name}</h2>
                                        <div className="flex gap-2 mt-2">
                                            <Badge variant="outline" className="rounded-md font-mono text-[10px] uppercase tracking-wider font-bold">
                                                {selectedUser.employee_id}
                                            </Badge>
                                            <Badge
                                                className={cn(
                                                    "rounded-md font-bold text-[10px] uppercase tracking-wider",
                                                    selectedUser.is_active ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 shadow-none border-transparent" : "bg-red-500/10 text-red-600 shadow-none border-transparent"
                                                )}
                                            >
                                                {selectedUser.is_active ? "Active Status" : "Inactive"}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="ml-auto text-right hidden sm:block">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Access Level</p>
                                        <p className="text-lg font-bold text-primary flex items-center justify-end gap-2 text-right">
                                            {selectedUser.role}
                                        </p>
                                    </div>
                                </div>

                                {/* Permissions Grid */}
                                <div className="space-y-10">
                                    {sections.map(section => (
                                        <div key={section} className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-px flex-1 bg-border/60" />
                                                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">{section}</h3>
                                                <div className="h-px flex-1 bg-border/60" />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {permissions.filter(p => p.section === section).map(perm => {
                                                    const isActive = userPermissions[perm.key];
                                                    return (
                                                        <div
                                                            key={perm.key}
                                                            onClick={() => togglePermission(perm.key)}
                                                            className={cn(
                                                                "group cursor-pointer rounded-[1.5rem] p-5 border-2 transition-all duration-300 relative overflow-hidden",
                                                                isActive
                                                                    ? "bg-white border-primary/20 shadow-xl shadow-primary/5"
                                                                    : "bg-white border-transparent hover:border-gray-200 shadow-sm"
                                                            )}
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <p className={cn(
                                                                        "font-bold text-base mb-1 transition-colors",
                                                                        isActive ? "text-primary" : "text-gray-700"
                                                                    )}>{perm.description}</p>
                                                                    <code className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase">{perm.key}</code>
                                                                </div>

                                                                <div className={cn(
                                                                    "h-8 w-14 rounded-full p-1 transition-all duration-300 flex items-center",
                                                                    isActive ? "bg-primary" : "bg-gray-100"
                                                                )}>
                                                                    <div className={cn(
                                                                        "h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-300",
                                                                        isActive ? "translate-x-6" : "translate-x-0"
                                                                    )} />
                                                                </div>
                                                            </div>

                                                            {isActive && (
                                                                <div className="absolute -bottom-6 -right-6 h-24 w-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
