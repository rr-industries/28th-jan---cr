"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/context/AdminContext";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Edit2,
    Trash2,
    Lock,
    Unlock,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    LoaderCircle
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isAfter,
    startOfDay
} from "date-fns";
import {
    isDateInFuture,
    canEditAttendance,
    canDeleteAttendance,
    getMonthlyAttendanceSummary,
    validateAttendanceEdit,
    getAttendanceStatusColor,
    getAttendanceStatusTextColor
} from "@/lib/attendance-utils";
import { logAttendanceEdit, logAttendanceDelete } from "@/lib/audit";

type AttendanceRecord = {
    id: string;
    date: string;
    status: string;
    check_in: string | null;
    check_out: string | null;
    overtime_hours: number;
    late_minutes: number;
    is_locked: boolean;
    overridden_by: string | null;
    override_reason: string | null;
    notes: string | null;
};

type Employee = {
    id: string;
    employee_id: string;
    name: string;
    role: string;
};

export default function AttendancePage() {
    const { user, selectedOutlet } = useAdmin();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

    // Edit form state
    const [editStatus, setEditStatus] = useState("");
    const [editCheckIn, setEditCheckIn] = useState("");
    const [editCheckOut, setEditCheckOut] = useState("");
    const [editReason, setEditReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const isSuperAdmin = user?.role?.toLowerCase() === 'super admin' || user?.role?.toLowerCase() === 'super_admin';
    const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'manager';

    useEffect(() => {
        if (user) {
            if (isSuperAdmin || isAdmin) {
                fetchEmployees();
            } else {
                // Regular employee - set themselves as selected
                setSelectedEmployee({
                    id: user.id,
                    employee_id: user.employee_id || "",
                    name: user.name,
                    role: user.role
                });
            }
        }
    }, [user]);

    useEffect(() => {
        if (selectedEmployee) {
            fetchAttendance();
        }
    }, [selectedEmployee, currentMonth]);

    const fetchEmployees = async () => {
        let query = supabase
            .from("employees")
            .select("id, employee_id, name, role")
            .eq("is_active", true);

        if (!isSuperAdmin && selectedOutlet) {
            query = query.eq("outlet_id", selectedOutlet.id);
        }

        const { data } = await query.order("name");
        if (data) {
            setEmployees(data);
            if (data.length > 0 && !selectedEmployee) {
                setSelectedEmployee(data[0]);
            }
        }
    };

    const fetchAttendance = async () => {
        if (!selectedEmployee) return;

        setLoading(true);
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        const { data, error } = await supabase
            .from("attendance")
            .select("*")
            .eq("employee_id", selectedEmployee.id)
            .gte("date", format(monthStart, "yyyy-MM-dd"))
            .lte("date", format(monthEnd, "yyyy-MM-dd"))
            .order("date", { ascending: true });

        if (data) {
            setAttendanceRecords(data);
        }
        setLoading(false);
    };

    const handlePreviousMonth = () => {
        // Employees cannot navigate to future months
        if (!isSuperAdmin && !isAdmin) {
            const prevMonth = subMonths(currentMonth, 1);
            const today = new Date();
            if (isAfter(prevMonth, today)) {
                toast.error("Cannot view future months");
                return;
            }
        }
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        const nextMonth = addMonths(currentMonth, 1);
        const today = new Date();

        // Employees cannot navigate to future months
        if (!isSuperAdmin && !isAdmin) {
            if (isAfter(startOfMonth(nextMonth), startOfMonth(today))) {
                toast.error("Cannot view future months");
                return;
            }
        }

        setCurrentMonth(nextMonth);
    };

    const handleDayClick = (date: Date) => {
        if (!isSuperAdmin) {
            toast.error("Only Super Admin can edit attendance");
            return;
        }

        if (isDateInFuture(date)) {
            toast.error("Attendance cannot be marked beyond today");
            return;
        }

        const record = attendanceRecords.find(r => isSameDay(new Date(r.date), date));

        if (record && record.is_locked) {
            toast.error("This attendance record is locked");
            return;
        }

        setSelectedDate(date);
        setSelectedRecord(record || null);
        setEditStatus(record?.status || "Present");
        setEditCheckIn(record?.check_in ? format(new Date(record.check_in), "HH:mm") : "09:00");
        setEditCheckOut(record?.check_out ? format(new Date(record.check_out), "HH:mm") : "18:00");
        setEditReason("");
        setShowEditModal(true);
    };

    const handleSaveAttendance = async () => {
        if (!selectedDate || !selectedEmployee || !user) return;

        const validation = validateAttendanceEdit({
            date: selectedDate,
            status: editStatus as any,
            reason: editReason
        });

        if (!validation.valid) {
            toast.error(validation.errors.join(", "));
            return;
        }

        setSubmitting(true);

        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const checkInTime = `${dateStr}T${editCheckIn}:00`;
            const checkOutTime = `${dateStr}T${editCheckOut}:00`;

            const attendanceData = {
                employee_id: selectedEmployee.id,
                outlet_id: selectedOutlet?.id,
                date: dateStr,
                status: editStatus,
                check_in: editCheckIn ? checkInTime : null,
                check_out: editCheckOut ? checkOutTime : null,
                overridden_by: user.id,
                override_reason: editReason,
                overridden_at: new Date().toISOString()
            };

            if (selectedRecord) {
                // Update existing
                const { error } = await supabase
                    .from("attendance")
                    .update(attendanceData)
                    .eq("id", selectedRecord.id);

                if (error) throw error;

                // Log the edit
                try {
                    await logAttendanceEdit({
                        attendanceId: selectedRecord.id,
                        oldStatus: selectedRecord.status,
                        newStatus: editStatus,
                        oldCheckIn: selectedRecord.check_in || undefined,
                        oldCheckOut: selectedRecord.check_out || undefined,
                        newCheckIn: checkInTime,
                        newCheckOut: checkOutTime,
                        reason: editReason,
                        performedBy: user.id,
                        outletId: selectedOutlet?.id || ""
                    });
                } catch (auditErr) {
                    console.warn("Audit log failed (likely RLS):", auditErr);
                }

                toast.success("Attendance updated successfully");
            } else {
                // Create new
                const { error } = await supabase
                    .from("attendance")
                    .insert(attendanceData);

                if (error) throw error;
                toast.success("Attendance marked successfully");
            }

            setShowEditModal(false);
            fetchAttendance();
        } catch (error: any) {
            console.error("Error saving attendance:", error);
            toast.error(error.message || "Failed to save attendance");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAttendance = async () => {
        if (!selectedRecord || !user) return;

        const canDelete = canDeleteAttendance(user.role, selectedRecord.is_locked);
        if (!canDelete.allowed) {
            toast.error(canDelete.reason);
            return;
        }

        if (!confirm("Are you sure you want to delete this attendance record?")) {
            return;
        }

        const reason = prompt("Please provide a reason for deletion:");
        if (!reason || reason.trim().length < 5) {
            toast.error("Deletion reason must be at least 5 characters");
            return;
        }

        try {
            // Log before deleting
            await logAttendanceDelete({
                attendanceId: selectedRecord.id,
                attendanceData: selectedRecord,
                reason,
                performedBy: user.id,
                outletId: selectedOutlet?.id || ""
            });

            const { error } = await supabase
                .from("attendance")
                .delete()
                .eq("id", selectedRecord.id);

            if (error) throw error;

            toast.success("Attendance deleted successfully");
            setShowEditModal(false);
            fetchAttendance();
        } catch (error: any) {
            console.error("Error deleting attendance:", error);
            toast.error(error.message || "Failed to delete attendance");
        }
    };

    // Calculate summary
    const summary = getMonthlyAttendanceSummary(attendanceRecords, currentMonth);

    // Generate calendar days
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold tracking-tight">Monthly Attendance</h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-primary" />
                        Track and manage employee attendance
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="h-12 rounded-2xl font-bold"
                        onClick={() => toast.info("Export feature coming soon")}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Employee Selector (Super Admin / Admin only) */}
            {(isSuperAdmin || isAdmin) && (
                <Card className="rounded-[2rem] border-2 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <User className="h-5 w-5 text-primary" />
                            <div className="flex-1">
                                <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                    Select Employee
                                </Label>
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
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border-2 shadow-lg">
                <Button
                    variant="outline"
                    onClick={handlePreviousMonth}
                    className="h-12 w-12 rounded-xl p-0"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-2xl font-bold">
                    {format(currentMonth, "MMMM yyyy")}
                </h2>
                <Button
                    variant="outline"
                    onClick={handleNextMonth}
                    className="h-12 w-12 rounded-xl p-0"
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="rounded-[1.5rem] border-2 border-green-200 bg-green-50">
                    <CardContent className="p-6 text-center">
                        <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-green-700">{summary.presentDays}</p>
                        <p className="text-xs font-bold text-green-600 uppercase tracking-wider mt-1">Present</p>
                    </CardContent>
                </Card>
                <Card className="rounded-[1.5rem] border-2 border-red-200 bg-red-50">
                    <CardContent className="p-6 text-center">
                        <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-red-700">{summary.absentDays}</p>
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wider mt-1">Absent</p>
                    </CardContent>
                </Card>
                <Card className="rounded-[1.5rem] border-2 border-blue-200 bg-blue-50">
                    <CardContent className="p-6 text-center">
                        <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-blue-700">{summary.leaveDays}</p>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-1">Leave</p>
                    </CardContent>
                </Card>
                <Card className="rounded-[1.5rem] border-2 border-yellow-200 bg-yellow-50">
                    <CardContent className="p-6 text-center">
                        <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-yellow-700">{summary.halfDays}</p>
                        <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider mt-1">Half Day</p>
                    </CardContent>
                </Card>
                <Card className="rounded-[1.5rem] border-2 border-purple-200 bg-purple-50">
                    <CardContent className="p-6 text-center">
                        <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-purple-700">{summary.overtimeHours.toFixed(1)}</p>
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mt-1">OT Hours</p>
                    </CardContent>
                </Card>
            </div>

            {/* Calendar Grid */}
            <Card className="rounded-[2rem] border-2 shadow-lg">
                <CardContent className="p-8">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="grid grid-cols-7 gap-2 min-w-[600px]">
                                {/* Day headers */}
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                    <div key={day} className="text-center font-bold text-sm text-muted-foreground p-2">
                                        {day}
                                    </div>
                                ))}

                                {/* Calendar days */}
                                {daysInMonth.map(day => {
                                    const record = attendanceRecords.find(r => isSameDay(new Date(r.date), day));
                                    const isFuture = isDateInFuture(day);
                                    const isToday = isSameDay(day, new Date());

                                    return (
                                        <button
                                            key={day.toString()}
                                            onClick={() => handleDayClick(day)}
                                            disabled={isFuture || (!isSuperAdmin && !isAdmin)}
                                            className={cn(
                                                "aspect-square rounded-xl p-2 text-center transition-all relative",
                                                isFuture && "opacity-40 cursor-not-allowed bg-gray-100",
                                                !isFuture && isSuperAdmin && "hover:ring-2 hover:ring-primary cursor-pointer",
                                                isToday && "ring-2 ring-blue-500",
                                                record && !isFuture && getAttendanceStatusColor(record.status),
                                                !record && !isFuture && "bg-gray-50 hover:bg-gray-100"
                                            )}
                                        >
                                            <div className="text-sm font-bold">
                                                {format(day, "d")}
                                            </div>
                                            {record && (
                                                <div className="text-[8px] font-bold uppercase mt-1 text-white">
                                                    {record.status.substring(0, 3)}
                                                </div>
                                            )}
                                            {record?.overridden_by && (
                                                <div className="absolute top-1 right-1">
                                                    <Edit2 className="h-3 w-3 text-white" />
                                                </div>
                                            )}
                                            {record?.is_locked && (
                                                <div className="absolute bottom-1 right-1">
                                                    <Lock className="h-3 w-3 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">
                            {selectedRecord ? "Edit Attendance" : "Mark Attendance"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div>
                            <Label className="text-sm font-bold">Status</Label>
                            <Select value={editStatus} onValueChange={setEditStatus}>
                                <SelectTrigger className="h-12 rounded-xl mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Present">Present</SelectItem>
                                    <SelectItem value="Absent">Absent</SelectItem>
                                    <SelectItem value="Leave">Leave</SelectItem>
                                    <SelectItem value="Half Day">Half Day</SelectItem>
                                    <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {editStatus === "Present" && (
                            <>
                                <div>
                                    <Label className="text-sm font-bold">Check In</Label>
                                    <Input
                                        type="time"
                                        value={editCheckIn}
                                        onChange={(e) => setEditCheckIn(e.target.value)}
                                        className="h-12 rounded-xl mt-2"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-bold">Check Out</Label>
                                    <Input
                                        type="time"
                                        value={editCheckOut}
                                        onChange={(e) => setEditCheckOut(e.target.value)}
                                        className="h-12 rounded-xl mt-2"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <Label className="text-sm font-bold">Reason for Edit *</Label>
                            <Textarea
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                placeholder="Provide a reason for this change..."
                                className="rounded-xl mt-2 min-h-[100px]"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Minimum 5 characters required</p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        {selectedRecord && (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteAttendance}
                                className="rounded-xl"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => setShowEditModal(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveAttendance}
                            disabled={submitting}
                            className="rounded-xl"
                        >
                            {submitting ? (
                                <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
