/**
 * Payroll Calculation Engine
 * Handles all salary calculations, deductions, and payroll generation
 */

import { format, getDaysInMonth } from 'date-fns';

export type PayrollCalculationInput = {
    baseSalary: number;
    totalWorkingDays: number;
    presentDays: number;
    leaveDays: number;
    halfDays: number;
    overtimeHours: number;
    overtimeRate: number; // per hour
    incentives?: number;
    bonus?: number;
    allowances?: number;
    advances?: number;
    otherDeductions?: number;
    lateMinutes?: number;
    latePenaltyRate?: number; // per minute
    unpaidLeaveDays?: number;
};

export type PayrollBreakdown = {
    // Earnings
    baseSalary: number;
    overtimeAmount: number;
    incentives: number;
    bonus: number;
    allowances: number;
    grossPay: number;

    // Deductions
    latePenalty: number;
    unpaidLeaveDeduction: number;
    advances: number;
    otherDeductions: number;
    totalDeductions: number;

    // Net
    netPay: number;

    // Summary
    totalWorkingDays: number;
    presentDays: number;
    leaveDays: number;
    halfDays: number;
    overtimeHours: number;
};

/**
 * Calculate overtime pay based on hours and rate
 */
export function calculateOvertimePay(overtimeHours: number, overtimeRate: number): number {
    return Math.round(overtimeHours * overtimeRate * 100) / 100;
}

/**
 * Calculate late penalty based on minutes and rate
 */
export function calculateLatePenalty(lateMinutes: number, latePenaltyRate: number = 0): number {
    if (!latePenaltyRate) return 0;
    return Math.round(lateMinutes * latePenaltyRate * 100) / 100;
}

/**
 * Calculate unpaid leave deduction
 * Formula: (base_salary / total_working_days) * unpaid_leave_days
 */
export function calculateUnpaidLeaveDeduction(
    baseSalary: number,
    totalWorkingDays: number,
    unpaidLeaveDays: number
): number {
    if (totalWorkingDays === 0 || unpaidLeaveDays === 0) return 0;
    const perDaySalary = baseSalary / totalWorkingDays;
    return Math.round(perDaySalary * unpaidLeaveDays * 100) / 100;
}

/**
 * Generate complete payroll breakdown
 */
export function generatePayrollBreakdown(input: PayrollCalculationInput): PayrollBreakdown {
    const overtimeAmount = calculateOvertimePay(input.overtimeHours, input.overtimeRate);
    const latePenalty = calculateLatePenalty(input.lateMinutes || 0, input.latePenaltyRate || 0);
    const unpaidLeaveDeduction = calculateUnpaidLeaveDeduction(
        input.baseSalary,
        input.totalWorkingDays,
        (input.unpaidLeaveDays || 0)
    );

    const incentives = input.incentives || 0;
    const bonus = input.bonus || 0;
    const allowances = input.allowances || 0;
    const advances = input.advances || 0;
    const otherDeductions = input.otherDeductions || 0;

    const grossPay = input.baseSalary + overtimeAmount + incentives + bonus + allowances;
    const totalDeductions = latePenalty + unpaidLeaveDeduction + advances + otherDeductions;
    const netPay = Math.max(0, grossPay - totalDeductions);

    return {
        baseSalary: input.baseSalary,
        overtimeAmount,
        incentives,
        bonus,
        allowances,
        grossPay: Math.round(grossPay * 100) / 100,
        latePenalty,
        unpaidLeaveDeduction,
        advances,
        otherDeductions,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        netPay: Math.round(netPay * 100) / 100,
        totalWorkingDays: input.totalWorkingDays,
        presentDays: input.presentDays,
        leaveDays: input.leaveDays,
        halfDays: input.halfDays,
        overtimeHours: input.overtimeHours,
    };
}
