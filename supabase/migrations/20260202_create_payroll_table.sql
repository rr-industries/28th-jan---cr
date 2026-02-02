-- Create payroll table for monthly salary records
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of the month (YYYY-MM-01)
    
    -- Attendance metrics
    total_working_days INTEGER NOT NULL DEFAULT 0,
    present_days INTEGER NOT NULL DEFAULT 0,
    leave_days INTEGER NOT NULL DEFAULT 0,
    half_days INTEGER NOT NULL DEFAULT 0,
    overtime_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Earnings
    base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    overtime_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    incentives DECIMAL(12, 2) NOT NULL DEFAULT 0,
    bonus DECIMAL(12, 2) NOT NULL DEFAULT 0,
    allowances DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Deductions
    late_penalty DECIMAL(12, 2) NOT NULL DEFAULT 0,
    unpaid_leave_deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,
    advances DECIMAL(12, 2) NOT NULL DEFAULT 0,
    other_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Totals
    gross_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
    net_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Status and locking
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Paid, Cancelled
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by UUID REFERENCES employees(id),
    
    -- Audit
    generated_by UUID NOT NULL REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_employee_month UNIQUE (employee_id, month),
    CONSTRAINT positive_amounts CHECK (
        base_salary >= 0 AND
        overtime_amount >= 0 AND
        incentives >= 0 AND
        bonus >= 0 AND
        allowances >= 0 AND
        late_penalty >= 0 AND
        unpaid_leave_deduction >= 0 AND
        advances >= 0 AND
        other_deductions >= 0
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_outlet ON payroll(outlet_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll(month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(payment_status);
CREATE INDEX IF NOT EXISTS idx_payroll_locked ON payroll(is_locked);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_payroll_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payroll_updated_at
    BEFORE UPDATE ON payroll
    FOR EACH ROW
    EXECUTE FUNCTION update_payroll_updated_at();

-- Comments
COMMENT ON TABLE payroll IS 'Monthly payroll records with comprehensive salary breakdown';
COMMENT ON COLUMN payroll.month IS 'First day of the month for this payroll period';
COMMENT ON COLUMN payroll.is_locked IS 'Prevents editing when true';
COMMENT ON COLUMN payroll.payment_status IS 'Payment status: Pending, Paid, or Cancelled';
