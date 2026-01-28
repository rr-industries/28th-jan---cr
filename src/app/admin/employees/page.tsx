"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { 
  Building2, 
  Briefcase,
  Users,
  UserPlus,
  Calendar,
  Wallet,
  Clock,
  FileText,
  BarChart3,
  Phone,
  Mail,
  Edit2,
  Eye,
  EyeOff,
  Search,
  Check,
  X,
  Plus,
  TrendingUp,
  Download,
  Copy,
  LoaderCircle,
  CheckCircle2,
  ArrowRight
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminProvider, useAdmin } from "@/context/AdminContext";

type Employee = {
  id: string;
  employee_id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  joining_date: string;
  employment_type: string;
  base_salary: number;
  salary_type: string;
  overtime_rate: number;
  bonus_eligibility: boolean;
  status: string;
  is_active: boolean;
  password?: string;
  shift_id?: string;
};

export default function AdminEmployees() {
  const { selectedOutlet } = useAdmin();
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profiles");
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    role: "employee",
    employment_type: "Full-time",
    salary_type: "Monthly",
    status: "Active",
    joining_date: format(new Date(), "yyyy-MM-dd")
  });
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [createdEmployee, setCreatedEmployee] = useState<any>(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [newShift, setNewShift] = useState({ name: "", start_time: "09:00", end_time: "18:00" });

    const handleAddShift = async () => {
      if (!newShift.name || !selectedOutlet) return toast.error("Please enter shift name");
      setSaving(true);
      const { error } = await supabase.from("shifts").insert({ ...newShift, outlet_id: selectedOutlet.id });
      if (error) toast.error("Failed to add shift");
      else {
        toast.success("Shift added successfully");
        setShowShiftDialog(false);
        fetchShifts();
      }
      setSaving(false);
    };



  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddDialog(true);
    }
    const editId = searchParams.get('edit');
    if (editId && employees.length > 0) {
      const emp = employees.find(e => e.id === editId);
      if (emp) openEditDialog(emp);
    }
  }, [searchParams, employees.length]);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEmployees(),
      fetchShifts()
    ]);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    if (!selectedOutlet) return;
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("outlet_id", selectedOutlet.id)
      .order("created_at", { ascending: false });

    if (error) toast.error("Failed to load employees");
    else setEmployees(data || []);
  };

  const fetchShifts = async () => {
    if (!selectedOutlet) return;
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("outlet_id", selectedOutlet.id)
      .order("name", { ascending: true });

    if (error) toast.error("Failed to load shifts");
    else setShifts(data || []);
  };

  const generateEmployeeId = (role: string = "employee") => {
    const isSuper = role.toLowerCase().includes("admin");
    const prefix = isSuper ? "ADM" : "EMP";
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${num}`;
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name?.trim()) {
      toast.error("Please enter employee name");
      return;
    }

    // Get current outlet from context
    if (!selectedOutlet) {
      toast.error("No active outlet selected. Please re-login.");
      return;
    }

    setSaving(true);
    try {
      const employeeId = newEmployee.employee_id || generateEmployeeId(newEmployee.role);
      const password = newEmployee.password || generatePassword();

      const { error } = await supabase
        .from("employees")
        .insert({
          ...newEmployee,
          employee_id: employeeId,
          password: password,
          outlet_id: selectedOutlet.id,
          is_active: true
        });

      if (error) throw error;

      setCreatedEmployee({ id: employeeId, password, name: newEmployee.name });
      setShowAddDialog(false);
      setShowSuccessDialog(true);
      resetForm();
      fetchEmployees();
    } catch (error) {
      toast.error("Failed to create employee");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewEmployee({
      employee_id: "",
      password: "",
      name: "",
      role: "employee",
      phone: "",
      email: "",
      joining_date: format(new Date(), "yyyy-MM-dd"),
      employment_type: "Full-time",
      base_salary: 0,
      salary_type: "Monthly",
      overtime_rate: 0,
      bonus_eligibility: true,
      status: "Active"
    });
    setEditingEmployee(null);
  };

  const openEditDialog = (emp: Employee) => {
    setEditingEmployee(emp);
    setNewEmployee(emp);
    setShowAddDialog(true);
  };

  const handleEditEmployee = async () => {
    if (!editingEmployee) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update(newEmployee)
        .eq("id", editingEmployee.id);

      if (error) throw error;
      toast.success("Employee updated successfully");
      setShowAddDialog(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      toast.error("Failed to update employee");
    } finally {
      setSaving(false);
    }
  };

  // --- Attendance Logic ---
  const fetchAttendance = async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select(`*, employees(name, role, employee_id)`)
      .eq("date", attendanceDate);

    if (error) toast.error("Failed to load attendance");
    else setAttendanceData(data || []);
  };

  useEffect(() => {
    if (activeTab === "attendance") fetchAttendance();
  }, [activeTab, attendanceDate]);

  const markAttendance = async (employeeId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("attendance")
        .upsert({
          employee_id: employeeId,
          date: attendanceDate,
          status: status,
          check_in: status === 'Present' ? new Date().toISOString() : null
        }, { onConflict: 'employee_id,date' });

      if (error) throw error;
      toast.success(`Marked as ${status}`);
      fetchAttendance();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <Users className="h-7 w-7 text-primary" />
            </div>
            Staff Management
          </h1>
          <p className="text-muted-foreground mt-1">Attendance, Payroll, and Performance controls</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20">
          <UserPlus className="mr-2 h-5 w-5" />
          Add New Staff
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-white p-2 rounded-[2.5rem] border shadow-sm mb-8 overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent h-auto p-0 flex flex-nowrap min-w-max">
            {[
              { id: "profiles", icon: Users, label: "Staff Profiles" },
              { id: "attendance", icon: Calendar, label: "Attendance" },
              { id: "payroll", icon: Wallet, label: "Payroll" },
              { id: "shifts", icon: Clock, label: "Shifts" },
              { id: "leaves", icon: FileText, label: "Leaves" },
              { id: "performance", icon: BarChart3, label: "Performance" }
            ].map((tab) => (
              <TabsTrigger 
                key={tab.id}
                value={tab.id} 
                className="rounded-2xl px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white transition-all flex items-center gap-2"
              >
                <tab.icon className="h-4 w-4" />
                <span className="font-bold whitespace-nowrap">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="profiles" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {employees.map((emp) => (
              <Card key={emp.id} className={cn("rounded-[2rem] overflow-hidden border-2 transition-all hover:shadow-xl", !emp.is_active && "opacity-60 grayscale")}>
                <CardHeader className="pb-4 relative">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold border-2 border-primary/5">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-serif">{emp.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                          {emp.role}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          emp.status === 'Active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {emp.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ID</span>
                      <span className="font-mono text-sm font-bold">{emp.employee_id}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Joined</span>
                      <span className="text-sm">{emp.joining_date || "N/A"}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-sm">{emp.phone || "No phone"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="text-sm truncate">{emp.email || "No email"}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl font-bold"
                      onClick={() => openEditDialog(emp)}
                    >
                      <Edit2 className="h-3 w-3 mr-2" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      className="rounded-xl px-3"
                      onClick={() => setShowPasswords(prev => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                    >
                      {showPasswords[emp.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <Card className="rounded-[2.5rem] overflow-hidden border-2">
            <CardHeader className="flex flex-row items-center justify-between bg-muted/30">
              <div>
                <CardTitle className="text-2xl font-serif">Daily Attendance</CardTitle>
                <CardDescription>Mark and track staff presence</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <Input 
                  type="date" 
                  value={attendanceDate} 
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="rounded-xl h-11 bg-white"
                />
                <Button variant="outline" className="rounded-xl" onClick={fetchAttendance}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/10 border-b">
                    <tr>
                      <th className="text-left p-6 font-bold text-sm uppercase">Staff Name</th>
                      <th className="text-left p-6 font-bold text-sm uppercase">Role</th>
                      <th className="text-left p-6 font-bold text-sm uppercase">Status</th>
                      <th className="text-right p-6 font-bold text-sm uppercase">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {employees.map((emp) => {
                      const att = attendanceData.find(a => a.employee_id === emp.id);
                      return (
                        <tr key={emp.id} className="hover:bg-muted/5 transition-colors">
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-primary">
                                {emp.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold">{emp.name}</span>
                                <span className="text-xs text-muted-foreground">{emp.employee_id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-6 uppercase text-[10px] font-bold tracking-widest">{emp.role}</td>
                          <td className="p-6">
                            {att ? (
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold",
                                att.status === 'Present' ? "bg-green-100 text-green-700" :
                                att.status === 'Absent' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                              )}>
                                {att.status}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Not marked</span>
                            )}
                          </td>
                          <td className="p-6">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant={att?.status === 'Present' ? "default" : "outline"}
                                className="rounded-lg h-9"
                                onClick={() => markAttendance(emp.id, 'Present')}
                              >
                                <Check className="h-4 w-4 mr-1" /> Present
                              </Button>
                              <Button 
                                size="sm" 
                                variant={att?.status === 'Absent' ? "destructive" : "outline"}
                                className="rounded-lg h-9"
                                onClick={() => markAttendance(emp.id, 'Absent')}
                              >
                                <X className="h-4 w-4 mr-1" /> Absent
                              </Button>
                              <Button 
                                size="sm" 
                                variant={att?.status === 'Half Day' ? "secondary" : "outline"}
                                className="rounded-lg h-9"
                                onClick={() => markAttendance(emp.id, 'Half Day')}
                              >
                                <Clock className="h-4 w-4 mr-1" /> Half
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {employees.map((emp) => (
              <Card key={emp.id} className="rounded-[2.5rem] border-2 shadow-sm overflow-hidden group">
                <div className="h-2 bg-primary group-hover:h-3 transition-all" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-serif">{emp.name}</CardTitle>
                    <Wallet className="h-5 w-5 text-primary/40" />
                  </div>
                  <CardDescription>Payroll Configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-muted/50">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Base Salary</span>
                      <span className="text-xl font-serif font-bold text-primary">₹{emp.base_salary?.toLocaleString()}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/50">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Type</span>
                      <span className="font-bold text-sm uppercase">{emp.salary_type}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">OT Rate (per hour)</span>
                      <span className="font-bold">₹{emp.overtime_rate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Employment</span>
                      <span className="font-bold">{emp.employment_type}</span>
                    </div>
                  </div>
                  <Button className="w-full rounded-2xl h-12 font-bold group-hover:scale-[1.02] transition-transform">
                    Generate Payslip
                    <Download className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            {shifts.map((shift) => (
              <Card key={shift.id} className="rounded-[2rem] border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold uppercase text-primary tracking-widest bg-primary/5 px-3 py-1 rounded-full">Active</span>
                  </div>
                  <CardTitle className="text-2xl font-serif mt-4">{shift.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex-1 p-3 rounded-xl bg-muted/50 border">
                      <span className="text-[10px] font-bold uppercase block mb-1">Start</span>
                      <span className="text-foreground font-bold">{shift.start_time}</span>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                    <div className="flex-1 p-3 rounded-xl bg-muted/50 border">
                      <span className="text-[10px] font-bold uppercase block mb-1">End</span>
                      <span className="text-foreground font-bold">{shift.end_time}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full rounded-xl">Edit Timing</Button>
                </CardContent>
              </Card>
            ))}
            <Card 
              className="rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center p-8 bg-transparent hover:bg-primary/5 transition-all cursor-pointer"
              onClick={() => setShowShiftDialog(true)}
            >
              <Plus className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="font-bold text-muted-foreground">Add New Shift</p>
            </Card>
          </div>

          <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
            <DialogContent className="rounded-[2.5rem] max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif">Add New Shift</DialogTitle>
                <DialogDescription>Define working hours for your staff</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Shift Name</Label>
                  <Input 
                    placeholder="e.g. Morning Shift" 
                    value={newShift.name}
                    onChange={e => setNewShift(p => ({ ...p, name: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input 
                      type="time" 
                      value={newShift.start_time}
                      onChange={e => setNewShift(p => ({ ...p, start_time: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input 
                      type="time" 
                      value={newShift.end_time}
                      onChange={e => setNewShift(p => ({ ...p, end_time: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowShiftDialog(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleAddShift} disabled={saving} className="rounded-xl px-8">Save Shift</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
            <CardHeader className="bg-primary text-white p-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-serif">Staff Performance Matrix</CardTitle>
                  <CardDescription className="text-white/70">Metrics driven efficiency tracking</CardDescription>
                </div>
                <TrendingUp className="h-12 w-12 opacity-20" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-6 font-bold text-sm uppercase">Employee</th>
                      <th className="text-left p-6 font-bold text-sm uppercase">Avg Order Time</th>
                      <th className="text-left p-6 font-bold text-sm uppercase">Punctuality</th>
                      <th className="text-left p-6 font-bold text-sm uppercase">Rating</th>
                      <th className="text-right p-6 font-bold text-sm uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/5">
                        <td className="p-6 font-bold">{emp.name}</td>
                        <td className="p-6">12.5 mins</td>
                        <td className="p-6">98%</td>
                        <td className="p-6">
                          <div className="flex text-yellow-500">
                            <CheckCircle2 className="h-4 w-4 fill-current" />
                            <CheckCircle2 className="h-4 w-4 fill-current" />
                            <CheckCircle2 className="h-4 w-4 fill-current" />
                            <CheckCircle2 className="h-4 w-4 fill-current" />
                            <CheckCircle2 className="h-4 w-4 text-muted" />
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">Exceeding</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Profile Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[2rem] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">
              {editingEmployee ? "Edit Staff Profile" : "Register New Staff Member"}
            </DialogTitle>
            <DialogDescription>
              Complete the information below to {editingEmployee ? "update" : "onboard"} staff.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-primary">Personal Details</h3>
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input 
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee(p => ({ ...p, name: e.target.value }))}
                  className="rounded-xl border-2"
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee(p => ({ ...p, phone: e.target.value }))}
                    className="rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee(p => ({ ...p, email: e.target.value }))}
                    className="rounded-xl border-2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newEmployee.role} onValueChange={(v) => setNewEmployee(p => ({ ...p, role: v }))}>
                  <SelectTrigger className="rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="waiter">Waiter</SelectItem>
                      <SelectItem value="chef">Chef</SelectItem>
                      <SelectItem value="cleaner">Cleaning Staff</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-primary">Employment & Salary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Joining Date</Label>
                  <Input 
                    type="date"
                    value={newEmployee.joining_date}
                    onChange={(e) => setNewEmployee(p => ({ ...p, joining_date: e.target.value }))}
                    className="rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newEmployee.employment_type} onValueChange={(v) => setNewEmployee(p => ({ ...p, employment_type: v }))}>
                    <SelectTrigger className="rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Salary</Label>
                  <Input 
                    type="number"
                    value={newEmployee.base_salary}
                    onChange={(e) => setNewEmployee(p => ({ ...p, base_salary: Number(e.target.value) }))}
                    className="rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>OT Rate (Hr)</Label>
                  <Input 
                    type="number"
                    value={newEmployee.overtime_rate}
                    onChange={(e) => setNewEmployee(p => ({ ...p, overtime_rate: Number(e.target.value) }))}
                    className="rounded-xl border-2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assigned Shift</Label>
                <Select value={newEmployee.shift_id} onValueChange={(v) => setNewEmployee(p => ({ ...p, shift_id: v }))}>
                  <SelectTrigger className="rounded-xl border-2">
                    <SelectValue placeholder="Select Shift" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button className="rounded-xl px-8 font-bold" onClick={editingEmployee ? handleEditEmployee : handleAddEmployee} disabled={saving}>
              {saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {editingEmployee ? "Update Profile" : "Register Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="rounded-[2.5rem]">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-serif text-center">Onboarding Successful!</DialogTitle>
            <DialogDescription className="text-center">
              Login credentials for {createdEmployee?.name} have been generated.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 bg-muted/30 rounded-[2rem] space-y-4 my-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-muted-foreground uppercase">Employee ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">{createdEmployee?.id}</span>
                <Button variant="ghost" size="sm" onClick={() => createdEmployee && navigator.clipboard.writeText(createdEmployee.id)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-muted-foreground uppercase">Password</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">{createdEmployee?.password}</span>
                <Button variant="ghost" size="sm" onClick={() => createdEmployee && navigator.clipboard.writeText(createdEmployee.password)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Button className="w-full rounded-2xl h-12 font-bold" onClick={() => setShowSuccessDialog(false)}>Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
