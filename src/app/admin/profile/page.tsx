"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  LoaderCircle,
  Check,
  Edit2,
  Phone,
  Save,
  X,
  BadgeCheck,
  Hash,
  Building2,
  Briefcase,
  Clock,
  Wallet,
  LayoutDashboard,
  History,
  ClipboardList,
  ReceiptText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/context/AdminContext";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { user, selectedOutlet, refreshPermissions } = useAdmin();
  const [loadingHistory, setLoadingHistory] = useState(false);

  // History States
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<any[]>([]);

  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || "",
        phone: user.phone || ""
      });
      fetchStaffHistory();
    }
  }, [user]);

  const fetchStaffHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      // Parallel fetch for 360 view
      const [att, lvs, pay] = await Promise.all([
        supabase.from("attendance").select("*").eq("employee_id", user.id).order("date", { ascending: false }).limit(10),
        supabase.from("leaves").select("*").eq("employee_id", user.id).order("start_date", { ascending: false }).limit(5),
        supabase.from("payroll").select("*").eq("employee_id", user.id).order("month", { ascending: false }).limit(6)
      ]);

      setAttendanceHistory(att.data || []);
      setLeaveHistory(lvs.data || []);
      setPayrollHistory(pay.data || []);
    } catch (e) {
      console.error("Error fetching history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          name: editForm.name,
          phone: editForm.phone,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;

      // Update Auth metadata
      await supabase.auth.updateUser({
        data: { name: editForm.name }
      });

      await refreshPermissions();
      setEditMode(false);
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Approved: "bg-green-100 text-green-700 border-green-200",
      Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      Rejected: "bg-red-100 text-red-700 border-red-200",
      Present: "bg-green-100 text-green-700",
      Absent: "bg-red-100 text-red-700",
      Leave: "bg-blue-100 text-blue-700",
      "Half Day": "bg-orange-100 text-orange-700"
    };
    return (
      <Badge className={cn("rounded-full px-3 py-0.5 border font-bold text-[10px] uppercase tracking-tighter", styles[status] || "bg-gray-100")}>
        {status}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium text-lg">Initializing your secure workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Staff Command Center</h1>
          <p className="text-muted-foreground text-sm font-medium">360° Unified View of your Attendance, Leaves, and Payroll</p>
        </div>
        {!editMode ? (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="rounded-2xl h-11 px-6 font-bold border-2">
            <Edit2 className="h-4 w-4 mr-2" />
            Modify Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode(false)} className="rounded-2xl h-11 px-6 font-bold">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="rounded-2xl h-11 px-6 font-bold shadow-lg shadow-primary/20">
              {saving ? <LoaderCircle className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Apply Changes
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white/50 backdrop-blur-md border-2 p-1.5 rounded-[2rem] h-16 w-full max-w-2xl shadow-sm">
          <TabsTrigger value="overview" className="rounded-3xl h-12 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">
            <LayoutDashboard className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-3xl h-12 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">
            <History className="h-4 w-4" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-3xl h-12 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">
            <ClipboardList className="h-4 w-4" /> Leaves
          </TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-3xl h-12 font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">
            <ReceiptText className="h-4 w-4" /> Payroll
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6 focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-primary/90 to-primary flex items-center px-10">
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/50 flex items-center justify-center font-bold text-white text-4xl shadow-2xl">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="text-white">
                    {editMode ? (
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="text-2xl font-bold h-10 w-64 bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                      />
                    ) : (
                      <h1 className="text-3xl font-bold">{user.name}</h1>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full font-bold px-3">
                        {user.role}
                      </Badge>
                      <span className="text-white/70 text-sm font-bold opacity-80 uppercase tracking-widest">{user.employee_id}</span>
                    </div>
                  </div>
                </div>
              </div>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                      <Mail className="h-3.5 w-3.5 text-primary" /> Email Identity
                    </label>
                    <div className="font-bold text-lg bg-muted/30 px-5 py-4 rounded-2xl border-2">
                      {user.email}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                      <Building2 className="h-3.5 w-3.5 text-primary" /> Active Outlet
                    </label>
                    <div className="font-bold text-lg bg-primary/5 text-primary px-5 py-4 rounded-2xl border-2 border-primary/20">
                      {selectedOutlet?.name || "Corporate / Global"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                      <Briefcase className="h-3.5 w-3.5 text-primary" /> Contract Type
                    </label>
                    <div className="font-bold text-lg bg-muted/30 px-5 py-4 rounded-2xl border-2">
                      {user.employment_type || "Permanent"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Since
                    </label>
                    <div className="font-bold text-lg bg-muted/30 px-5 py-4 rounded-2xl border-2">
                      {user.joining_date ? format(new Date(user.joining_date), "MMMM dd, yyyy") : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-12 border-t-2 border-dashed">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-primary/10 p-2.5 rounded-2xl">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-xl">Identity & Security</h3>
                  </div>
                  <div className="max-w-md space-y-4">
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">New Secure Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                          className="h-12 rounded-2xl border-2 focus:ring-4 transition-all pr-12 font-mono"
                          placeholder="••••••••"
                        />
                        <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Confirm Identity</Label>
                      <Input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        className="h-12 rounded-2xl border-2 focus:ring-4 transition-all font-mono"
                        placeholder="••••••••"
                      />
                    </div>
                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword || !passwordForm.newPassword}
                      className="w-full rounded-2xl h-12 font-bold shadow-lg shadow-primary/20"
                    >
                      {changingPassword ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                      Rotate Password Credentials
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-[2.5rem] border-2 shadow-xl p-8 bg-gradient-to-br from-white to-primary/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-2.5 rounded-2xl">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg">Compensation</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Base Rate ({user.salary_type})</p>
                    <p className="text-3xl font-bold text-primary">₹{user.base_salary?.toLocaleString() || "0"}</p>
                  </div>
                  <div className="h-px bg-muted-foreground/10" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">OT Multiplier (Hourly)</p>
                    <p className="text-xl font-bold text-foreground">₹{user.overtime_rate?.toLocaleString() || "0"}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[2.5rem] border-2 shadow-xl p-8 bg-gradient-to-br from-white to-green-50/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-green-100 p-2.5 rounded-2xl text-green-700">
                    <History className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-lg">Leave Entitlement</h3>
                </div>
                <div className="text-center py-4">
                  <p className="text-[4rem] font-black text-green-700 leading-none">{user.leave_balance || 0}</p>
                  <p className="text-xs font-black uppercase tracking-widest text-green-700/60 mt-2">Days Available</p>
                </div>
                <Button variant="ghost" className="w-full rounded-2xl border-2 border-green-200 text-green-700 font-bold h-11 bg-white hover:bg-green-50 mt-4">
                  Request Time Off
                </Button>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="focus-visible:ring-0 mt-6">
          <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
            <CardHeader className="p-8 border-b bg-muted/10">
              <CardTitle className="flex items-center gap-3 font-bold text-xl">
                <History className="h-5 w-5 text-primary" /> Recent Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="p-20 flex justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>
              ) : attendanceHistory.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground font-bold italic">No attendance records found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="p-5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Date</th>
                        <th className="p-5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Status</th>
                        <th className="p-5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Time Logs</th>
                        <th className="p-5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">OT Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {attendanceHistory.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/5">
                          <td className="p-5 font-bold text-sm">{format(new Date(log.date), "EEE, MMM dd, yyyy")}</td>
                          <td className="p-5">{getStatusBadge(log.status)}</td>
                          <td className="p-5 font-medium text-xs text-muted-foreground">
                            {log.check_in || "--:--"} - {log.check_out || "--:--"}
                          </td>
                          <td className="p-5 font-bold text-sm text-primary">{log.overtime_hours || 0}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="focus-visible:ring-0 mt-6">
          <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
            <CardHeader className="p-8 border-b bg-muted/10">
              <CardTitle className="flex items-center gap-3 font-bold text-xl">
                <ClipboardList className="h-5 w-5 text-primary" /> Leave History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="p-20 flex justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>
              ) : leaveHistory.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground font-bold italic">No leave history found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="p-5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Period</th>
                        <th className="p-5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Type</th>
                        <th className="p-5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Reason</th>
                        <th className="p-5 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {leaveHistory.map((leave) => (
                        <tr key={leave.id} className="hover:bg-muted/5">
                          <td className="p-5 font-bold text-sm tracking-tight">
                            {format(new Date(leave.start_date), "MMM dd")} - {format(new Date(leave.end_date), "MMM dd, yyyy")}
                          </td>
                          <td className="p-5 font-bold">
                            <Badge variant="outline" className="rounded-lg">{leave.type}</Badge>
                          </td>
                          <td className="p-5 text-sm text-muted-foreground italic truncate max-w-[200px]">{leave.reason}</td>
                          <td className="p-5 text-center">{getStatusBadge(leave.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="focus-visible:ring-0 mt-6">
          <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
            <CardHeader className="p-8 border-b bg-muted/10">
              <CardTitle className="flex items-center gap-3 font-bold text-xl">
                <ReceiptText className="h-5 w-5 text-primary" /> Recent Payroll Slips
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="p-20 flex justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>
              ) : payrollHistory.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground font-bold italic">No payroll records generated yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="p-5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Month</th>
                        <th className="p-5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Net Pay</th>
                        <th className="p-5 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Days</th>
                        <th className="p-5 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">Payment</th>
                        <th className="p-5 text-right text-xs font-black uppercase tracking-widest text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payrollHistory.map((pay) => (
                        <tr key={pay.id} className="hover:bg-muted/5">
                          <td className="p-5 font-bold text-sm uppercase tracking-tight">{format(new Date(pay.month), "MMMM yyyy")}</td>
                          <td className="p-5 font-black text-primary text-base">₹{pay.net_pay?.toLocaleString()}</td>
                          <td className="p-5 text-xs font-medium text-muted-foreground">
                            {pay.present_days}P / {pay.leave_days}L / {pay.total_working_days}W
                          </td>
                          <td className="p-5 text-center">
                            <Badge className={cn(
                              "rounded-full px-3 py-1 font-black text-[9px] uppercase tracking-widest",
                              pay.payment_status === 'Paid' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            )}>
                              {pay.payment_status}
                            </Badge>
                          </td>
                          <td className="p-5 text-right">
                            <Button size="sm" variant="outline" className="h-8 rounded-lg font-bold text-xs uppercase px-4 border-2">
                              Download Slip
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
