-- ========================================
-- RLS POLICIES FOR PAYROLL TABLE
-- ========================================
-- This migration creates Row Level Security policies for the payroll table
-- to ensure only authorized users can access and modify payroll data.

-- Enable RLS on payroll table
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLICY 1: Super Admin - Full Access
-- ========================================
-- Super Admins can do everything (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "super_admin_full_access_payroll"
ON payroll
FOR ALL
TO authenticated
USING (
    -- Check if user is super admin by looking up their role
    EXISTS (
        SELECT 1 FROM employees
        WHERE employees.id = auth.uid()
        AND employees.role IN ('Super Admin', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees
        WHERE employees.id = auth.uid()
        AND employees.role IN ('Super Admin', 'super_admin')
    )
);

-- ========================================
-- POLICY 2: Admin/Manager - Read Only
-- ========================================
-- Admins and Managers can view payroll for their outlet
CREATE POLICY "admin_manager_read_payroll"
ON payroll
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM employees
        WHERE employees.id = auth.uid()
        AND employees.role IN ('Admin', 'Manager', 'admin', 'manager')
        AND employees.outlet_id = payroll.outlet_id
    )
);

-- ========================================
-- POLICY 3: Employee - View Own Payroll
-- ========================================
-- Employees can only view their own payroll records
CREATE POLICY "employee_view_own_payroll"
ON payroll
FOR SELECT
TO authenticated
USING (
    payroll.employee_id = auth.uid()
);

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON POLICY "super_admin_full_access_payroll" ON payroll IS 
'Super Admins have full CRUD access to all payroll records';

COMMENT ON POLICY "admin_manager_read_payroll" ON payroll IS 
'Admins and Managers can view payroll records for their outlet only';

COMMENT ON POLICY "employee_view_own_payroll" ON payroll IS 
'Employees can view only their own payroll records';
