"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/context/AdminContext";
import { format } from "date-fns";
import {
    Check,
    X,
    LoaderCircle,
    Calendar,
    Filter,
    FileText,
    ArrowRight,
    Plus,
    UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type LeaveRequest = {
    id: string;
    employee_id: string;
    type: string;
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

    // Generic Leave State
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [dialogMode, setDialogMode] = useState<'apply' | 'assign'>('apply');
    const [employeesList, setEmployeesList] = useState<any[]>([]);
    const [newLeave, setNewLeave] = useState({
        employee_id: "",
        type: "Casual",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(new Date(), "yyyy-MM-dd"),
        reason: ""
    });

    const isAdmin = user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "super_admin" || user?.role?.toLowerCase() === "manager";

    useEffect(() => {
        if (user) {
            fetchLeaves();
            if (isAdmin) fetchEmployees();
        }
    }, [user, selectedOutlet, filterStatus]);

    const fetchEmployees = async () => {
        let query = supabase
            .from("employees")
            .select("id, name")
            .eq('is_active', true);

        if (!user?.is_super_admin && selectedOutlet) {
            query = query.eq("outlet_id", selectedOutlet.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching employees:", error);
        } else {
            setEmployeesList(data || []);
        }
    };

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("leaves")
                .select(`
                    *,
                    employees!leaves_employee_id_fkey (
                        id,
                        name,
                        employee_id
                    )
                `);

            if (user?.is_super_admin) {
                // No filters for super admin
            } else if (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'manager') {
                // Since leaves might not have outlet_id directly, we filter by employee's outlet
                // For simplicity in this demo, if not super admin, we filter by employee_id for now 
                // OR we can join with employees to filter by outlet
                // Actually, the schema for leaves doesn't have outlet_id. 
                // We should probably rely on RLS anyway.
            }

            query = query.order("created_at", { ascending: false });

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
            console.error(error);
            toast.error("Failed to fetch leave requests");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (leave: LeaveRequest, action: 'Approved' | 'Rejected') => {
        if (!user) return;
        setProcessingId(leave.id);

        try {
            const { error: updateError } = await supabase
                .from("leaves")
                .update({
                    status: action,
                    approved_by: action === 'Approved' ? user.id : null,
                    updated_at: new Date().toISOString()
                })
                .eq("id", leave.id);

            if (updateError) throw updateError;

            // NOTE: Attendance synchronization is now handled by the database trigger 'sync_leave_to_attendance'
            // No manual upsert needed here. 

            toast.success(`Leave ${action} successfully`);
            fetchLeaves();
        } catch (error) {
            console.error(error);
            toast.error("Failed to process request");
        } finally {
            setProcessingId(null);
        }
    };

    const handleLeaveSubmit = async () => {
        if (!newLeave.employee_id || !newLeave.reason) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            const isAssigning = dialogMode === 'assign';
            const { error } = await supabase
                .from("leaves")
                .insert({
                    employee_id: newLeave.employee_id,
                    type: newLeave.type,
                    start_date: newLeave.start_date,
                    end_date: newLeave.end_date,
                    reason: newLeave.reason,
                    status: isAssigning ? 'Approved' : 'Pending',
                    approved_by: isAssigning ? user?.id : null,
                    outlet_id: selectedOutlet?.id
                });

            if (error) throw error;

            toast.success(isAssigning ? "Leave assigned successfully" : "Leave request submitted");
            setShowLeaveDialog(false);
            fetchLeaves();

            setNewLeave({
                employee_id: user?.id || "",
                type: "Casual",
                start_date: format(new Date(), "yyyy-MM-dd"),
                end_date: format(new Date(), "yyyy-MM-dd"),
                reason: ""
            });
        } catch (e: any) {
            const isRLSError = Object.keys(e || {}).length === 0 || e.code === '42501';
            const message = isRLSError
                ? "Permission denied by system security rules. Please contact admin."
                : e.message || "Failed to submit leave";

            console.error("Leave submission error:", { error: e?.toString?.() || e, isRLSError, message });
            toast.error(message);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Approved':
                return <Badge className="bg-green-100/80 text-green-700 hover:bg-green-200 border-green-200 px-3 py-1 rounded-full">Approved</Badge>;
            case 'Rejected':
                return <Badge className="bg-red-100/80 text-red-700 hover:bg-red-200 border-red-200 px-3 py-1 rounded-full">Rejected</Badge>;
            case 'Pending':
                return <Badge className="bg-yellow-100/80 text-yellow-700 hover:bg-yellow-200 border-yellow-200 px-3 py-1 rounded-full animate-pulse">Pending</Badge>;
            default:
                return <Badge variant="outline" className="rounded-full px-3 py-1">{status}</Badge>;
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
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pb-20 max-w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl shadow-inner">
                            <FileText className="h-7 w-7 text-primary" />
                        </div>
                        Leave Management
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">
                        {isAdmin ? "Centralized hub for staff leave approvals and tracking" : "Monitor your leave history and application status"}
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border shadow-sm self-start md:self-center">
                    <div className="flex items-center gap-2 px-2 border-r pr-4">
                        <Filter className="h-4 w-4 text-primary" />
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="border-0 bg-transparent h-8 w-[140px] focus:ring-0 font-bold p-0">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-2">
                                <SelectItem value="all">All Requests</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Approved">Approved</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {isAdmin ? (
                        <Button
                            onClick={() => {
                                setDialogMode('assign');
                                setShowLeaveDialog(true);
                            }}
                            className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold h-10"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Assign Leave
                        </Button>
                    ) : (
                        <Button
                            onClick={() => {
                                setDialogMode('apply');
                                setNewLeave(p => ({ ...p, employee_id: user?.id || "" }));
                                setShowLeaveDialog(true);
                            }}
                            className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold h-10"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Apply for Leave
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6">
                {leaves.length === 0 ? (
                    <Card className="rounded-[3rem] border-2 border-dashed bg-muted/5 p-16 flex flex-col items-center justify-center text-center">
                        <div className="p-4 bg-muted/20 rounded-full mb-6">
                            <Calendar className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-xl font-bold text-muted-foreground">No records to display</h3>
                        <p className="text-muted-foreground/70 max-w-sm mt-2">
                            {isAdmin ? "All staff leave requests will be centralized here for your approval." : "Apply for leaves to see them tracked in this dashboard."}
                        </p>
                    </Card>
                ) : (
                    <Card className="rounded-[2.5rem] overflow-hidden border-2 shadow-xl bg-white/80 backdrop-blur-md">
                        <CardContent className="p-0">
                            <div className="rounded-[2rem] border-2 shadow-lg bg-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-primary/5 border-b-2">
                                            <tr>
                                                {isAdmin && <th className="text-left p-6 font-bold text-xs uppercase tracking-widest text-primary/70">Employee</th>}
                                                <th className="text-left p-6 font-bold text-xs uppercase tracking-widest text-primary/70">Leave Type</th>
                                                <th className="text-left p-6 font-bold text-xs uppercase tracking-widest text-primary/70">Duration</th>
                                                <th className="text-left p-6 font-bold text-xs uppercase tracking-widest text-primary/70">Reason</th>
                                                <th className="text-left p-6 font-bold text-xs uppercase tracking-widest text-primary/70">Applied On</th>
                                                <th className="text-center p-6 font-bold text-xs uppercase tracking-widest text-primary/70">Status</th>
                                                {isAdmin && <th className="text-right p-6 font-bold text-xs uppercase tracking-widest text-primary/70">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y border-t">
                                            {leaves.map((leave) => (
                                                <tr key={leave.id} className="hover:bg-primary/5 transition-all duration-300 group">
                                                    {isAdmin && (
                                                        <td className="p-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                                    {leave.employees?.name?.charAt(0)}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm text-foreground">{leave.employees?.name}</span>
                                                                    <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-tighter">ID: {leave.employees?.employee_id}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="p-6">
                                                        <span className={cn(
                                                            "font-bold text-xs px-3 py-1.5 rounded-lg border",
                                                            leave.type === 'Paid' ? "bg-green-50 text-green-700 border-green-100" :
                                                                leave.type === 'Unpaid' ? "bg-red-50 text-red-700 border-red-100" :
                                                                    "bg-blue-50 text-blue-700 border-blue-100"
                                                        )}>
                                                            {leave.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm flex items-center gap-2">
                                                                {format(new Date(leave.start_date), "MMM dd")}
                                                                <ArrowRight className="h-3 w-3 text-primary animate-pulse" />
                                                                {format(new Date(leave.end_date), "MMM dd")}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full mt-1.5 self-start">
                                                                {calculateDays(leave.start_date, leave.end_date)} Days
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 max-w-[200px]">
                                                        <p className="text-sm text-muted-foreground font-medium truncate" title={leave.reason}>
                                                            {leave.reason}
                                                        </p>
                                                    </td>
                                                    <td className="p-6 text-sm font-medium text-muted-foreground">
                                                        {format(new Date(leave.created_at), "MMM dd, yyyy")}
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        {getStatusBadge(leave.status)}
                                                    </td>
                                                    {isAdmin && (
                                                        <td className="p-6 text-right">
                                                            {leave.status === 'Pending' ? (
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleAction(leave, 'Approved')}
                                                                        disabled={!!processingId}
                                                                        className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-100 h-9 rounded-xl font-bold px-4"
                                                                    >
                                                                        {processingId === leave.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                                                                        Approve
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleAction(leave, 'Rejected')}
                                                                        disabled={!!processingId}
                                                                        className="border-red-200 text-red-600 hover:bg-red-50 h-9 rounded-xl font-bold px-4"
                                                                    >
                                                                        <X className="h-4 w-4 mr-1.5" />
                                                                        Reject
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground font-bold">
                                                                    <UserCircle className="h-3.5 w-3.5" />
                                                                    Finalized
                                                                </div>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <DialogContent className="rounded-[2.5rem] border-4 shadow-2xl p-8 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-3xl font-bold text-foreground">
                            {dialogMode === 'assign' ? "Assign Leave" : "Request Leave"}
                        </DialogTitle>
                        <DialogDescription className="text-base font-medium">
                            {dialogMode === 'assign' ? "Manually approve a leave period for an employee." : "Apply for a leave period. This will require manager approval."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6 border-y my-2">
                        {isAdmin && dialogMode === 'assign' && (
                            <div className="space-y-2.5">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Staff Member</Label>
                                <Select
                                    value={newLeave.employee_id}
                                    onValueChange={(v) => setNewLeave(p => ({ ...p, employee_id: v }))}
                                >
                                    <SelectTrigger className="rounded-2xl h-12 border-2 focus:ring-4 transition-all pr-4">
                                        <SelectValue placeholder="Select Staff Member" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-2">
                                        {employeesList.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id} className="rounded-lg">{emp.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2.5">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Leave Type</Label>
                                <Select
                                    value={newLeave.type}
                                    onValueChange={(v) => setNewLeave(p => ({ ...p, type: v }))}
                                >
                                    <SelectTrigger className="rounded-2xl h-12 border-2 focus:ring-4 transition-all">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-2">
                                        <SelectItem value="Paid" className="rounded-lg">Paid Leave</SelectItem>
                                        <SelectItem value="Sick" className="rounded-lg">Sick Leave</SelectItem>
                                        <SelectItem value="Casual" className="rounded-lg">Casual Leave</SelectItem>
                                        <SelectItem value="Medical" className="rounded-lg">Medical Leave</SelectItem>
                                        <SelectItem value="Unpaid" className="rounded-lg">Unpaid Leave</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2.5 flex flex-col justify-end">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Initial Status</Label>
                                <Badge className={cn(
                                    "h-12 w-full justify-center border-2 rounded-2xl font-bold",
                                    dialogMode === 'assign' ? "bg-green-50 text-green-700 border-green-100" : "bg-yellow-50 text-yellow-700 border-yellow-100"
                                )}>
                                    {dialogMode === 'assign' ? "Approved" : "Pending Approval"}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2.5">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Start Date</Label>
                                <Input
                                    type="date"
                                    value={newLeave.start_date}
                                    onChange={(e) => setNewLeave(p => ({ ...p, start_date: e.target.value }))}
                                    className="rounded-2xl h-12 border-2 focus:ring-4 transition-all"
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">End Date</Label>
                                <Input
                                    type="date"
                                    value={newLeave.end_date}
                                    onChange={(e) => setNewLeave(p => ({ ...p, end_date: e.target.value }))}
                                    className="rounded-2xl h-12 border-2 focus:ring-4 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Official Reason</Label>
                            <Input
                                value={newLeave.reason}
                                onChange={(e) => setNewLeave(p => ({ ...p, reason: e.target.value }))}
                                placeholder="e.g. Annual Family Vacation"
                                className="rounded-2xl h-12 border-2 focus:ring-4 transition-all px-4"
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button variant="ghost" onClick={() => setShowLeaveDialog(false)} className="rounded-2xl font-bold h-12 px-6">Cancel</Button>
                        <Button onClick={handleLeaveSubmit} className="rounded-2xl font-bold h-12 px-8 bg-primary hover:bg-primary shadow-lg shadow-primary/20">
                            {dialogMode === 'assign' ? "Confirm & Sync Attendance" : "Submit Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
