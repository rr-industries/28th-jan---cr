"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/context/AdminContext";
import {
    DollarSign,
    Plus,
    Lock,
    Unlock,
    Download,
    Edit2,
    LoaderCircle,
    CheckCircle2,
    Calendar,
    User,
    TrendingUp,
    TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    format,
    startOfMonth,
    endOfMonth,
    subMonths,
    addMonths
} from "date-fns";
import {
    generatePayrollBreakdown,
    type PayrollCalculationInput
} from "@/lib/payroll";
import { getMonthlyAttendanceSummary, getWorkingDaysInMonth } from "@/lib/attendance-utils";
import { logPayrollAction } from "@/lib/audit";

type Employee = {
    id: string;
    employee_id: string;
    name: string;
    base_salary: number;
    overtime_rate: number;
};

type PayrollRecord = {
    id: string;
    employee_id: string;
    month: string;
    base_salary: number;
    overtime_amount: number;
    incentives: number;
    bonus: number;
    allowances: number;
    late_penalty: number;
    unpaid_leave_deduction: number;
    advances: number;
    other_deductions: number;
    gross_pay: number;
    total_deductions: number;
    net_pay: number;
    payment_status: string;
    is_locked: boolean;
    present_days: number;
    leave_days: number;
    half_days: number;
    overtime_hours: number;
};

export default function PayrollPage() {
    const { user, selectedOutlet } = useAdmin();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
    const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Edit form state
    const [editIncentives, setEditIncentives] = useState("0");
    const [editBonus, setEditBonus] = useState("0");
    const [editAllowances, setEditAllowances] = useState("0");
    const [editAdvances, setEditAdvances] = useState("0");
    const [editOtherDeductions, setEditOtherDeductions] = useState("0");

    const isSuperAdmin = user?.role === 'Super Admin';

    useEffect(() => {
        if (isSuperAdmin) {
            fetchEmployees();
        }
    }, [selectedOutlet]);

    useEffect(() => {
        fetchPayrollRecords();
    }, [currentMonth, selectedOutlet]);

    const fetchEmployees = async () => {
        let query = supabase
            .from("employees")
            .select("id, employee_id, name, base_salary, overtime_rate")
            .eq("is_active", true);

        if (!user?.is_super_admin && selectedOutlet) {
            query = query.eq("outlet_id", selectedOutlet.id);
        }

        const { data } = await query.order("name");
        if (data) setEmployees(data);
    };

    const fetchPayrollRecords = async () => {
        setLoading(true);
        const monthStr = format(currentMonth, "yyyy-MM-01");

        let query = supabase
            .from("payroll")
            .select(`
        *,
        employee:employees(name, employee_id)
      `)
            .eq("month", monthStr);

        if (!user?.is_super_admin && selectedOutlet) {
            query = query.eq("outlet_id", selectedOutlet.id);
        }

        const { data } = await query.order("created_at", { ascending: false });
        if (data) setPayrollRecords(data as any);
        setLoading(false);
    };

    const handleGeneratePayroll = async () => {
        if (!selectedEmployee || !user || !selectedOutlet) {
            toast.error("Missing required data: employee, user, or outlet");
            return;
        }

        // Validate employee has required data
        if (!selectedEmployee.base_salary || selectedEmployee.base_salary <= 0) {
            toast.error("Employee must have a valid base salary configured");
            return;
        }

        setSubmitting(true);

        try {
            // ========================================
            // STEP 1: Fetch attendance for the month
            // ========================================
            const monthStart = startOfMonth(currentMonth);
            const monthEnd = endOfMonth(currentMonth);

            const { data: attendanceData, error: attendanceError } = await supabase
                .from("attendance")
                .select("*")
                .eq("employee_id", selectedEmployee.id)
                .gte("date", format(monthStart, "yyyy-MM-dd"))
                .lte("date", format(monthEnd, "yyyy-MM-dd"));

            if (attendanceError) {
                console.error("Attendance fetch error:", {
                    message: attendanceError?.message,
                    details: attendanceError?.details,
                    hint: attendanceError?.hint,
                    code: attendanceError?.code,
                    context: "Fetching attendance data"
                });
                throw new Error(
                    attendanceError.message ||
                    attendanceError.details ||
                    "Failed to fetch attendance data"
                );
            }

            // ========================================
            // STEP 2: Calculate payroll breakdown
            // ========================================
            const summary = getMonthlyAttendanceSummary(attendanceData || [], currentMonth);
            const workingDays = getWorkingDaysInMonth(currentMonth);

            const input: PayrollCalculationInput = {
                baseSalary: selectedEmployee.base_salary || 0,
                totalWorkingDays: workingDays,
                presentDays: summary.presentDays,
                leaveDays: summary.leaveDays,
                halfDays: summary.halfDays,
                overtimeHours: summary.overtimeHours,
                overtimeRate: selectedEmployee.overtime_rate || 0,
                lateMinutes: summary.lateMinutes,
                latePenaltyRate: 0.5,
                unpaidLeaveDays: summary.absentDays
            };

            const breakdown = generatePayrollBreakdown(input);

            // ========================================
            // STEP 3: Validate FK references exist
            // ========================================
            // Check employee exists
            const { data: employeeCheck, error: employeeCheckError } = await supabase
                .from("employees")
                .select("id")
                .eq("id", selectedEmployee.id)
                .single();

            if (employeeCheckError || !employeeCheck) {
                throw new Error(`Employee ID ${selectedEmployee.id} not found in database`);
            }

            // Check outlet exists
            const { data: outletCheck, error: outletCheckError } = await supabase
                .from("outlets")
                .select("id")
                .eq("id", selectedOutlet.id)
                .single();

            if (outletCheckError || !outletCheck) {
                throw new Error(`Outlet ID ${selectedOutlet.id} not found in database`);
            }

            // ========================================
            // STEP 4: Build validated payload
            // ========================================
            const payrollPayload = {
                // Foreign keys (validated above)
                employee_id: selectedEmployee.id,
                outlet_id: selectedOutlet.id,
                generated_by: user.id,

                // Date (required, NOT NULL)
                month: format(currentMonth, "yyyy-MM-01"),

                // Attendance metrics (required, NOT NULL with defaults)
                total_working_days: workingDays,
                present_days: breakdown.presentDays,
                leave_days: breakdown.leaveDays,
                half_days: breakdown.halfDays,
                overtime_hours: breakdown.overtimeHours,

                // Earnings (required, NOT NULL with defaults)
                base_salary: breakdown.baseSalary,
                overtime_amount: breakdown.overtimeAmount,
                incentives: breakdown.incentives,
                bonus: breakdown.bonus,
                allowances: breakdown.allowances,

                // Deductions (required, NOT NULL with defaults)
                late_penalty: breakdown.latePenalty,
                unpaid_leave_deduction: breakdown.unpaidLeaveDeduction,
                advances: breakdown.advances,
                other_deductions: breakdown.otherDeductions,

                // Totals (required, NOT NULL with defaults)
                gross_pay: breakdown.grossPay,
                total_deductions: breakdown.totalDeductions,
                net_pay: breakdown.netPay,

                // Status (required, has default)
                payment_status: "Pending"
            };

            // Log payload for debugging
            console.log("Payroll payload:", {
                employee: selectedEmployee.name,
                month: payrollPayload.month,
                net_pay: payrollPayload.net_pay,
                payload_keys: Object.keys(payrollPayload)
            });

            // ========================================
            // CRITICAL: Check user is authenticated via context
            // ========================================
            if (!user || !user.id) {
                throw new Error("You are not authenticated. Please log in again.");
            }

            // Check for Supabase Auth session (optional but recommended for RLS)
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            console.log("Auth check before insert:", {
                hasSession: !!session,
                userId: session?.user?.id,
                userEmail: session?.user?.email,
                contextUserId: user.id,
                sessionError: sessionError ? JSON.stringify(sessionError) : null
            });

            // Note: If no Supabase Auth session but user is logged in via legacy method,
            // database operations may fail due to RLS policies. User should re-login.
            if (!session) {
                console.warn("No Supabase Auth session found. If database operations fail, please log out and log in again to refresh your session.");
            }

            // ========================================
            // STEP 5: Insert with UPSERT to handle conflicts
            // ========================================
            const { data: payrollData, error: insertError } = await supabase
                .from("payroll")
                .upsert(payrollPayload, {
                    onConflict: "employee_id,month",
                    ignoreDuplicates: false
                })
                .select()
                .single();

            // ========================================
            // STEP 6: Handle errors with full details
            // ========================================
            if (insertError) {
                // CRITICAL: Use multiple logging strategies to expose the error
                console.error("=== PAYROLL INSERT ERROR DEBUG ===");
                console.error("Raw error object:", insertError);
                console.error("JSON.stringify:", JSON.stringify(insertError, null, 2));
                console.error("Error toString:", insertError.toString());
                console.error("Error constructor:", insertError.constructor.name);
                console.error("Error keys:", Object.keys(insertError));
                console.error("Error getOwnPropertyNames:", Object.getOwnPropertyNames(insertError));

                // Try to extract all possible properties
                const errorDetails = {
                    message: insertError?.message || "Unknown error",
                    details: insertError?.details || "No details provided",
                    hint: insertError?.hint || "No hint provided",
                    code: insertError?.code || "No error code",
                    context: "Inserting payroll record",
                    payload: payrollPayload
                };

                console.error("Structured error details:", JSON.stringify(errorDetails, null, 2));

                // Provide specific error messages based on error code
                let userMessage = "Failed to generate payroll";

                if (Object.keys(insertError).length === 0 && !insertError.message) {
                    userMessage = "Database Security Block (RLS) - The operation returned an empty error object. This usually happens when an RLS policy blocks the insert without a descriptive message.";
                } else if (insertError.code === "23505") {
                    userMessage = "Payroll already exists for this employee and month";
                } else if (insertError.code === "23503") {
                    userMessage = "Invalid employee or outlet reference";
                } else if (insertError.code === "42501") {
                    userMessage = "Permission denied. RLS policy may be blocking insert.";
                } else if (insertError.code === "PGRST301") {
                    userMessage = "RLS policy violation - you don't have permission to insert payroll";
                } else if (insertError.message) {
                    userMessage = insertError.message;
                } else {
                    userMessage = "Database error - check console for details";
                }

                throw new Error(userMessage);
            }

            if (!payrollData) {
                throw new Error("Payroll was not created. No data returned from insert.");
            }

            // ========================================
            // STEP 7: Log the generation to audit
            // ========================================
            try {
                await logPayrollAction({
                    action: "payroll_generate",
                    payrollId: payrollData.id,
                    newValue: payrollData,
                    reason: `Payroll generated for ${format(currentMonth, "MMMM yyyy")}`,
                    performedBy: user.id,
                    outletId: selectedOutlet.id
                });
            } catch (auditError) {
                // Don't fail the whole operation if audit logging fails
                console.warn("Failed to log payroll generation:", auditError);
            }

            toast.success(`Payroll generated successfully for ${selectedEmployee.name}`);
            setShowGenerateModal(false);
            setSelectedEmployee(null);
            fetchPayrollRecords();

        } catch (e: unknown) {
            const err = e as { message?: string; code?: string; details?: string };
            const errMessage = err?.message ?? "An unexpected error occurred while generating payroll";
            const errCode = err?.code;
            const msg = (err?.message ?? "").toLowerCase();
            const isRLSError =
                errCode === "42501" ||
                errCode === "401" ||
                msg.includes("permission") ||
                msg.includes("row-level security");

            let message = errMessage;

            if (isRLSError || !err?.message) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    message = "Your session has expired. Please log out and log in again to refresh your authentication.";
                } else {
                    message = "Permission denied by system security rules. Please contact admin.";
                }
            }

            if (process.env.NODE_ENV === "development") {
                console.error("Error generating payroll:", errMessage, { code: errCode, employee: selectedEmployee?.name, month: format(currentMonth, "MMMM yyyy") });
            }
            toast.error(message);
        }
        finally {
            setSubmitting(false);
        }
    };

    const handleEditPayroll = (payroll: PayrollRecord) => {
        if (!isSuperAdmin) {
            toast.error("Only Super Admin can edit payroll");
            return;
        }

        if (payroll.is_locked) {
            toast.error("This payroll is locked");
            return;
        }

        setSelectedPayroll(payroll);
        setEditIncentives(payroll.incentives.toString());
        setEditBonus(payroll.bonus.toString());
        setEditAllowances(payroll.allowances.toString());
        setEditAdvances(payroll.advances.toString());
        setEditOtherDeductions(payroll.other_deductions.toString());
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedPayroll || !user) return;

        setSubmitting(true);

        try {
            const updatedData = {
                incentives: parseFloat(editIncentives) || 0,
                bonus: parseFloat(editBonus) || 0,
                allowances: parseFloat(editAllowances) || 0,
                advances: parseFloat(editAdvances) || 0,
                other_deductions: parseFloat(editOtherDeductions) || 0
            };

            // Recalculate totals
            const grossPay =
                selectedPayroll.base_salary +
                selectedPayroll.overtime_amount +
                updatedData.incentives +
                updatedData.bonus +
                updatedData.allowances;

            const totalDeductions =
                selectedPayroll.late_penalty +
                selectedPayroll.unpaid_leave_deduction +
                updatedData.advances +
                updatedData.other_deductions;

            const netPay = grossPay - totalDeductions;

            const { error } = await supabase
                .from("payroll")
                .update({
                    ...updatedData,
                    gross_pay: grossPay,
                    total_deductions: totalDeductions,
                    net_pay: netPay
                })
                .eq("id", selectedPayroll.id);

            if (error) throw error;

            // Log the edit
            await logPayrollAction({
                action: "payroll_edit",
                payrollId: selectedPayroll.id,
                oldValue: selectedPayroll,
                newValue: { ...selectedPayroll, ...updatedData, gross_pay: grossPay, total_deductions: totalDeductions, net_pay: netPay },
                reason: "Payroll components updated",
                performedBy: user.id,
                outletId: selectedOutlet?.id || ""
            });

            toast.success("Payroll updated successfully");
            setShowEditModal(false);
            fetchPayrollRecords();
        } catch (error: any) {
            console.error("Error updating payroll:", error);
            toast.error(error.message || "Failed to update payroll");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleLock = async (payroll: PayrollRecord) => {
        if (!isSuperAdmin) {
            toast.error("Only Super Admin can lock/unlock payroll");
            return;
        }

        try {
            const newLockState = !payroll.is_locked;
            const { error } = await supabase
                .from("payroll")
                .update({
                    is_locked: newLockState,
                    locked_at: newLockState ? new Date().toISOString() : null,
                    locked_by: newLockState ? user?.id : null
                })
                .eq("id", payroll.id);

            if (error) throw error;

            // Log the action
            await logPayrollAction({
                action: newLockState ? "payroll_lock" : "payroll_unlock",
                payrollId: payroll.id,
                reason: newLockState ? "Payroll locked" : "Payroll unlocked",
                performedBy: user?.id || "",
                outletId: selectedOutlet?.id || ""
            });

            toast.success(`Payroll ${newLockState ? "locked" : "unlocked"} successfully`);
            fetchPayrollRecords();
        } catch (error: any) {
            console.error("Error toggling lock:", error);
            toast.error(error.message || "Failed to toggle lock");
        }
    };

    const handleUpdatePaymentStatus = async (payroll: PayrollRecord, status: string) => {
        if (!isSuperAdmin) {
            toast.error("Only Super Admin can update payment status");
            return;
        }

        try {
            const { error } = await supabase
                .from("payroll")
                .update({ payment_status: status })
                .eq("id", payroll.id);

            if (error) throw error;
            toast.success(`Payment status updated to ${status}`);
            fetchPayrollRecords();
        } catch (error: any) {
            console.error("Error updating status:", error);
            toast.error(error.message || "Failed to update status");
        }
    };

    const handleExportCSV = () => {
        if (payrollRecords.length === 0) {
            toast.error("No payroll records to export");
            return;
        }

        // CSV headers
        const headers = [
            "Employee ID",
            "Employee Name",
            "Month",
            "Base Salary",
            "Overtime Amount",
            "Incentives",
            "Bonus",
            "Allowances",
            "Gross Pay",
            "Late Penalty",
            "Unpaid Leave Deduction",
            "Advances",
            "Other Deductions",
            "Total Deductions",
            "Net Pay",
            "Present Days",
            "Leave Days",
            "Half Days",
            "Overtime Hours",
            "Payment Status",
            "Locked"
        ];

        // CSV rows
        const rows = payrollRecords.map(payroll => [
            (payroll as any).employee?.employee_id || "",
            (payroll as any).employee?.name || "",
            format(new Date(payroll.month), "MMMM yyyy"),
            payroll.base_salary.toFixed(2),
            payroll.overtime_amount.toFixed(2),
            payroll.incentives.toFixed(2),
            payroll.bonus.toFixed(2),
            payroll.allowances.toFixed(2),
            payroll.gross_pay.toFixed(2),
            payroll.late_penalty.toFixed(2),
            payroll.unpaid_leave_deduction.toFixed(2),
            payroll.advances.toFixed(2),
            payroll.other_deductions.toFixed(2),
            payroll.total_deductions.toFixed(2),
            payroll.net_pay.toFixed(2),
            payroll.present_days,
            payroll.leave_days,
            payroll.half_days,
            payroll.overtime_hours,
            payroll.payment_status,
            payroll.is_locked ? "Yes" : "No"
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        // Create blob and download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", `payroll_${format(currentMonth, "yyyy-MM")}.csv`);
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Payroll data exported successfully");
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold tracking-tight">Payroll Management</h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Generate and manage employee payroll
                    </p>
                </div>
                <div className="flex gap-2">
                    {payrollRecords.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleExportCSV}
                            className="h-12 rounded-2xl font-bold"
                        >
                            <Download className="h-5 w-5 mr-2" />
                            Export CSV
                        </Button>
                    )}
                    {isSuperAdmin && (
                        <Button
                            onClick={() => setShowGenerateModal(true)}
                            className="h-12 rounded-2xl font-bold shadow-lg shadow-primary/20"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Generate Payroll
                        </Button>
                    )}
                </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border-2 shadow-lg">
                <Button
                    variant="outline"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="h-12 rounded-xl"
                >
                    Previous Month
                </Button>
                <h2 className="text-2xl font-bold">
                    {format(currentMonth, "MMMM yyyy")}
                </h2>
                <Button
                    variant="outline"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="h-12 rounded-xl"
                >
                    Next Month
                </Button>
            </div>

            {/* Payroll Records */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : payrollRecords.length === 0 ? (
                <Card className="rounded-[2rem] border-2 shadow-lg">
                    <CardContent className="p-12 text-center">
                        <DollarSign className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-muted-foreground mb-2">No Payroll Records</h3>
                        <p className="text-sm text-muted-foreground">
                            {isSuperAdmin ? "Generate payroll for this month to get started" : "No payroll has been generated for this month"}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {payrollRecords.map(payroll => (
                        <Card key={payroll.id} className="rounded-[2rem] border-2 shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl font-bold">
                                            {(payroll as any).employee?.name}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground font-mono mt-1">
                                            {(payroll as any).employee?.employee_id}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant={payroll.payment_status === 'Paid' ? 'default' : 'secondary'} className="rounded-full">
                                            {payroll.payment_status}
                                        </Badge>
                                        {payroll.is_locked && (
                                            <Badge variant="destructive" className="rounded-full">
                                                <Lock className="h-3 w-3 mr-1" />
                                                Locked
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Earnings */}
                                <div>
                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                        Earnings
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                                            <p className="text-xs text-green-600 font-bold">Base Salary</p>
                                            <p className="text-lg font-bold text-green-700">₹{payroll.base_salary.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                                            <p className="text-xs text-green-600 font-bold">Overtime</p>
                                            <p className="text-lg font-bold text-green-700">₹{payroll.overtime_amount.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                                            <p className="text-xs text-green-600 font-bold">Incentives</p>
                                            <p className="text-lg font-bold text-green-700">₹{payroll.incentives.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                                            <p className="text-xs text-green-600 font-bold">Bonus</p>
                                            <p className="text-lg font-bold text-green-700">₹{payroll.bonus.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                                            <p className="text-xs text-green-600 font-bold">Allowances</p>
                                            <p className="text-lg font-bold text-green-700">₹{payroll.allowances.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-green-100 rounded-xl border-2 border-green-300">
                                            <p className="text-xs text-green-700 font-bold">Gross Pay</p>
                                            <p className="text-xl font-bold text-green-800">₹{payroll.gross_pay.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Deductions */}
                                <div>
                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                        Deductions
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                                            <p className="text-xs text-red-600 font-bold">Late Penalty</p>
                                            <p className="text-lg font-bold text-red-700">₹{payroll.late_penalty.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                                            <p className="text-xs text-red-600 font-bold">Unpaid Leave</p>
                                            <p className="text-lg font-bold text-red-700">₹{payroll.unpaid_leave_deduction.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                                            <p className="text-xs text-red-600 font-bold">Advances</p>
                                            <p className="text-lg font-bold text-red-700">₹{payroll.advances.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                                            <p className="text-xs text-red-600 font-bold">Other</p>
                                            <p className="text-lg font-bold text-red-700">₹{payroll.other_deductions.toFixed(2)}</p>
                                        </div>
                                        <div className="p-3 bg-red-100 rounded-xl border-2 border-red-300 col-span-2">
                                            <p className="text-xs text-red-700 font-bold">Total Deductions</p>
                                            <p className="text-xl font-bold text-red-800">₹{payroll.total_deductions.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Pay */}
                                <div className="p-6 bg-primary/5 rounded-[1.5rem] border-2 border-primary/20">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-bold text-primary uppercase tracking-wider">Net Payable</p>
                                            <p className="text-4xl font-bold text-primary mt-1">₹{payroll.net_pay.toFixed(2)}</p>
                                        </div>
                                        <div className="text-right text-sm text-muted-foreground">
                                            <p>Present: {payroll.present_days} days</p>
                                            <p>Leave: {payroll.leave_days} days</p>
                                            <p>OT: {payroll.overtime_hours}h</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {isSuperAdmin && (
                                    <div className="flex gap-2 pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleEditPayroll(payroll)}
                                            disabled={payroll.is_locked}
                                            className="rounded-xl"
                                        >
                                            <Edit2 className="h-4 w-4 mr-2" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleToggleLock(payroll)}
                                            className="rounded-xl"
                                        >
                                            {payroll.is_locked ? (
                                                <>
                                                    <Unlock className="h-4 w-4 mr-2" />
                                                    Unlock
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="h-4 w-4 mr-2" />
                                                    Lock
                                                </>
                                            )}
                                        </Button>
                                        {payroll.payment_status === 'Pending' && (
                                            <Button
                                                onClick={() => handleUpdatePaymentStatus(payroll, 'Paid')}
                                                className="rounded-xl"
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Mark Paid
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={() => toast.info("Payslip download coming soon")}
                                            className="rounded-xl ml-auto"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download Payslip
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Generate Modal */}
            <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
                <DialogContent className="max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Generate Payroll</DialogTitle>
                        <DialogDescription>
                            Select an employee to generate payroll for {format(currentMonth, "MMMM yyyy")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label className="text-sm font-bold">Employee</Label>
                        <Select
                            value={selectedEmployee?.id || ""}
                            onValueChange={(id) => {
                                const emp = employees.find(e => e.id === id);
                                if (emp) setSelectedEmployee(emp);
                            }}
                        >
                            <SelectTrigger className="h-12 rounded-xl mt-2">
                                <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        {emp.name} ({emp.employee_id})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowGenerateModal(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleGeneratePayroll}
                            disabled={!selectedEmployee || submitting}
                            className="rounded-xl"
                        >
                            {submitting ? (
                                <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Edit Payroll Components</DialogTitle>
                        <DialogDescription>
                            Adjust incentives, bonuses, and deductions
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label className="text-sm font-bold text-green-700">Incentives (₹)</Label>
                            <Input
                                type="number"
                                value={editIncentives}
                                onChange={(e) => setEditIncentives(e.target.value)}
                                className="h-12 rounded-xl mt-2"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-green-700">Bonus (₹)</Label>
                            <Input
                                type="number"
                                value={editBonus}
                                onChange={(e) => setEditBonus(e.target.value)}
                                className="h-12 rounded-xl mt-2"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-green-700">Allowances (₹)</Label>
                            <Input
                                type="number"
                                value={editAllowances}
                                onChange={(e) => setEditAllowances(e.target.value)}
                                className="h-12 rounded-xl mt-2"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-red-700">Advances (₹)</Label>
                            <Input
                                type="number"
                                value={editAdvances}
                                onChange={(e) => setEditAdvances(e.target.value)}
                                className="h-12 rounded-xl mt-2"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-bold text-red-700">Other Deductions (₹)</Label>
                            <Input
                                type="number"
                                value={editOtherDeductions}
                                onChange={(e) => setEditOtherDeductions(e.target.value)}
                                className="h-12 rounded-xl mt-2"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowEditModal(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={submitting}
                            className="rounded-xl"
                        >
                            {submitting ? (
                                <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
