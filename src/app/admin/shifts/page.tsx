"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/context/AdminContext";
import {
    Clock,
    Plus,
    Edit2,
    Trash2,
    LoaderCircle,
    AlertCircle,
    CheckCircle2
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { logShiftChange } from "@/lib/audit";

type Shift = {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    break_duration: number;
    is_active: boolean;
    outlet_id: string;
    created_at: string;
};

export default function ShiftsPage() {
    const { user, selectedOutlet } = useAdmin();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("18:00");
    const [breakDuration, setBreakDuration] = useState("60");

    const isSuperAdmin = user?.role === 'Super Admin';

    useEffect(() => {
        fetchShifts();
    }, [selectedOutlet]);

    const fetchShifts = async () => {
        setLoading(true);
        let query = supabase
            .from("shifts")
            .select("*")
            .is("deleted_at", null)
            .order("name");

        if (!user?.is_super_admin && selectedOutlet) {
            query = query.eq("outlet_id", selectedOutlet.id);
        }

        const { data } = await query;
        if (data) setShifts(data);
        setLoading(false);
    };

    const handleOpenModal = (shift?: Shift) => {
        if (!isSuperAdmin) {
            toast.error("Only Super Admin can manage shifts");
            return;
        }

        if (shift) {
            setEditingShift(shift);
            setName(shift.name);
            setStartTime(shift.start_time.substring(0, 5));
            setEndTime(shift.end_time.substring(0, 5));
            setBreakDuration(shift.break_duration.toString());
        } else {
            setEditingShift(null);
            setName("");
            setStartTime("09:00");
            setEndTime("18:00");
            setBreakDuration("60");
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!user || !selectedOutlet) return;

        // Validation
        if (!name.trim()) {
            toast.error("Shift name is required");
            return;
        }

        if (startTime >= endTime) {
            toast.error("End time must be after start time");
            return;
        }

        setSubmitting(true);

        try {
            const shiftData = {
                name: name.trim(),
                start_time: startTime,
                end_time: endTime,
                break_duration: parseInt(breakDuration) || 0,
                outlet_id: selectedOutlet.id,
                is_active: true
            };

            if (editingShift) {
                // Update
                const { error } = await supabase
                    .from("shifts")
                    .update(shiftData)
                    .eq("id", editingShift.id);

                if (error) throw error;

                // Log the edit
                await logShiftChange({
                    action: "shift_edit",
                    shiftId: editingShift.id,
                    oldValue: editingShift,
                    newValue: shiftData,
                    reason: "Shift details updated",
                    performedBy: user.id,
                    outletId: selectedOutlet.id
                });

                toast.success("Shift updated successfully");
            } else {
                // Create
                const { data, error } = await supabase
                    .from("shifts")
                    .insert(shiftData)
                    .select()
                    .single();

                if (error) throw error;

                // Log the creation
                if (data) {
                    await logShiftChange({
                        action: "shift_create",
                        shiftId: data.id,
                        newValue: shiftData,
                        reason: "New shift created",
                        performedBy: user.id,
                        outletId: selectedOutlet.id
                    });
                }

                toast.success("Shift created successfully");
            }

            setShowModal(false);
            fetchShifts();
        } catch (error: any) {
            console.error("Error saving shift:", error);
            toast.error(error.message || "Failed to save shift");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (shift: Shift) => {
        if (!isSuperAdmin) {
            toast.error("Only Super Admin can delete shifts");
            return;
        }

        if (!confirm(`Are you sure you want to delete the shift "${shift.name}"?`)) {
            return;
        }

        const reason = prompt("Please provide a reason for deletion:");
        if (!reason || reason.trim().length < 5) {
            toast.error("Deletion reason must be at least 5 characters");
            return;
        }

        try {
            // Soft delete
            const { error } = await supabase
                .from("shifts")
                .update({
                    deleted_at: new Date().toISOString(),
                    deleted_by: user?.id,
                    delete_reason: reason,
                    is_active: false
                })
                .eq("id", shift.id);

            if (error) throw error;

            // Log the deletion
            await logShiftChange({
                action: "shift_delete",
                shiftId: shift.id,
                oldValue: shift,
                reason,
                performedBy: user?.id || "",
                outletId: selectedOutlet?.id || ""
            });

            toast.success("Shift deleted successfully");
            fetchShifts();
        } catch (error: any) {
            console.error("Error deleting shift:", error);
            toast.error(error.message || "Failed to delete shift");
        }
    };

    const calculateDuration = (start: string, end: string, breakMin: number) => {
        const [startH, startM] = start.split(":").map(Number);
        const [endH, endM] = end.split(":").map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const totalMinutes = endMinutes - startMinutes - breakMin;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold tracking-tight">Shift Management</h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
                        <Clock className="h-4 w-4 text-primary" />
                        Manage employee work shifts
                    </p>
                </div>
                {isSuperAdmin && (
                    <Button
                        onClick={() => handleOpenModal()}
                        className="h-12 rounded-2xl font-bold shadow-lg shadow-primary/20"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Add Shift
                    </Button>
                )}
            </div>

            {/* Shifts Grid */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : shifts.length === 0 ? (
                <Card className="rounded-[2rem] border-2 shadow-lg">
                    <CardContent className="p-12 text-center">
                        <Clock className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-muted-foreground mb-2">No Shifts Found</h3>
                        <p className="text-sm text-muted-foreground">
                            {isSuperAdmin ? "Create your first shift to get started" : "No shifts have been configured yet"}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shifts.map(shift => (
                        <Card key={shift.id} className="rounded-[2rem] border-2 shadow-lg hover:border-primary/30 transition-all">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl font-bold">{shift.name}</CardTitle>
                                        <Badge variant={shift.is_active ? "secondary" : "destructive"} className="mt-2 rounded-full">
                                            {shift.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                    {isSuperAdmin && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleOpenModal(shift)}
                                                className="h-10 w-10 rounded-xl"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => handleDelete(shift)}
                                                className="h-10 w-10 rounded-xl"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                    <span className="text-sm font-bold text-muted-foreground">Start Time</span>
                                    <span className="text-lg font-bold">{shift.start_time.substring(0, 5)}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                    <span className="text-sm font-bold text-muted-foreground">End Time</span>
                                    <span className="text-lg font-bold">{shift.end_time.substring(0, 5)}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                    <span className="text-sm font-bold text-muted-foreground">Break</span>
                                    <span className="text-lg font-bold">{shift.break_duration} min</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border-2 border-primary/10">
                                    <span className="text-sm font-bold text-primary">Duration</span>
                                    <span className="text-lg font-bold text-primary">
                                        {calculateDuration(shift.start_time, shift.end_time, shift.break_duration)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit/Create Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">
                            {editingShift ? "Edit Shift" : "Create New Shift"}
                        </DialogTitle>
                        <DialogDescription>
                            Configure shift timings and break duration
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div>
                            <Label className="text-sm font-bold">Shift Name *</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Morning Shift, Night Shift"
                                className="h-12 rounded-xl mt-2"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm font-bold">Start Time *</Label>
                                <Input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="h-12 rounded-xl mt-2"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-bold">End Time *</Label>
                                <Input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="h-12 rounded-xl mt-2"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-bold">Break Duration (minutes)</Label>
                            <Input
                                type="number"
                                value={breakDuration}
                                onChange={(e) => setBreakDuration(e.target.value)}
                                placeholder="60"
                                min="0"
                                className="h-12 rounded-xl mt-2"
                            />
                        </div>

                        {startTime && endTime && (
                            <div className="p-4 bg-primary/5 rounded-xl border-2 border-primary/10">
                                <p className="text-sm font-bold text-muted-foreground mb-1">Total Duration</p>
                                <p className="text-2xl font-bold text-primary">
                                    {calculateDuration(startTime, endTime, parseInt(breakDuration) || 0)}
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowModal(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={submitting}
                            className="rounded-xl"
                        >
                            {submitting ? (
                                <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            {editingShift ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
