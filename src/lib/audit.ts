/**
 * Audit Logging for Workforce Operations
 * Tracks all critical changes to attendance, shifts, and payroll
 */

import { supabase } from './supabase';

export type AuditAction =
    | 'attendance_create'
    | 'attendance_edit'
    | 'attendance_delete'
    | 'shift_create'
    | 'shift_edit'
    | 'shift_delete'
    | 'payroll_generate'
    | 'payroll_edit'
    | 'payroll_lock'
    | 'payroll_unlock';

export type AuditEntityType = 'attendance' | 'shift' | 'payroll';

export type AuditLogEntry = {
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    reason?: string;
    performedBy: string;
    outletId?: string;
};

/**
 * Log an attendance edit
 */
export async function logAttendanceEdit(params: {
    attendanceId: string;
    oldStatus: string;
    newStatus: string;
    reason: string;
    performedBy: string;
    outletId: string;
    oldCheckIn?: string;
    oldCheckOut?: string;
    newCheckIn?: string;
    newCheckOut?: string;
}) {
    const oldValue = {
        status: params.oldStatus,
        check_in: params.oldCheckIn,
        check_out: params.oldCheckOut
    };

    const newValue = {
        status: params.newStatus,
        check_in: params.newCheckIn,
        check_out: params.newCheckOut
    };

    return logAudit({
        action: 'attendance_edit',
        entityType: 'attendance',
        entityId: params.attendanceId,
        oldValue,
        newValue,
        reason: params.reason,
        performedBy: params.performedBy,
        outletId: params.outletId
    });
}

/**
 * Log an attendance deletion
 */
export async function logAttendanceDelete(params: {
    attendanceId: string;
    attendanceData: any;
    reason: string;
    performedBy: string;
    outletId: string;
}) {
    return logAudit({
        action: 'attendance_delete',
        entityType: 'attendance',
        entityId: params.attendanceId,
        oldValue: params.attendanceData,
        newValue: null,
        reason: params.reason,
        performedBy: params.performedBy,
        outletId: params.outletId
    });
}

/**
 * Log a shift change (create/edit/delete)
 */
export async function logShiftChange(params: {
    action: 'shift_create' | 'shift_edit' | 'shift_delete';
    shiftId: string;
    oldValue?: any;
    newValue?: any;
    reason?: string;
    performedBy: string;
    outletId: string;
}) {
    return logAudit({
        action: params.action,
        entityType: 'shift',
        entityId: params.shiftId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        reason: params.reason,
        performedBy: params.performedBy,
        outletId: params.outletId
    });
}

/**
 * Log a payroll action
 */
export async function logPayrollAction(params: {
    action: 'payroll_generate' | 'payroll_edit' | 'payroll_lock' | 'payroll_unlock';
    payrollId: string;
    oldValue?: any;
    newValue?: any;
    reason?: string;
    performedBy: string;
    outletId: string;
}) {
    return logAudit({
        action: params.action,
        entityType: 'payroll',
        entityId: params.payrollId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        reason: params.reason,
        performedBy: params.performedBy,
        outletId: params.outletId
    });
}

/**
 * Core audit logging function
 */
async function logAudit(entry: AuditLogEntry) {
    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                action: entry.action,
                entity_type: entry.entityType,
                entity_id: entry.entityId,
                old_value: entry.oldValue,
                new_value: entry.newValue,
                reason: entry.reason,
                performed_by: entry.performedBy,
                outlet_id: entry.outletId
            });

        if (error) {
            const err = error as { message?: string; code?: string; details?: string };
            const errMessage = err?.message ?? "Failed to log audit entry";
            const errCode = err?.code;
            const msg = (err?.message ?? "").toLowerCase();
            const isRLSError =
                errCode === "42501" ||
                errCode === "401" ||
                msg.includes("permission") ||
                msg.includes("row-level security");
            const message = isRLSError
                ? "Permission denied by system security rules. Please contact admin."
                : errMessage;

            if (process.env.NODE_ENV === "development" && !isRLSError) {
                console.error("Audit Log Error:", errMessage, { code: errCode, details: err?.details });
            }
            return { success: false, error: { ...error, message } };
        }

        return { success: true };
    } catch (err) {
        console.error('Audit logging error:', err);
        return { success: false, error: err };
    }
}

/**
 * Get audit trail for a specific entity
 */
export async function getAuditTrail(params: {
    entityType: AuditEntityType;
    entityId: string;
    limit?: number;
}) {
    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .select(`
        *,
        performed_by_employee:employees!audit_logs_workforce_performed_by_fkey(name, employee_id)
      `)
            .eq('entity_type', params.entityType)
            .eq('entity_id', params.entityId)
            .order('timestamp', { ascending: false })
            .limit(params.limit || 50);

        if (error) {
            console.error('Failed to fetch audit trail:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Audit trail fetch error:', err);
        return { data: null, error: err };
    }
}

/**
 * Get recent audit logs for an outlet
 */
export async function getRecentAuditLogs(params: {
    outletId: string;
    limit?: number;
    action?: AuditAction;
}) {
    try {
        let query = supabase
            .from('audit_logs')
            .select(`
        *,
        performed_by_employee:employees!audit_logs_workforce_performed_by_fkey(name, employee_id)
      `)
            .eq('outlet_id', params.outletId)
            .order('timestamp', { ascending: false });

        if (params.action) {
            query = query.eq('action', params.action);
        }

        const { data, error } = await query.limit(params.limit || 100);

        if (error) {
            console.error('Failed to fetch recent audit logs:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Recent audit logs fetch error:', err);
        return { data: null, error: err };
    }
}

/**
 * Format audit log for display
 */
export function formatAuditLog(log: any): string {
    const action = log.action.replace(/_/g, ' ').toUpperCase();
    const performedBy = log.performed_by_employee?.name || 'Unknown';
    const timestamp = new Date(log.timestamp).toLocaleString();

    let details = '';
    if (log.old_value && log.new_value) {
        details = `\nOld: ${JSON.stringify(log.old_value, null, 2)}\nNew: ${JSON.stringify(log.new_value, null, 2)}`;
    }

    const reason = log.reason ? `\nReason: ${log.reason}` : '';

    return `${action}\nBy: ${performedBy}\nAt: ${timestamp}${details}${reason}`;
}
