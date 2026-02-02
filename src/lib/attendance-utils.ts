/**
 * Attendance Utilities
 * Helper functions for attendance validation, date checks, and permissions
 */

import { format, isAfter, startOfDay, getDaysInMonth } from 'date-fns';

export type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Half Day' | 'Unpaid Leave';

export type MonthlyAttendanceSummary = {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    halfDays: number;
    unpaidLeaveDays: number;
    overtimeHours: number;
    lateMinutes: number;
};

/**
 * Check if a date is in the future
 */
export function isDateInFuture(date: Date): boolean {
    const today = startOfDay(new Date());
    const checkDate = startOfDay(date);
    return isAfter(checkDate, today);
}

/**
 * Check if user can edit attendance for a given date
 */
export function canEditAttendance(
    userRole: string,
    date: Date,
    isLocked: boolean = false
): { allowed: boolean; reason?: string } {
    if (isDateInFuture(date)) {
        return { allowed: false, reason: 'Attendance cannot be marked beyond today' };
    }

    if (isLocked) {
        return { allowed: false, reason: 'This attendance record is locked' };
    }

    // Role-based check
    const normalizedRole = userRole?.toLowerCase();
    if (normalizedRole !== 'super admin' && normalizedRole !== 'super_admin') {
        return { allowed: false, reason: 'Only Super Admin can override attendance' };
    }

    return { allowed: true };
}

/**
 * Get monthly attendance summary from attendance records
 */
export function getMonthlyAttendanceSummary(
    attendanceRecords: Array<{
        date: string;
        status: string;
        overtime_hours?: number;
        late_minutes?: number;
    }>,
    month: Date
): MonthlyAttendanceSummary {
    const totalDays = getDaysInMonth(month);
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let halfDays = 0;
    let unpaidLeaveDays = 0;
    let overtimeHours = 0;
    let lateMinutes = 0;

    attendanceRecords.forEach(record => {
        const rawStatus = record.status || '';
        const status = rawStatus.toLowerCase().replace(/\s+/g, '');

        if (status === 'present') presentDays++;
        else if (status === 'absent') absentDays++;
        else if (status === 'leave') leaveDays++;
        else if (status === 'halfday') halfDays++;
        else if (status === 'unpaidleave') unpaidLeaveDays++;

        overtimeHours += record.overtime_hours || 0;
        lateMinutes += record.late_minutes || 0;
    });

    return {
        totalDays,
        presentDays,
        absentDays,
        leaveDays,
        halfDays,
        unpaidLeaveDays,
        overtimeHours,
        lateMinutes
    };
}

/**
 * Check if user can delete attendance
 */
export function canDeleteAttendance(userRole: string, isLocked: boolean = false): { allowed: boolean; reason?: string } {
    if (isLocked) {
        return { allowed: false, reason: 'This attendance record is locked' };
    }

    const normalizedRole = userRole?.toLowerCase();
    if (normalizedRole !== 'super admin' && normalizedRole !== 'super_admin') {
        return { allowed: false, reason: 'Only Super Admin can delete attendance' };
    }

    return { allowed: true };
}

/**
 * Validate attendance edit parameters
 */
export function validateAttendanceEdit(params: {
    date: Date;
    status: AttendanceStatus;
    reason: string;
}): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (isDateInFuture(params.date)) {
        errors.push('Cannot mark attendance for future dates');
    }

    if (!params.reason || params.reason.trim().length < 5) {
        errors.push('A valid reason (min 5 chars) is required');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get background color class for attendance status
 */
export function getAttendanceStatusColor(status: string): string {
    const s = status?.toLowerCase().replace(/\s+/g, '');
    switch (s) {
        case 'present': return 'bg-green-600';
        case 'absent': return 'bg-red-600';
        case 'halfday': return 'bg-yellow-600';
        case 'leave': return 'bg-blue-600';
        case 'unpaidleave': return 'bg-red-800';
        default: return 'bg-gray-400';
    }
}

/**
 * Get text color class for attendance status
 */
export function getAttendanceStatusTextColor(status: string): string {
    const s = status?.toLowerCase().replace(/\s+/g, '');
    switch (s) {
        case 'present': return 'text-green-700';
        case 'absent': return 'text-red-700';
        case 'halfday': return 'text-yellow-700';
        case 'leave': return 'text-blue-700';
        case 'unpaidleave': return 'text-red-900';
        default: return 'text-gray-700';
    }
}

/**
 * Get working days in a month (excluding Sundays by default)
 */
export function getWorkingDaysInMonth(month: Date, excludeDays: number[] = [0]): number {
    const totalDays = getDaysInMonth(month);
    let workingDays = 0;

    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(month.getFullYear(), month.getMonth(), day);
        const dayOfWeek = date.getDay();

        if (!excludeDays.includes(dayOfWeek)) {
            workingDays++;
        }
    }

    return workingDays;
}
