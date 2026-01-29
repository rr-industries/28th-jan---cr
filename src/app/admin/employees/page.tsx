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
  ArrowRight,
  Lock
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

// Logic for calculating Late/Early (Helper)
const calculateTimeDifference = (actualTime: Date, scheduledTimeStr: string) => {
  const [hours, minutes] = scheduledTimeStr.split(':').map(Number);
  const scheduled = new Date(actualTime);
  scheduled.setHours(hours, minutes, 0, 0);

  return Math.round((actualTime.getTime() - scheduled.getTime()) / 60000); // Diff in minutes
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
    joining_date: format(new Date(), "yyyy-MM-dd"),
    phone: "",
    email: ""
  });
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [createdEmployee, setCreatedEmployee] = useState<any>(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [newShift, setNewShift] = useState({ name: "", start_time: "09:00", end_time: "18:00" });
  const [isLocked, setIsLocked] = useState(false);

  // Export Monthly State
  const [exportMonth, setExportMonth] = useState(format(new Date(), "yyyy-MM"));
  const [showExportDialog, setShowExportDialog] = useState(false);

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
    if (!selectedOutlet) return;

    // Fetch Lock Status
    const { data: lockData } = await supabase
      .from("attendance_days")
      .select("is_locked")
      .eq("date", attendanceDate)
      .eq("outlet_id", selectedOutlet.id)
      .single();

    setIsLocked(lockData?.is_locked || false);

    // Fetch Attendance
    const { data, error } = await supabase
      .from("attendance")
      .select(`*, employees(name, role, employee_id, shift_id)`)
      .eq("date", attendanceDate)
      .eq("outlet_id", selectedOutlet.id);

    if (error) toast.error("Failed to load attendance");
    else setAttendanceData(data || []);
  };

  useEffect(() => {
    if (activeTab === "attendance" && selectedOutlet) fetchAttendance();
  }, [activeTab, attendanceDate, selectedOutlet]);

  const handleLockDay = async () => {
    if (!selectedOutlet) return;
    try {
      const { error } = await supabase
        .from("attendance_days")
        .upsert({
          date: attendanceDate,
          outlet_id: selectedOutlet.id,
          is_locked: true,
          locked_at: new Date().toISOString()
        }, { onConflict: 'date,outlet_id' });

      if (error) throw error;
      toast.success("Attendance locked for this date");
      fetchAttendance();
    } catch (err) {
      toast.error("Failed to lock attendance");
    }
  };

  const handleExportMonthlyAttendance = async () => {
    if (!selectedOutlet) return;

    // Parse selected month
    const [year, month] = exportMonth.split("-").map(Number);
    const startOfMonth = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
    const endOfMonth = format(new Date(year, month, 0), "yyyy-MM-dd");

    const toastId = toast.loading("Generating monthly report...");

    try {
      const { data: attendance_records } = await supabase
        .from("attendance")
        .select(`
          *,
          employees(employee_id, name, role, shift_id)
        `)
        .eq("outlet_id", selectedOutlet.id)
        .gte("date", startOfMonth)
        .lte("date", endOfMonth)
        .order("date", { ascending: true });

      const { data: shiftList } = await supabase.from("shifts").select("*");
      const shiftMap = new Map(shiftList?.map(s => [s.id, s]) || []);

      const headers = [
        "Date",
        "Employee ID",
        "Employee Name",
        "Role",
        "Shift Name",
        "Status",
        "Check In",
        "Check Out",
        "Work Hours",
        "Overtime Hours",
        "Late Minutes",
        "Early Leave Minutes"
      ];

      const rows = (attendance_records || []).map((a: any) => {
        const shift = shiftMap.get(a.employees?.shift_id);
        return [
          a.date,
          a.employees?.employee_id || "",
          a.employees?.name || "",
          a.employees?.role || "",
          shift?.name || "",
          a.status,
          a.check_in ? format(new Date(a.check_in), "HH:mm") : "",
          a.check_out ? format(new Date(a.check_out), "HH:mm") : "",
          a.work_hours || 0,
          a.overtime_hours || 0,
          a.late_minutes || 0,
          a.early_leave_minutes || 0
        ];
      });

      const csvContent =
        [headers, ...rows]
          .map(e => e.map(v => `"${v}"`).join(","))
          .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance_report_${exportMonth}.csv`;
      link.click();

      toast.dismiss(toastId);
      toast.success(`Exported report for ${exportMonth}`);
      setShowExportDialog(false);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Failed to export report");
    }
    const handleExportAttendance = async () => {
      if (!selectedOutlet) return;

      const { data: attendance } = await supabase
        .from("attendance")
        .select(`
        *,
        employees(employee_id, name, role, shift_id)
      `)
        .eq("date", attendanceDate)
        .eq("outlet_id", selectedOutlet.id);

      const { data: shiftList } = await supabase.from("shifts").select("*");
      const shiftMap = new Map(shiftList?.map(s => [s.id, s]) || []);

      const headers = [
        "Date",
        "Employee ID",
        "Employee Name",
        "Role",
        "Shift Name",
        "Shift Start",
        "Shift End",
        "Status",
        "Check In",
        "Check Out",
        "Work Hours",
        "Overtime Hours",
        "Late Minutes",
        "Early Leave Minutes",
        "Attendance Locked"
      ];

      const rows = (attendance || []).map((a: any) => {
        const shift = shiftMap.get(a.employees?.shift_id);
        return [
          attendanceDate,
          a.employees?.employee_id || "",
          a.employees?.name || "",
          a.employees?.role || "",
          shift?.name || "",
          shift?.start_time || "",
          shift?.end_time || "",
          a.status,
          a.check_in ? format(new Date(a.check_in), "HH:mm") : "",
          a.check_out ? format(new Date(a.check_out), "HH:mm") : "",
          a.work_hours || 0,
          a.overtime_hours || 0,
          a.late_minutes || 0,
          a.early_leave_minutes || 0,
          isLocked ? "YES" : "NO"
        ];
      });

      const csvContent =
        [headers, ...rows]
          .map(e => e.map(v => `"${v}"`).join(","))
          .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance_${attendanceDate}.csv`;
      link.click();
    };

    const markAttendance = async (employeeId: string, status: string) => {
      if (isLocked) {
        toast.error("Attendance is locked for this date");
        return;
      }

      try {
        const emp = employees.find(e => e.id === employeeId);
        const shift = shifts.find(s => s.id === emp?.shift_id);

        let lateMinutes = 0;
        const now = new Date();

        if (status === 'Present' && shift) {
          lateMinutes = Math.max(0, calculateTimeDifference(now, shift.start_time));
        }

        const { error } = await supabase
          .from("attendance")
          .upsert({
            employee_id: employeeId,
            date: attendanceDate,
            status: status,
            check_in: status === 'Present' ? now.toISOString() : null,
            late_minutes: lateMinutes,
            outlet_id: selectedOutlet?.id
          }, { onConflict: 'employee_id,date' });

        if (error) throw error;
        toast.success(`Marked as ${status}${lateMinutes > 0 ? ` (Late: ${lateMinutes}m)` : ''}`);
        fetchAttendance();
      } catch (err) {
        toast.error("Action failed");
      }
    };

    const calculateSalary = (employee: Employee, attendanceStats: any) => {
      const workingDays = attendanceStats.workingDays || 30;
      const perDay = employee.base_salary / workingDays;

      const daysPayable = attendanceStats.present + attendanceStats.paid_leaves + (attendanceStats.half * 0.5);
      const gross = (daysPayable * perDay) + (attendanceStats.overtime * (employee.overtime_rate || 0));

      const deductions = (attendanceStats.absent * perDay);
      const net = Math.max(0, Math.round(gross));

      return {
        base: employee.base_salary,
        gross: Math.round(gross),
        deductions: Math.round(deductions),
        net: net,
        overtime: Math.round(attendanceStats.overtime * (employee.overtime_rate || 0))
      };
    };

    const handleGeneratePayslip = async (employee: Employee) => {
      if (!selectedOutlet) return;

      // 1. Calculate Date Range (Current Month)
      const now = new Date();
      const startOfMonth = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
      const endOfMonth = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd");
      const numDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      try {
        // 2. Fetch Attendance for this range
        const { data: attendance_records, error } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", employee.id)
          .gte("date", startOfMonth)
          .lte("date", endOfMonth)
          .eq("outlet_id", selectedOutlet.id);

        if (error) throw error;

        // 3. Aggregate Stats
        let present = 0;
        let half = 0;
        let absent = 0;
        let paid_leaves = 0;
        let unpaid_leaves = 0;
        let overtime_hours = 0;

        attendance_records?.forEach((record: any) => {
          if (record.status === 'Present') {
            present++;
            if (record.overtime_hours) overtime_hours += (record.overtime_hours || 0);
          } else if (record.status === 'Half Day') {
            half++;
          } else if (record.status === 'Absent') {
            absent++;
          } else if (record.status === 'Head Leave') {
            paid_leaves++;
          }
        });

        const stats = {
          workingDays: numDaysInMonth,
          present,
          half,
          absent,
          paid_leaves,
          unpaid_leaves,
          overtime: overtime_hours
        };

        const salary = calculateSalary(employee, stats);

        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text("CAFE REPUBLIC", 105, 15, { align: "center" });
        doc.setFontSize(10);
        doc.text("Payslip for " + format(now, "MMMM yyyy"), 105, 22, { align: "center" });

        doc.text(`Employee Name: ${employee.name}`, 14, 35);
        doc.text(`Employee ID: ${employee.employee_id}`, 14, 40);
        doc.text(`Designation: ${employee.role}`, 14, 45);
        doc.text(`Generated On: ${format(now, "dd/MM/yyyy")}`, 14, 50);

        autoTable(doc, {
          startY: 55,
          head: [["Description", "Details", "Amount (INR)"]],
          body: [
            ["Basic Salary", `Base for ${stats.workingDays} days`, salary.base.toLocaleString()],
            ["Attendance", `Present: ${stats.present}, Half: ${stats.half}`, "-"],
            ["Leaves", `Paid: ${stats.paid_leaves}`, "-"],
            ["Overtime", `${stats.overtime} Hours`, salary.overtime.toLocaleString()],
            ["Deductions", `Absent: ${stats.absent}`, `-${salary.deductions.toLocaleString()}`],
            [{ content: "NET PAYABLE", colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: salary.net.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
          ],
          theme: 'grid',
          headStyles: { fillColor: [0, 0, 0] }
        });

        doc.text("Authorized Signature", 14, (doc as any).lastAutoTable.finalY + 30);

        doc.save(`${employee.name}_Payslip_${format(now, "MMM_yyyy")}.pdf`);

        await supabase.from("salary_slips").insert({
          employee_id: employee.id,
          month: format(now, "MMMM"),
          year: now.getFullYear(),
          gross_salary: salary.gross,
          net_salary: salary.net,
          deductions: salary.deductions,
          working_days: stats.workingDays,
          present_days: stats.present + (stats.half * 0.5) + stats.paid_leaves,
          outlet_id: selectedOutlet.id
        });
        toast.success("Payslip generated with tracked data");

      } catch (err) {
        toast.error("Failed to generate payslip");
        console.error(err);
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

                    <div className="pt-2">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Password</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">
                            {showPasswords[emp.id] ? (emp.password || "No Password") : "••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-transparent"
                            onClick={() => setShowPasswords(prev => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                          >
                            {showPasswords[emp.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </div>
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
                  <CardTitle className="text-2xl font-serif flex items-center gap-3">
                    Daily Attendance
                    {isLocked && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">
                        LOCKED
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>Mark and track staff presence</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="rounded-xl h-11 bg-white w-40"
                  />

                  <Button
                    variant="outline"
                    className="rounded-xl h-11 px-3"
                    onClick={() => setShowExportDialog(true)}
                    title="Export Monthly Report"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Monthly
                  </Button>

                  <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                    <DialogContent className="rounded-[2rem]">
                      <DialogHeader>
                        <DialogTitle className="font-serif">Export Monthly Attendance</DialogTitle>
                        <DialogDescription>Select the month you want to download the report for.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label>Select Month</Label>
                        <Input
                          type="month"
                          value={exportMonth}
                          onChange={(e) => setExportMonth(e.target.value)}
                          className="rounded-xl mt-2"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowExportDialog(false)} className="rounded-xl">Cancel</Button>
                        <Button onClick={handleExportMonthlyAttendance} className="rounded-xl">Download CSV</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    className="rounded-xl h-11"
                    onClick={handleExportAttendance}
                    title="Export Daily Report"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Daily
                  </Button>

                  <Button
                    variant="destructive"
                    className="rounded-xl h-11"
                    onClick={handleLockDay}
                    disabled={isLocked}
                  >
                    {isLocked ? <Check className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                    {isLocked ? "Locked" : "Lock Day"}
                  </Button>

                  <Button variant="outline" className="rounded-xl h-11 w-11 p-0" onClick={fetchAttendance}>
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
                                {isLocked ? (
                                  <span className="text-xs font-bold text-muted-foreground py-2 px-4 bg-muted/20 rounded-lg">
                                    View Only
                                  </span>
                                ) : (
                                  <>
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
                                  </>
                                )}
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
                    <Button
                      className="w-full rounded-2xl h-12 font-bold group-hover:scale-[1.02] transition-transform"
                      onClick={() => handleGeneratePayslip(emp)}
                    >
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

          <TabsContent value="leaves" className="space-y-6">
            <Card className="rounded-[2.5rem] border-2 border-dashed bg-muted/10 p-12 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-serif mb-2">Leave Management Moved</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Leave requests and approvals are now handled in a dedicated section for better organization.
              </p>
              <Button
                className="rounded-2xl h-12 px-8 text-lg font-bold shadow-xl shadow-primary/20"
                onClick={() => window.location.href = '/admin/leaves'}
              >
                Go to Leave Management
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Card>
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
                      value={newEmployee.phone || ""}
                      onChange={(e) => setNewEmployee(p => ({ ...p, phone: e.target.value }))}
                      className="rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={newEmployee.email || ""}
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
                    <Label>Overtime Rate (hr)</Label>
                    <Input
                      type="number"
                      value={newEmployee.overtime_rate}
                      onChange={(e) => setNewEmployee(p => ({ ...p, overtime_rate: Number(e.target.value) }))}
                      className="rounded-xl border-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl h-12">Cancel</Button>
              <Button onClick={editingEmployee ? handleEditEmployee : handleAddEmployee} disabled={saving} className="rounded-xl h-12 px-8">
                {saving ? <LoaderCircle className="animate-spin" /> : (editingEmployee ? "Update Profile" : "Register Staff")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="rounded-[2.5rem] max-w-sm text-center p-8">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-serif">Staff Registered!</DialogTitle>
            <DialogDescription>
              Account created successfully.
            </DialogDescription>
            {createdEmployee && (
              <div className="bg-muted p-4 rounded-xl mt-6 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs font-bold uppercase text-muted-foreground">ID</span>
                  <span className="font-mono font-bold flex items-center gap-2">
                    {createdEmployee.id}
                    <Copy className="h-3 w-3 cursor-pointer" onClick={() => navigator.clipboard.writeText(createdEmployee.id)} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Password</span>
                  <span className="font-mono font-bold flex items-center gap-2">
                    {createdEmployee.password}
                    <Copy className="h-3 w-3 cursor-pointer" onClick={() => navigator.clipboard.writeText(createdEmployee.password)} />
                  </span>
                </div>
              </div>
            )}
            <Button onClick={() => setShowSuccessDialog(false)} className="w-full mt-6 rounded-xl h-12">Done</Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
