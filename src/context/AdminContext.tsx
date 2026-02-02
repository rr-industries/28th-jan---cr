"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_super_admin: boolean;
  employee_id?: string;
  base_salary?: number;
  overtime_rate?: number;
  joining_date?: string;
  employment_type?: string;
  salary_type?: string;
  leave_balance?: number;
  phone?: string;
};

type AdminContextType = {
  user: AdminUser | null;
  selectedOutlet: { id: string; name: string } | null;
  permissions: Record<string, boolean>;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<{ id: string; name: string } | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchUserAndPermissions = useCallback(async (force = false) => {
    // Prevent redundant fetches
    if (loading && !force && user) return;

    setLoading(true);
    try {
      // 1. Get Supabase Auth Session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // Fallback to legacy local session during migration if needed
        const empSessionStr = typeof window !== "undefined" ? localStorage.getItem('employee_session') : null;
        if (!empSessionStr) {
          setUser(null);
          setSelectedOutlet(null);
          setLoading(false);
          return;
        }

        // Legacy path (to avoid blocking users before they re-login)
        const empSession = JSON.parse(empSessionStr);
        setUser({
          id: empSession.id,
          email: empSession.email || `${empSession.employee_id}@internal`,
          name: empSession.name,
          role: empSession.role,
          is_super_admin: empSession.role === 'super_admin' || empSession.role === 'Super Admin',
          employee_id: empSession.employee_id
        });

        // Fetch outlet for legacy
        if (empSession.outlet_id) await fetchOutlet(empSession.outlet_id);
        setPermissions({ "*": true });
        setLoading(false);
        return;
      }

      // 2. We have a valid Supabase Auth session, fetch the linked employee
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*, outlets(id, name)')
        .eq('auth_user_id', session.user.id)
        .single();

      if (empError || !empData) {
        console.warn("Auth user found but no linked employee record:", session.user.id);
        setUser(null);
        setLoading(false);
        return;
      }

      const currentUserData: AdminUser = {
        id: empData.id,
        email: session.user.email || empData.email,
        name: empData.name,
        role: empData.role,
        is_super_admin: empData.role === 'super_admin' || empData.role === 'Super Admin',
        employee_id: empData.employee_id,
        base_salary: empData.base_salary,
        overtime_rate: empData.overtime_rate,
        joining_date: empData.joining_date,
        employment_type: empData.employment_type,
        salary_type: empData.salary_type,
        leave_balance: empData.leave_balance,
        phone: empData.phone
      };

      setUser(currentUserData);

      // Check for manually selected outlet in session or default to employee's outlet
      const savedOutletId = localStorage.getItem('selected_outlet_id') || empData.outlet_id;
      if (savedOutletId) {
        await fetchOutlet(savedOutletId);
      } else {
        setSelectedOutlet(null);
      }

      setPermissions({ "*": true });

      // Log login to audit trail if first time in session
      const loginLoggedKey = `login_logged_${empData.id}_${format(new Date(), "yyyy-MM-dd")}`;
      if (!sessionStorage.getItem(loginLoggedKey)) {
        await logLogin(empData.id, empData.employee_id, empData.role, empData.outlet_id);
        sessionStorage.setItem(loginLoggedKey, 'true');
      }

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOutlet = async (outletId: string) => {
    try {
      const { data: outletData, error: outletError } = await supabase
        .from('outlets')
        .select('id, name')
        .eq('id', outletId)
        .single();

      if (outletData && !outletError) {
        setSelectedOutlet(outletData);
        localStorage.setItem('selected_outlet_id', outletId);
      }
    } catch (e) {
      console.error("Error fetching outlet:", e);
    }
  };

  const logLogin = async (id: string, empId: string, role: string, outletId: string | null) => {
    try {
      await supabase.from('audit_logs').insert({
        action: 'ADMIN_LOGIN',
        target: 'Authentication',
        metadata: {
          employee_id: empId,
          role: role,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          auth_type: 'Supabase Auth'
        },
        performed_by: id,
        outlet_id: outletId,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchUserAndPermissions();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserAndPermissions(true);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSelectedOutlet(null);
        localStorage.removeItem('employee_session');
        localStorage.removeItem('selected_outlet_id');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserAndPermissions]);

  const hasPermission = (permissionKey: string) => {
    // Simple full access for now, can be expanded
    return true;
  };

  const refreshPermissions = async () => {
    await fetchUserAndPermissions(true);
  };

  return (
    <AdminContext.Provider value={{
      user,
      selectedOutlet,
      permissions,
      hasPermission,
      loading,
      refreshPermissions
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
