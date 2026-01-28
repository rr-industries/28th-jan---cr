"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  Plus, 
  Search, 
  Shield, 
  Store, 
  Check, 
  X, 
  ChevronRight, 
  LoaderCircle,
  Trash2,
  Edit2,
  Lock,
  ChevronDown,
  Settings,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAdmin } from "@/context/AdminContext";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

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

export default function AdminManagementPage() {
  const { hasPermission, user: currentUser } = useAdmin();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [outlets, setOutlets] = useState<OutletRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [selectedOutletForPerms, setSelectedOutletForPerms] = useState<OutletRecord | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();

    // Subscribe to changes
    const employeesSubscription = supabase
      .channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchEmployees();
      })
      .subscribe();

    const outletsSubscription = supabase
      .channel('outlets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outlets' }, () => {
        fetchOutlets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(employeesSubscription);
      supabase.removeChannel(outletsSubscription);
    };
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from("employees").select("*").order("name");
    if (data) setUsers(data);
  };

  const fetchOutlets = async () => {
    const { data } = await supabase.from("outlets").select("*").order("name");
    if (data) setOutlets(data);
  };

  const fetchData = async () => {
    setLoading(true);
    const [usersRes, outletsRes, permsRes] = await Promise.all([
      supabase.from("employees").select("*").order("name"),
      supabase.from("outlets").select("*").order("name"),
      supabase.from("permissions").select("*").order("section")
    ]);

    if (usersRes.data) setUsers(usersRes.data);
    if (outletsRes.data) setOutlets(outletsRes.data);
    if (permsRes.data) setPermissions(permsRes.data);
    setLoading(false);
  };

  const openPermissions = async (user: UserRecord, outlet: OutletRecord) => {
    setSelectedUser(user);
    setSelectedOutletForPerms(outlet);
    
    const { data } = await supabase
      .from("user_outlets")
      .select("permissions")
      .eq("user_id", user.id)
      .eq("outlet_id", outlet.id)
      .maybeSingle();

    setUserPermissions(data?.permissions || {});
    setShowPermissionsModal(true);
  };

  const togglePermission = (key: string) => {
    setUserPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const savePermissions = async () => {
    if (!selectedUser || !selectedOutletForPerms) return;

    setLoading(true);
    const { error } = await supabase
      .from("user_outlets")
      .upsert({
        user_id: selectedUser.id,
        outlet_id: selectedOutletForPerms.id,
        permissions: userPermissions
      }, { onConflict: "user_id,outlet_id" });

    if (error) {
      toast.error("Failed to save permissions");
    } else {
      toast.success("Permissions updated successfully");
      setShowPermissionsModal(false);
    }
    setLoading(false);
  };

  const sections = Array.from(new Set(permissions.map(p => p.section)));

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">Admin & Permissions</h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
              <Shield className="h-4 w-4 text-primary" />
              Manage staff access across all outlets
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              onClick={() => window.location.href = '/admin/employees?add=true'}
              className="h-12 rounded-2xl shadow-lg shadow-primary/20 px-8 font-bold"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Employee
            </Button>
        </div>
      </div>

      <div className="max-w-6xl space-y-12">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-gray-100">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search staff by name or ID..." 
              className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus:ring-primary font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Admin Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold">Administrators</h2>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Full System Access</p>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users
              .filter(u => u.role.toLowerCase().includes("admin"))
              .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.employee_id.includes(searchTerm))
              .map(user => (
                <Card key={user.id} className="rounded-[2.5rem] border-2 border-primary/10 shadow-lg overflow-hidden bg-white hover:border-primary/30 transition-all">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold">{user.name}</CardTitle>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{user.role}</p>
                        </div>
                      </div>
                      <Badge variant={user.is_active ? "secondary" : "destructive"} className="rounded-full px-3 py-1 text-[9px] uppercase font-black tracking-widest">
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 space-y-6">
                    <div className="flex items-center justify-between text-xs p-3 bg-muted/30 rounded-xl">
                      <span className="text-muted-foreground font-bold uppercase tracking-wider">Admin ID</span>
                      <span className="font-mono font-bold text-primary">{user.employee_id}</span>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Permissions Scope</p>
                      <div className="flex flex-wrap gap-2">
                        {outlets.map(outlet => (
                          <button
                            key={outlet.id}
                            onClick={() => openPermissions(user, outlet)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-primary/5 bg-primary/5 hover:bg-primary/10 hover:border-primary/20 transition-all text-xs font-bold w-full justify-between group"
                          >
                            <div className="flex items-center gap-2">
                              <Store className="h-3.5 w-3.5 text-primary" />
                              <span>{outlet.name}</span>
                            </div>
                            <Settings className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        </div>

        {/* Other Staff Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-gray-700">Employees & Staff</h2>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Operational Access</p>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-muted to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users
              .filter(u => !u.role.toLowerCase().includes("admin"))
              .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.employee_id.includes(searchTerm))
              .map(user => (
                <Card key={user.id} className="rounded-[2.5rem] border-2 border-transparent hover:border-primary/10 transition-all shadow-md overflow-hidden bg-white">
                  <CardHeader className="bg-muted/10 pb-4 border-b border-dashed">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-white border flex items-center justify-center font-bold text-muted-foreground text-xl shadow-sm">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold">{user.name}</CardTitle>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{user.role}</p>
                        </div>
                      </div>
                      <Badge variant={user.is_active ? "outline" : "destructive"} className="rounded-full px-3 py-1 text-[9px] uppercase font-black tracking-widest">
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-bold uppercase tracking-wider">Employee ID</span>
                      <span className="font-mono font-bold">{user.employee_id}</span>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Access Control</p>
                      <div className="flex flex-wrap gap-2">
                        {outlets.map(outlet => (
                          <button
                            key={outlet.id}
                            onClick={() => openPermissions(user, outlet)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-primary/5 bg-primary/5 hover:bg-primary/10 hover:border-primary/20 transition-all text-xs font-bold w-full justify-between group"
                          >
                            <div className="flex items-center gap-2">
                              <Store className="h-3.5 w-3.5 text-primary" />
                              <span>{outlet.name}</span>
                            </div>
                            <Shield className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        onClick={() => window.location.href = `/admin/employees?edit=${user.id}`}
                        className="flex-1 rounded-2xl h-12 border-2 font-bold"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Permissions Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[3rem] border-none shadow-2xl">
          <DialogHeader className="p-10 bg-primary text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <Shield className="h-48 w-48 text-white" />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <DialogTitle className="text-4xl font-serif font-bold">Access Matrix</DialogTitle>
                <div className="flex items-center gap-3 mt-3">
                  <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white border border-white/20">
                    {selectedUser?.name}
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/40" />
                  <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white border border-white/20">
                    {selectedOutletForPerms?.name}
                  </div>
                </div>
              </div>
              <div className="h-20 w-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl">
                <Lock className="h-10 w-10 text-white" />
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-gray-50/50">
            <div className="space-y-16">
              {sections.map(section => (
                <div key={section} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-[1.25rem] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                      <Settings className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-foreground">{section}</h3>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-0.5">Control Group</p>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent ml-4" />
                  </div>
                  
                    <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-primary/[0.03] text-[11px] font-black uppercase tracking-[0.25em] text-primary/70 border-b border-primary/10">
                                <th className="p-8 w-24 text-center">Security Status</th>
                                <th className="p-8">Capability / Module Access</th>
                                <th className="p-8">Protocol ID</th>
                                <th className="p-8 text-right w-32">Status Toggle</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-primary/5">
                              {permissions.filter(p => p.section === section).map(perm => (
                                <tr 
                                  key={perm.key}
                                  onClick={() => togglePermission(perm.key)}
                                  className={cn(
                                    "group cursor-pointer transition-all duration-300 hover:bg-primary/[0.02]",
                                    userPermissions[perm.key] ? "bg-primary/[0.01]" : ""
                                  )}
                                >
                                  <td className="p-8 text-center">
                                    <div className={cn(
                                      "h-12 w-12 rounded-[1.25rem] flex items-center justify-center transition-all duration-500 shadow-sm mx-auto border-2",
                                      userPermissions[perm.key] 
                                        ? "bg-primary text-white border-primary scale-110 shadow-xl shadow-primary/30" 
                                        : "bg-muted text-muted-foreground border-transparent group-hover:border-muted-foreground/30"
                                    )}>
                                      {userPermissions[perm.key] ? <Check className="h-6 w-6 stroke-[3.5]" /> : <Lock className="h-5 w-5 opacity-40" />}
                                    </div>
                                  </td>
                                  <td className="p-8">
                                    <p className={cn(
                                      "text-lg font-bold transition-colors duration-300",
                                      userPermissions[perm.key] ? "text-primary" : "text-gray-900"
                                    )}>
                                      {perm.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <div className={cn(
                                        "h-1.5 w-1.5 rounded-full animate-pulse",
                                        userPermissions[perm.key] ? "bg-green-500" : "bg-red-400"
                                      )} />
                                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                        {userPermissions[perm.key] ? "Access Profile: Active" : "Access Profile: Locked"}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="p-8">
                                    <div className="inline-flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl border border-muted-foreground/10">
                                      <Shield className="h-3 w-3 text-muted-foreground/50" />
                                      <code className="text-[11px] font-mono font-black text-muted-foreground uppercase">
                                        {perm.key}
                                      </code>
                                    </div>
                                  </td>
                                  <td className="p-8 text-right">
                                    <div className="flex justify-end">
                                      <div className={cn(
                                        "w-14 h-7 rounded-full transition-all duration-500 relative p-1 cursor-pointer ring-4 ring-transparent group-hover:ring-primary/5",
                                        userPermissions[perm.key] ? "bg-primary shadow-inner shadow-black/20" : "bg-gray-200"
                                      )}>
                                        <div className={cn(
                                          "w-5 h-5 bg-white rounded-full shadow-2xl transition-all duration-500",
                                          userPermissions[perm.key] ? "translate-x-7 scale-110" : "translate-x-0"
                                        )} />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                        </table>
                      </div>
                    </div>

                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="p-10 border-t bg-white">
            <div className="flex w-full gap-6">
              <Button 
                variant="outline" 
                onClick={() => setShowPermissionsModal(false)}
                className="flex-1 h-16 rounded-[1.5rem] font-bold border-2 hover:bg-muted/50 text-gray-500"
              >
                Discard Changes
              </Button>
              <Button 
                onClick={savePermissions}
                className="flex-[2] h-16 rounded-[1.5rem] font-black text-lg uppercase tracking-widest shadow-2xl shadow-primary/30 active:scale-[0.98] transition-transform"
              >
                <Check className="h-6 w-6 mr-3 stroke-[3]" />
                Deploy Profile
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
