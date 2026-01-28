"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { supabase } from "@/lib/supabase";
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Lock, 
  Eye, 
  EyeOff,
  LoaderCircle,
  Check,
  Edit2,
  Phone,
  Save,
  X,
  BadgeCheck,
  Hash,
  Building2,
  Briefcase,
  Clock,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type EmployeeSession = {
  id: string;
  employee_id: string;
  name: string;
  role: string;
  logged_in_at: string;
};

type AdminProfile = {
  id: string;
  auth_user_id?: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  phone?: string;
};

type EmployeeProfile = {
  id: string;
  employee_id: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  email?: string;
  phone?: string;
  joining_date?: string;
  employment_type?: string;
  shift_type?: string;
  base_salary?: number;
  salary_type?: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [isEmployeeLogin, setIsEmployeeLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const storedSession = localStorage.getItem('employee_session');
    
    if (storedSession) {
      try {
        const empSession: EmployeeSession = JSON.parse(storedSession);
        setIsEmployeeLogin(true);
        
        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("id", empSession.id)
          .single();
        
        if (employee) {
          setEmployeeProfile(employee);
          setEditForm({
            name: employee.name || "",
            phone: employee.phone || ""
          });
        }
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('employee_session');
      }
    }

    const browserSupabase = createClient();
    const { data: { user } } = await browserSupabase.auth.getUser();
    
    if (user) {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (adminUser) {
        setProfile(adminUser);
        setEditForm({
          name: adminUser.name || "",
          phone: adminUser.phone || ""
        });
      } else {
        setProfile({
          id: user.id,
          email: user.email || "",
          name: "Admin User",
          role: "super_admin",
          status: "active",
          created_at: user.created_at
        });
        setEditForm({
          name: "Admin User",
          phone: ""
        });
      }
    }
    setLoading(false);
  };

  const handleSaveEmployeeProfile = async () => {
    if (!employeeProfile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          name: editForm.name,
          phone: editForm.phone,
          updated_at: new Date().toISOString()
        })
        .eq("id", employeeProfile.id);

      if (error) throw error;

      setEmployeeProfile(prev => prev ? { ...prev, name: editForm.name, phone: editForm.phone } : null);
      
      const storedSession = localStorage.getItem('employee_session');
      if (storedSession) {
        const empSession = JSON.parse(storedSession);
        empSession.name = editForm.name;
        localStorage.setItem('employee_session', JSON.stringify(empSession));
      }
      
      setEditMode(false);
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({
          name: editForm.name,
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, name: editForm.name } : null);
      setEditMode(false);
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmployeePassword = async () => {
    if (!employeeProfile) return;
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const { data: employee } = await supabase
        .from("employees")
        .select("password")
        .eq("id", employeeProfile.id)
        .single();

      if (!employee || employee.password !== passwordForm.currentPassword) {
        toast.error("Current password is incorrect");
        setChangingPassword(false);
        return;
      }

      const { error } = await supabase
        .from("employees")
        .update({ password: passwordForm.newPassword })
        .eq("id", employeeProfile.id);

      if (error) throw error;

      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const browserSupabase = createClient();
      
      const { error: signInError } = await browserSupabase.auth.signInWithPassword({
        email: profile?.email || "",
        password: passwordForm.currentPassword
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        setChangingPassword(false);
        return;
      }

      const { error } = await browserSupabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleStyles: Record<string, string> = {
      super_admin: "bg-purple-100 text-purple-700",
      employee: "bg-blue-100 text-blue-700",
      cashier: "bg-green-100 text-green-700",
      manager: "bg-blue-100 text-blue-700",
      support: "bg-gray-100 text-gray-700"
    };
    const roleLabels: Record<string, string> = {
      super_admin: "Super Admin",
      employee: "Employee",
      cashier: "Cashier",
      manager: "Manager",
      support: "Support"
    };
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        roleStyles[role] || "bg-gray-100 text-gray-700"
      )}>
        <Shield className="h-3 w-3" />
        {roleLabels[role] || role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isEmployeeLogin && employeeProfile) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-serif font-bold">My Profile</h1>
          <p className="text-muted-foreground">View and manage your employee account</p>
        </div>

        <Card className="rounded-2xl overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-600" />
          <CardHeader className="border-b -mt-12 pb-6">
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-4">
                <div className="h-24 w-24 rounded-2xl bg-white shadow-lg flex items-center justify-center font-bold text-primary text-4xl border-4 border-white">
                  {employeeProfile.name?.charAt(0)?.toUpperCase() || "E"}
                </div>
                <div className="pb-2">
                  {editMode ? (
                    <Input 
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="text-xl font-bold h-10 w-64"
                      placeholder="Your Name"
                    />
                  ) : (
                    <CardTitle className="text-xl">{employeeProfile.name}</CardTitle>
                  )}
                  <div className="mt-2">{getRoleBadge(employeeProfile.role)}</div>
                </div>
              </div>
              {!editMode ? (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditMode(false);
                    setEditForm({
                      name: employeeProfile.name || "",
                      phone: employeeProfile.phone || ""
                    });
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEmployeeProfile} disabled={saving}>
                    {saving ? (
                      <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Employee ID
                  </label>
                  <div className="font-mono font-bold text-lg bg-muted/50 px-4 py-2 rounded-xl">
                    {employeeProfile.employee_id}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role
                  </label>
                  <div className="font-medium capitalize bg-muted/50 px-4 py-2 rounded-xl">
                    {employeeProfile.role?.replace("_", " ") || "Employee"}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Assigned Outlet
                  </label>
                  <div className="font-medium bg-muted/50 px-4 py-2 rounded-xl">
                    {localStorage.getItem('active_outlet') ? JSON.parse(localStorage.getItem('active_outlet')!).name : "No Outlet Assigned"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Joining Date
                  </label>
                  <div className="font-medium bg-muted/50 px-4 py-2 rounded-xl text-primary font-bold">
                    {employeeProfile.joining_date 
                      ? new Date(employeeProfile.joining_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })
                      : "N/A"
                    }
                  </div>
                </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Employment Type
                    </label>
                    <div className="font-medium bg-muted/50 px-4 py-2 rounded-xl">
                      {employeeProfile.employment_type || "Full-time"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Shift Type
                    </label>
                    <div className="font-medium bg-muted/50 px-4 py-2 rounded-xl">
                      {employeeProfile.shift_type || "General Shift"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Salary Structure
                    </label>
                    <div className="font-medium bg-muted/50 px-4 py-2 rounded-xl">
                      ₹{employeeProfile.base_salary?.toLocaleString() || "0"} ({employeeProfile.salary_type || "Monthly"})
                    </div>
                  </div>

                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4" />
                    Status
                  </label>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium",
                    employeeProfile.is_active 
                      ? "bg-green-100 text-green-700" 
                      : "bg-red-100 text-red-700"
                  )}>
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      employeeProfile.is_active ? "bg-green-500" : "bg-red-500"
                    )} />
                    {employeeProfile.is_active ? "Active" : "Inactive"}
                  </div>
                </div>


              {editMode && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number (Optional)
                  </label>
                  <Input 
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    className="max-w-md rounded-xl"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your current password and choose a new password.
            </p>
            
            <div className="space-y-4 max-w-md">
              <div>
                <Label className="mb-2 block">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password (min 6 characters)"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block">Confirm New Password</Label>
                <Input
                  type="password"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="rounded-xl"
                />
                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                )}
              </div>
              
              <Button 
                onClick={handleChangeEmployeePassword} 
                disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                className="rounded-xl"
              >
                {changingPassword ? (
                  <>
                    <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-serif font-bold">My Profile</h1>
        <p className="text-muted-foreground">View and manage your account settings</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-2xl">
                {profile?.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div>
                {editMode ? (
                  <Input 
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="text-xl font-bold h-10 w-64"
                    placeholder="Your Name"
                  />
                ) : (
                  <CardTitle className="text-xl">{profile?.name || "Admin User"}</CardTitle>
                )}
                {getRoleBadge(profile?.role || "super_admin")}
              </div>
            </div>
            {!editMode ? (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setEditMode(false);
                  setEditForm({
                    name: profile?.name || "",
                    phone: profile?.phone || ""
                  });
                }}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <div className="font-medium">{profile?.email}</div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </label>
              <div className="font-medium capitalize">
                {profile?.role?.replace("_", " ") || "Super Admin"}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Joined
              </label>
              <div className="font-medium">
                {profile?.created_at 
                  ? new Date(profile.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })
                  : "N/A"
                }
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Status
              </label>
              <div className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                profile?.status === "active" 
                  ? "bg-green-100 text-green-700" 
                  : "bg-red-100 text-red-700"
              )}>
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  profile?.status === "active" ? "bg-green-500" : "bg-red-500"
                )} />
                {profile?.status === "active" ? "Active" : "Inactive"}
              </div>
            </div>

            {editMode && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number (Optional)
                </label>
                <Input 
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  className="max-w-md"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="font-medium">Change Password</h3>
          <p className="text-sm text-muted-foreground">
            To change your password, enter your current password and then choose a new one.
          </p>
          
          <div className="space-y-4 max-w-md">
            <div>
              <Label className="mb-2 block">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block">New Password</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password (min 6 characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block">Confirm New Password</Label>
              <Input
                type="password"
                placeholder="Re-enter new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="rounded-xl"
              />
              {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
              )}
            </div>
            
            <Button 
              onClick={handleChangePassword} 
              disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
              className="rounded-xl"
            >
              {changingPassword ? (
                <>
                  <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
