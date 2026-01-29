"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
  permissions: Record<string, boolean>;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
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
      setPermissions({ "*": true });
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
    return true;
  };

  const refreshPermissions = async () => {
    await fetchUserAndPermissions(true);
  };

  return (
    <AdminContext.Provider value={{
      user,
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
