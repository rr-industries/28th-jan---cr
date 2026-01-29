"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/context/AdminContext";
import { format, eachDayOfInterval } from "date-fns";
import {
    Check,
    X,
    LoaderCircle,
    Calendar,
    Search,
    Filter,
    FileText,
    Clock,
    ArrowRight,
    Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type LeaveRequest = {
    id: string;
    employee_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    created_at: string;
    employees: {
        name: string;
        employee_id: string;
        role: string;
    };
};

export default function LeaveManagement() {
    const { user, selectedOutlet } = useAdmin();
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Assign Leave State
    const [showAssignLeaveDialog, setShowAssignLeaveDialog] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [newLeave, setNewLeave] = useState({
        employee_id: "",
        leave_type: "Casual",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(new Date(), "yyyy-MM-dd"),
        reason: "",
        duration: "Full Day"
    });

    const isAdmin = user?.role === "admin" || user?.role === "Super Admin" || user?.role === "manager";

    useEffect(() => {
        if (user && selectedOutlet) {
            fetchLeaves();
            fetchEmployees();
        }
    }, [user, selectedOutlet, filterStatus]);

    const fetchEmployees = async () => {
        const { data, error } = await supabase
            .from("employees")
            .select("id, name")
            .eq("outlet_id", selectedOutlet?.id);

        if (error) {
            console.error("Error fetching employees:", error);
        } else {
            setEmployees(data || []);
        }
    };

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("leave_requests")
                .select(`
          *,
          employees (
            name,
            employee_id,
            role
          )
        `)
                .eq("outlet_id", selectedOutlet?.id)
                .order("created_at", { ascending: false });

            if (!isAdmin) {
                query = query.eq("employee_id", user?.id);
            }

            if (filterStatus !== "all") {
                query = query.eq("status", filterStatus);
            }

            const { data, error } = await query;

            if (error) throw error;
            setLeaves(data || []);
        } catch (error) {
            toast.error("Failed to fetch leave requests");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (leave: LeaveRequest, action: 'Approved' | 'Rejected') => {
        if (!selectedOutlet || !user) return;
        setProcessingId(leave.id);

        try {
            const { error: updateError } = await supabase
                .from("leave_requests")
                .update({
                    status: action,
                    approved_by: user.id,
                    approved_at: new Date().toISOString()
                })
                .eq("id", leave.id);

            if (updateError) throw updateError;

            if (action === 'Approved') {
                const days = eachDayOfInterval({
                    start: new Date(leave.start_date),
                    end: new Date(leave.end_date)
                });

                const attendanceInserts = days.map(date => ({
                    employee_id: leave.employee_id,
                    date: format(date, "yyyy-MM-dd"),
                    status: 'Head Leave',
                    outlet_id: selectedOutlet.id,
                    notes: `Approved Leave: ${leave.leave_type} - ${leave.reason}`
                }));

                const { error: attError } = await supabase
                    .from("attendance")
                    .upsert(attendanceInserts, { onConflict: 'employee_id,date' });

                if (attError) throw attError;
            }

            toast.success(`Leave ${action} successfully`);
            fetchLeaves();
        } catch (error) {
            console.error(error);
            toast.error("Failed to process request");
        } finally {
            setProcessingId(null);
        }
    };

    const handleAssignLeave = async () => {
        if (!newLeave.employee_id || !newLeave.reason) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            const { data: request, error } = await supabase
                .from("leave_requests")
                .insert({
                    employee_id: newLeave.employee_id,
                    leave_type: newLeave.leave_type,
                    start_date: newLeave.start_date,
                    end_date: newLeave.end_date,
                    reason: `${newLeave.duration} - ${newLeave.reason}`,
                    outlet_id: selectedOutlet?.id,
                    status: 'Approved'
                })
                .select()
                .single();

            if (error) throw error;

            // Auto-mark attendance
            const days = eachDayOfInterval({
                start: new Date(newLeave.start_date),
                end: new Date(newLeave.end_date)
            });

            const attendanceStatus = newLeave.duration === "Half Day" ? "Half Day" : "Head Leave";

            const attendanceInserts = days.map(date => ({
                employee_id: newLeave.employee_id,
                date: format(date, "yyyy-MM-dd"),
                status: attendanceStatus,
                outlet_id: selectedOutlet?.id,
                notes: `Admin Assigned: ${newLeave.leave_type} (${newLeave.duration}) - ${newLeave.reason}`
            }));

            const { error: attError } = await supabase.from("attendance").upsert(attendanceInserts, { onConflict: 'employee_id,date' });

            if (attError) throw attError;

            toast.success("Leave assigned successfully");
            setShowAssignLeaveDialog(false);
            fetchLeaves();

            setNewLeave({
                employee_id: "",
                leave_type: "Casual",
                start_date: format(new Date(), "yyyy-MM-dd"),
                end_date: format(new Date(), "yyyy-MM-dd"),
                reason: "",
                duration: "Full Day"
            });
        } catch (e) {
            toast.error("Failed to assign leave");
            console.error(e);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Approved':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Approved</Badge>;
            case 'Rejected':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Rejected</Badge>;
            case 'Pending':
                return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200">Pending</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const calculateDays = (start: string, end: string) => {
        const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    if (loading && leaves.length === 0) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pb-20 max-w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-2xl">
                            <FileText className="h-7 w-7 text-primary" />
                        </div>
                        Leave Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isAdmin ? "Approve or reject staff leave requests" : "View your leave history and status"}
                    </p>
                </div>

                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setShowAssignLeaveDialog(true)} className="rounded-xl shadow-lg shadow-primary/20">
                            <Plus className="h-4 w-4 mr-2" />
                            Assign Leave
                        </Button>
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border shadow-sm">
                            <Filter className="h-4 w-4 text-muted-foreground ml-2" />
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="border-0 bg-transparent h-8 w-[150px] focus:ring-0">
                                    <SelectValue placeholder="Filter Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Requests</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Approved">Approved</SelectItem>
                                    <SelectItem value="Rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid gap-6">
                {leaves.length === 0 ? (
                    <Card className="rounded-[2.5rem] border-2 border-dashed bg-transparent p-12 flex flex-col items-center justify-center text-center">
                        <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-bold text-muted-foreground">No leave requests found</h3>
                        <p className="text-sm text-muted-foreground/70">
                            {isAdmin ? "Approvals will appear here when staff apply." : "You haven't applied for any leaves yet."}
                        </p>
                    </Card>
                ) : (
                    <Card className="rounded-[2.5rem] overflow-hidden border-2 shadow-sm">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/30 border-b">
                                        <tr>
                                            {isAdmin && <th className="text-left p-5 font-bold text-xs uppercase tracking-wider">Employee</th>}
                                            <th className="text-left p-5 font-bold text-xs uppercase tracking-wider">Leave Type</th>
                                            <th className="text-left p-5 font-bold text-xs uppercase tracking-wider">Duration</th>
                                            <th className="text-left p-5 font-bold text-xs uppercase tracking-wider">Reason</th>
                                            <th className="text-left p-5 font-bold text-xs uppercase tracking-wider">Applied On</th>
                                            <th className="text-center p-5 font-bold text-xs uppercase tracking-wider">Status</th>
                                            {isAdmin && <th className="text-right p-5 font-bold text-xs uppercase tracking-wider">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {leaves.map((leave) => (
                                            <tr key={leave.id} className="hover:bg-muted/5 transition-colors group">
                                                {isAdmin && (
                                                    <td className="p-5">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm">{leave.employees?.name || "Unknown"}</span>
                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{leave.employees?.role || "N/A"}</span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="p-5">
                                                    <span className="font-medium text-sm bg-muted/30 px-3 py-1 rounded-lg">
                                                        {leave.leave_type}
                                                    </span>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm flex items-center gap-2">
                                                            {format(new Date(leave.start_date), "MMM dd")}
                                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                            {format(new Date(leave.end_date), "MMM dd")}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground mt-1">
                                                            {calculateDays(leave.start_date, leave.end_date)} Days
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-5 max-w-[200px]">
                                                    <p className="text-sm text-muted-foreground truncate" title={leave.reason}>
                                                        {leave.reason}
                                                    </p>
                                                </td>
                                                <td className="p-5 text-sm text-muted-foreground">
                                                    {format(new Date(leave.created_at), "MMM dd, yyyy")}
                                                </td>
                                                <td className="p-5 text-center">
                                                    {getStatusBadge(leave.status)}
                                                </td>
                                                {isAdmin && (
                                                    <td className="p-5 text-right">
                                                        {leave.status === 'Pending' ? (
                                                            <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleAction(leave, 'Approved')}
                                                                    disabled={!!processingId}
                                                                    className="bg-green-600 hover:bg-green-700 text-white shadow-sm h-8 rounded-lg"
                                                                >
                                                                    {processingId === leave.id ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => handleAction(leave, 'Rejected')}
                                                                    disabled={!!processingId}
                                                                    className="shadow-sm h-8 rounded-lg"
                                                                >
                                                                    <X className="h-3 w-3 mr-1" />
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">
                                                                {leave.status} by Admin
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Dialog open={showAssignLeaveDialog} onOpenChange={setShowAssignLeaveDialog}>
                <DialogContent className="rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">Assign Leave to Staff</DialogTitle>
                        <DialogDescription>Manually approve a leave for an employee.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Employee</Label>
                            <Select
                                value={newLeave.employee_id}
                                onValueChange={(v) => setNewLeave(p => ({ ...p, employee_id: v }))}
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Select Staff Member" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Duration</Label>
                            <Select
                                value={newLeave.duration}
                                onValueChange={(v) => setNewLeave(p => ({ ...p, duration: v }))}
                            >
                                <SelectTrigger className="rounded-xl bg-muted/20 border-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="Full Day">Full Day</SelectItem>
                                    <SelectItem value="Half Day">Half Day</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                    value={newLeave.leave_type}
                                    onValueChange={(v) => setNewLeave(p => ({ ...p, leave_type: v }))}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="Casual">Casual</SelectItem>
                                        <SelectItem value="Sick">Sick</SelectItem>
                                        <SelectItem value="Paid">Paid</SelectItem>
                                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={newLeave.start_date}
                                    onChange={(e) => setNewLeave(p => ({ ...p, start_date: e.target.value, end_date: e.target.value }))}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Reason</Label>
                            <Input
                                value={newLeave.reason}
                                onChange={(e) => setNewLeave(p => ({ ...p, reason: e.target.value }))}
                                placeholder="e.g. Family Emergency"
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignLeaveDialog(false)} className="rounded-xl">Cancel</Button>
                        <Button onClick={handleAssignLeave} className="rounded-xl">Confirm & Assign</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
