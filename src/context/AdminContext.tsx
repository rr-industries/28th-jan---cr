"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Outlet = {
  id: string;
  name: string;
  address: string;
  phone: string;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_super_admin: boolean;
  employee_id?: string;
};

type AdminContextType = {
  user: AdminUser | null;
  selectedOutlet: Outlet | null;
  permissions: Record<string, boolean>;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchUserAndPermissions = useCallback(async (force = false) => {
    if (loading && !force && user) return;
    setLoading(true);
    try {
      const empSessionStr = localStorage.getItem('employee_session');
      if (!empSessionStr) {
        setUser(null);
        setLoading(false);
        return;
      }

      const empSession = JSON.parse(empSessionStr);
      const currentUserData: AdminUser = {
        id: empSession.id,
        email: `${empSession.employee_id}@internal`,
        name: empSession.name,
        role: empSession.role,
        is_super_admin: empSession.role === 'Super Admin',
        employee_id: empSession.employee_id
      };

      setUser(currentUserData);

      const { data: outlets } = await supabase.from("outlets").select("*").limit(1);
      if (outlets && outlets.length > 0) {
        setSelectedOutlet(outlets[0]);
        setPermissions({ "*": true });
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserAndPermissions();
  }, [fetchUserAndPermissions]);

  const hasPermission = (permissionKey: string) => {
    return true; // Simplified for single-outlet CAFE REPUBLIC
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
