"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/context/AdminContext";
import {
  Settings,
  Save,
  LoaderCircle,
  Shield,
  Clock,
  TableIcon,
  ShoppingBag,
  ChefHat,
  Receipt,
  CreditCard,
  Package,
  Users,
  FileBarChart,
  History,
  Store,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function AdminSettings() {
  const { selectedOutlet, user, hasPermission } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outletInfo, setOutletInfo] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (selectedOutlet) {
      fetchOutletSettings();
    }
  }, [selectedOutlet]);

  const fetchOutletSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("outlets")
        .select("*")
        .eq("id", selectedOutlet!.id)
        .single();

      if (error) throw error;

      setOutletInfo({
        name: data.name,
        address: data.address,
        phone: data.phone,
        code: data.code || "",
        email: data.email || "",
        status: data.status || "Active",
        access_pin_hash: data.access_pin_hash || ""
      });

      setSettings(data.settings || {});
    } catch (error) {
      console.error(error);
      toast.error("Failed to load outlet settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedOutlet) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("outlets")
        .update({
          name: outletInfo.name,
          address: outletInfo.address,
          phone: outletInfo.phone,
          code: outletInfo.code,
          email: outletInfo.email,
          status: outletInfo.status,
          access_pin_hash: outletInfo.access_pin_hash,
          settings: settings
        })
        .eq("id", selectedOutlet.id);

      if (error) throw error;

      // Log the change
      await supabase.from("audit_logs").insert({
        outlet_id: selectedOutlet.id,
        performed_by: user?.id,
        action: "UPDATE_OUTLET_SETTINGS",
        target: "outlets",
        metadata: {
          outlet_name: outletInfo.name,
          changed_by: user?.name,
          timestamp: new Date().toISOString()
        }
      });

      toast.success("Settings updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission("outlet.edit") && !user?.is_super_admin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Shield className="h-16 w-16 text-muted-foreground/20" />
        <h2 className="text-2xl font-serif font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You don't have permission to edit outlet settings. Please contact your Super Admin.
        </p>
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const updateSetting = (section: string, key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Outlet Configuration
          </h1>
          <p className="text-muted-foreground mt-1">Manage everything for <span className="font-bold text-foreground">{selectedOutlet?.name}</span></p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 px-8 rounded-full font-bold shadow-lg shadow-primary/20"
        >
          {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <ScrollArea className="w-full whitespace-nowrap rounded-md border bg-card p-1">
          <TabsList className="inline-flex w-full justify-start bg-transparent">
            <TabsTrigger value="basic" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <Info className="h-4 w-4" /> 1. Basic Info
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <Shield className="h-4 w-4" /> 2. Access
            </TabsTrigger>
            <TabsTrigger value="operating" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <Clock className="h-4 w-4" /> 3. Operating
            </TabsTrigger>
            <TabsTrigger value="tables" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <TableIcon className="h-4 w-4" /> 4. Tables
            </TabsTrigger>
            <TabsTrigger value="ordering" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <ShoppingBag className="h-4 w-4" /> 5. Ordering
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <ChefHat className="h-4 w-4" /> 6. Kitchen
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <Receipt className="h-4 w-4" /> 7. Billing
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <CreditCard className="h-4 w-4" /> 8. Payments
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <Package className="h-4 w-4" /> 9. Inventory
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="h-4 w-4" /> 10. Staff
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <FileBarChart className="h-4 w-4" /> 11. Reports
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
              <History className="h-4 w-4" /> 12. Audit
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* 1. Basic Info */}
        <TabsContent value="basic" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Basic Outlet Information</CardTitle>
              <CardDescription>Core details of this location</CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Outlet Name</Label>
                <Input
                  value={outletInfo.name}
                  onChange={(e) => setOutletInfo({ ...outletInfo, name: e.target.value })}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Outlet Code</Label>
                <Input
                  value={outletInfo.code}
                  onChange={(e) => setOutletInfo({ ...outletInfo, code: e.target.value })}
                  placeholder="e.g. CR-001"
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Full Address</Label>
                <Input
                  value={outletInfo.address}
                  onChange={(e) => setOutletInfo({ ...outletInfo, address: e.target.value })}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Contact Phone</Label>
                <Input
                  value={outletInfo.phone}
                  onChange={(e) => setOutletInfo({ ...outletInfo, phone: e.target.value })}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Contact Email</Label>
                <Input
                  value={outletInfo.email}
                  onChange={(e) => setOutletInfo({ ...outletInfo, email: e.target.value })}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Outlet Status</Label>
                <Select
                  value={outletInfo.status}
                  onValueChange={(v) => setOutletInfo({ ...outletInfo, status: v })}
                >
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Temporarily Closed">Temporarily Closed</SelectItem>
                    <SelectItem value="Maintenance">Under Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Access & Security */}
        <TabsContent value="security" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Access & Security</CardTitle>
              <CardDescription>Lock settings and session control</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Outlet PIN (6 Digits)</Label>
                  <Input
                    type="password"
                    value={outletInfo.access_pin_hash}
                    onChange={(e) => setOutletInfo({ ...outletInfo, access_pin_hash: e.target.value })}
                    maxLength={6}
                    className="rounded-xl h-14 text-center text-3xl font-mono tracking-widest"
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Enable Outlet Login</Label>
                    <p className="text-xs text-muted-foreground">Require PIN for staff to access this outlet</p>
                  </div>
                  <Switch
                    checked={settings.security?.login_enabled}
                    onCheckedChange={(v) => updateSetting("security", "login_enabled", v)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Session Timeout (Minutes)</Label>
                  <Input
                    type="number"
                    value={settings.security?.session_timeout}
                    onChange={(e) => updateSetting("security", "session_timeout", parseInt(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Max Failed Attempts</Label>
                  <Input
                    type="number"
                    value={settings.security?.max_failed_attempts}
                    onChange={(e) => updateSetting("security", "max_failed_attempts", parseInt(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Operating Details */}
        <TabsContent value="operating" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Operating Details</CardTitle>
              <CardDescription>Opening hours and working days</CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Opening Time</Label>
                <Input
                  type="time"
                  value={settings.operating?.opening_time}
                  onChange={(e) => updateSetting("operating", "opening_time", e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Closing Time</Label>
                <Input
                  type="time"
                  value={settings.operating?.closing_time}
                  onChange={(e) => updateSetting("operating", "closing_time", e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Order Cut-off Time</Label>
                <Input
                  type="time"
                  value={settings.operating?.cutoff_time}
                  onChange={(e) => updateSetting("operating", "cutoff_time", e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Time Zone</Label>
                <Select
                  value={settings.operating?.timezone}
                  onValueChange={(v) => updateSetting("operating", "timezone", v)}
                >
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Asia/Kolkata">IST (GMT+5:30) - Kolkata</SelectItem>
                    <SelectItem value="UTC">UTC (GMT+0:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Table & Floor Settings */}
        <TabsContent value="tables" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Table & Floor Settings</CardTitle>
              <CardDescription>Layout and table behavior</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Number of Tables</Label>
                  <Input
                    type="number"
                    value={settings.tables?.total_tables}
                    onChange={(e) => updateSetting("tables", "total_tables", parseInt(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Naming Format</Label>
                  <Input
                    value={settings.tables?.naming_format}
                    onChange={(e) => updateSetting("tables", "naming_format", e.target.value)}
                    placeholder="e.g. T-"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Auto-Close Idle (Mins)</Label>
                  <Input
                    type="number"
                    value={settings.tables?.auto_close_idle}
                    onChange={(e) => updateSetting("tables", "auto_close_idle", parseInt(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Allow Table Merge</Label>
                    <p className="text-xs text-muted-foreground">Allow joining tables for large groups</p>
                  </div>
                  <Switch
                    checked={settings.tables?.allow_merge}
                    onCheckedChange={(v) => updateSetting("tables", "allow_merge", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Require Staff to Open</Label>
                    <p className="text-xs text-muted-foreground">Only staff can open new table sessions</p>
                  </div>
                  <Switch
                    checked={settings.tables?.require_staff_open}
                    onCheckedChange={(v) => updateSetting("tables", "require_staff_open", v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Ordering Rules */}
        <TabsContent value="ordering" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Ordering Rules (Anti-Abuse)</CardTitle>
              <CardDescription>Control customer and QR ordering flow</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Allow QR Ordering</Label>
                    <p className="text-xs text-muted-foreground">Customers can order via scanning QR</p>
                  </div>
                  <Switch
                    checked={settings.ordering?.allow_qr_ordering}
                    onCheckedChange={(v) => updateSetting("ordering", "allow_qr_ordering", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Staff Approval Required</Label>
                    <p className="text-xs text-muted-foreground">Customer orders must be approved by staff</p>
                  </div>
                  <Switch
                    checked={settings.ordering?.staff_approval_required}
                    onCheckedChange={(v) => updateSetting("ordering", "staff_approval_required", v)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Max Orders / Session</Label>
                  <Input
                    type="number"
                    value={settings.ordering?.max_orders_per_table}
                    onChange={(e) => updateSetting("ordering", "max_orders_per_table", parseInt(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Rate Limit (Orders/Min)</Label>
                  <Input
                    type="number"
                    value={settings.ordering?.rate_limit_per_session}
                    onChange={(e) => updateSetting("ordering", "rate_limit_per_session", parseInt(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Session Expiry (Mins)</Label>
                  <Input
                    type="number"
                    value={settings.ordering?.auto_expire_session}
                    onChange={(e) => updateSetting("ordering", "auto_expire_session", parseInt(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Kitchen & KOT Settings */}
        <TabsContent value="kitchen" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Kitchen & KOT Settings</CardTitle>
              <CardDescription>Kitchen workflow and display</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Enable KDS</Label>
                    <p className="text-xs text-muted-foreground">Kitchen Display System for chefs</p>
                  </div>
                  <Switch
                    checked={settings.kitchen?.enable_kds}
                    onCheckedChange={(v) => updateSetting("kitchen", "enable_kds", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Sound Alerts</Label>
                    <p className="text-xs text-muted-foreground">Play sound for new incoming orders</p>
                  </div>
                  <Switch
                    checked={settings.kitchen?.sound_alerts}
                    onCheckedChange={(v) => updateSetting("kitchen", "sound_alerts", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Auto-Generate KOT</Label>
                    <p className="text-xs text-muted-foreground">Print KOT automatically on approval</p>
                  </div>
                  <Switch
                    checked={settings.kitchen?.auto_kot_on_approval}
                    onCheckedChange={(v) => updateSetting("kitchen", "auto_kot_on_approval", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Separate KOT for Add-ons</Label>
                    <p className="text-xs text-muted-foreground">Generate new KOT for item additions</p>
                  </div>
                  <Switch
                    checked={settings.kitchen?.separate_kot_addons}
                    onCheckedChange={(v) => updateSetting("kitchen", "separate_kot_addons", v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Billing & Tax */}
        <TabsContent value="billing" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Billing & Tax</CardTitle>
              <CardDescription>Pricing and taxation rules</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Enable Taxes (GST)</Label>
                    <p className="text-xs text-muted-foreground">Apply taxes on all bills</p>
                  </div>
                  <Switch
                    checked={settings.billing?.enable_taxes}
                    onCheckedChange={(v) => updateSetting("billing", "enable_taxes", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Allow Manual Discount</Label>
                    <p className="text-xs text-muted-foreground">Cashiers can apply custom discounts</p>
                  </div>
                  <Switch
                    checked={settings.billing?.allow_manual_discount}
                    onCheckedChange={(v) => updateSetting("billing", "allow_manual_discount", v)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">GST %</Label>
                  <Input
                    type="number"
                    value={settings.billing?.gst_percentage}
                    onChange={(e) => updateSetting("billing", "gst_percentage", parseFloat(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Service Charge %</Label>
                  <Input
                    type="number"
                    value={settings.billing?.service_charge}
                    onChange={(e) => updateSetting("billing", "service_charge", parseFloat(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Max Discount %</Label>
                  <Input
                    type="number"
                    value={settings.billing?.max_discount}
                    onChange={(e) => updateSetting("billing", "max_discount", parseFloat(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. Payments */}
        <TabsContent value="payments" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Payments</CardTitle>
              <CardDescription>Accepted payment modes and rules</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Allowed Payment Modes</Label>
                <div className="flex flex-wrap gap-4">
                  {["Cash", "UPI", "Card", "Wallet"].map((mode) => (
                    <div key={mode} className="flex items-center gap-2 p-4 bg-muted/30 rounded-xl border-2 border-transparent hover:border-primary/20 cursor-pointer">
                      <Switch
                        checked={settings.payments?.allowed_modes.includes(mode)}
                        onCheckedChange={(v) => {
                          const modes = [...settings.payments.allowed_modes];
                          if (v) modes.push(mode);
                          else modes.splice(modes.indexOf(mode), 1);
                          updateSetting("payments", "allowed_modes", modes);
                        }}
                      />
                      <Label className="font-bold">{mode}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 pt-4">
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Allow Partial Payments</Label>
                    <p className="text-xs text-muted-foreground">Split bill between different modes</p>
                  </div>
                  <Switch
                    checked={settings.payments?.allow_partial}
                    onCheckedChange={(v) => updateSetting("payments", "allow_partial", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Refund Approval Required</Label>
                    <p className="text-xs text-muted-foreground">Only Admins can approve refunds</p>
                  </div>
                  <Switch
                    checked={settings.payments?.refund_approval_required}
                    onCheckedChange={(v) => updateSetting("payments", "refund_approval_required", v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. Inventory Rules */}
        <TabsContent value="inventory" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Inventory Rules</CardTitle>
              <CardDescription>Stock management behavior</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Auto Stock Deduction</Label>
                    <p className="text-xs text-muted-foreground">Deduct stock automatically on order</p>
                  </div>
                  <Switch
                    checked={settings.inventory?.auto_deduction}
                    onCheckedChange={(v) => updateSetting("inventory", "auto_deduction", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Allow Negative Stock</Label>
                    <p className="text-xs text-muted-foreground">Continue sales even if stock is zero</p>
                  </div>
                  <Switch
                    checked={settings.inventory?.allow_negative_stock}
                    onCheckedChange={(v) => updateSetting("inventory", "allow_negative_stock", v)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Low-Stock Alert Threshold</Label>
                  <Input
                    type="number"
                    value={settings.inventory?.low_stock_threshold}
                    onChange={(e) => updateSetting("inventory", "low_stock_threshold", parseInt(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Wastage Tracking</Label>
                    <p className="text-xs text-muted-foreground">Enable recording of wasted materials</p>
                  </div>
                  <Switch
                    checked={settings.inventory?.wastage_tracking}
                    onCheckedChange={(v) => updateSetting("inventory", "wastage_tracking", v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 10. Staff & Operations */}
        <TabsContent value="staff" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Staff & Operations</CardTitle>
              <CardDescription>Attendance and shift rules</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Attendance Mandatory</Label>
                    <p className="text-xs text-muted-foreground">Staff must check-in to use the system</p>
                  </div>
                  <Switch
                    checked={settings.staff?.attendance_mandatory}
                    onCheckedChange={(v) => updateSetting("staff", "attendance_mandatory", v)}
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Shift Enforcement</Label>
                    <p className="text-xs text-muted-foreground">Staff can only login during their shift</p>
                  </div>
                  <Switch
                    checked={settings.staff?.shift_enforcement}
                    onCheckedChange={(v) => updateSetting("staff", "shift_enforcement", v)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Late Mark Grace Time (Mins)</Label>
                  <Input
                    type="number"
                    value={settings.staff?.late_grace_time}
                    onChange={(e) => updateSetting("staff", "late_grace_time", parseInt(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                  <div>
                    <Label className="text-base font-bold">Overtime Calculation</Label>
                    <p className="text-xs text-muted-foreground">Automatically calculate extra hours</p>
                  </div>
                  <Switch
                    checked={settings.staff?.overtime_calculation}
                    onCheckedChange={(v) => updateSetting("staff", "overtime_calculation", v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 11. Reports & Data */}
        <TabsContent value="reports" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Reports & Data</CardTitle>
              <CardDescription>Data retention and reporting</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Data Retention (Days)</Label>
                  <Input
                    type="number"
                    value={settings.reports?.retention_period}
                    onChange={(e) => updateSetting("reports", "retention_period", parseInt(e.target.value))}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Daily Auto-Report Time</Label>
                  <Input
                    type="time"
                    value={settings.reports?.auto_report_time}
                    onChange={(e) => updateSetting("reports", "auto_report_time", e.target.value)}
                    className="rounded-xl h-12"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl">
                <div>
                  <Label className="text-base font-bold">Allow Data Export</Label>
                  <p className="text-xs text-muted-foreground">Enable CSV/PDF exports for reports</p>
                </div>
                <Switch
                  checked={settings.reports?.allow_export}
                  onCheckedChange={(v) => updateSetting("reports", "allow_export", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 12. Audit & Safety */}
        <TabsContent value="audit" className="mt-6">
          <Card className="rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <CardHeader className="bg-primary/5 pb-8">
              <CardTitle className="text-2xl font-serif">Audit & Safety</CardTitle>
              <CardDescription>Recent changes to settings</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-8 bg-amber-50 border-y border-amber-200 flex items-start gap-4">
                <Shield className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900">Safety Enforcement</h4>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    All changes made in these settings are audit-logged. You can view the full history in the Audit Logs section of the main dashboard.
                  </p>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">System Logs Protection</h3>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Enabled</Badge>
                </div>
                <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground italic">
                  Log data is non-negotiable and cannot be deleted by staff.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
