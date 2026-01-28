"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Clock, 
  Calendar, 
  User, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Wallet,
  LoaderCircle,
  FileText,
  Bell,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function StaffDashboard() {
  const router = useRouter();
  const [employee, setEmployee] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    checkAuth();
    return () => clearInterval(timer);
  }, []);

  const checkAuth = async () => {
    const savedEmp = localStorage.getItem("employeeData");
    if (!savedEmp) {
      router.push("/admin/login");
      return;
    }
    
    const empData = JSON.parse(savedEmp);
    setEmployee(empData);
    fetchTodayAttendance(empData.id);
  };

  const fetchTodayAttendance = async (empId: string) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", empId)
      .eq("date", today)
      .single();

    if (data) setAttendance(data);
    setLoading(false);
  };

  const handlePunchIn = async () => {
    if (!employee) return;
    setActionLoading(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("attendance")
        .insert({
          employee_id: employee.id,
          date: today,
          status: "Present",
          check_in: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setAttendance(data);
      toast.success("Punched in successfully!");
    } catch (error) {
      toast.error("Failed to punch in");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!attendance) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .update({
          check_out: new Date().toISOString()
        })
        .eq("id", attendance.id)
        .select()
        .single();

      if (error) throw error;
      setAttendance(data);
      toast.success("Punched out successfully!");
    } catch (error) {
      toast.error("Failed to punch out");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("employeeData");
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      {/* Header */}
      <div className="bg-primary text-secondary p-8 pb-20 rounded-b-[3rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-sm font-bold uppercase tracking-widest opacity-70">Welcome back,</h2>
            <h1 className="text-3xl font-serif font-bold">{employee?.name}</h1>
            <p className="text-xs font-medium bg-secondary/20 inline-block px-3 py-1 rounded-full">{employee?.role?.toUpperCase()}</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full bg-secondary/10 hover:bg-secondary hover:text-primary transition-all" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 -mt-12 space-y-6 max-w-lg mx-auto">
        {/* Time & Punch Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-primary/10 overflow-hidden">
            <CardContent className="p-8 text-center space-y-6">
              <div className="space-y-1">
                <p className="text-4xl font-serif font-bold text-primary">{format(currentTime, "hh:mm:ss a")}</p>
                <p className="text-sm font-bold text-muted-foreground">{format(currentTime, "EEEE, MMMM do")}</p>
              </div>

              <div className="flex gap-4 p-2 bg-muted/50 rounded-2xl">
                <div className="flex-1 p-4 rounded-xl bg-white shadow-sm space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Shift Start</p>
                  <p className="font-bold">07:00 AM</p>
                </div>
                <div className="flex-1 p-4 rounded-xl bg-white shadow-sm space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Shift End</p>
                  <p className="font-bold">03:00 PM</p>
                </div>
              </div>

              {!attendance ? (
                <Button 
                  className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
                  onClick={handlePunchIn}
                  disabled={actionLoading}
                >
                  {actionLoading ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Clock className="mr-2 h-6 w-6" />}
                  Punch In Today
                </Button>
              ) : !attendance.check_out ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-200 flex items-center justify-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-bold text-green-700">Punched in at {format(new Date(attendance.check_in), "hh:mm a")}</span>
                  </div>
                  <Button 
                    variant="destructive"
                    className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-red-600/20"
                    onClick={handlePunchOut}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-6 w-6" />}
                    Punch Out
                  </Button>
                </div>
              ) : (
                <div className="p-6 bg-muted/30 rounded-2xl space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                  <p className="font-bold text-lg">Work Completed!</p>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>In: {format(new Date(attendance.check_in), "hh:mm a")}</span>
                    <span>Out: {format(new Date(attendance.check_out), "hh:mm a")}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="rounded-[2rem] border-none shadow-sm">
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
              <Wallet className="h-5 w-5 text-primary" />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-2xl font-serif font-bold">₹{employee?.base_salary?.toLocaleString() || "0"}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Expected Salary</p>
            </CardContent>
          </Card>
          <Card className="rounded-[2rem] border-none shadow-sm">
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
              <Calendar className="h-5 w-5 text-primary" />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-2xl font-serif font-bold">22/26</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Days Present</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Notifications */}
        <Card className="rounded-[2rem] border-none shadow-sm">
          <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">Notifications</CardTitle>
            <Bell className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            <div className="flex gap-4 items-start p-3 hover:bg-muted/50 rounded-xl transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold">New Policy Updated</p>
                <p className="text-xs text-muted-foreground">Please check the new hygiene standards in the staff room.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-3 hover:bg-muted/50 rounded-xl transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold">Bonus Credited</p>
                <p className="text-xs text-muted-foreground">Your performance bonus for December has been credited.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Padding for Safe Area */}
      <div className="h-safe-bottom" />
    </div>
  );
}
