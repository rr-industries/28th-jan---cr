"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  ShoppingBag,
  Menu as MenuIcon,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  LoaderCircle,
  Grid3X3,
  Users,
  History,
  ChevronDown,
  Store,
  Image as ImageIcon,
  CalendarCheck,
  Receipt,
  ListOrdered,
  Package,
  Wallet,
  ShieldCheck,
  ChefHat,
  CreditCard,
  FileText,
  User,
  Coffee,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/NotificationBell";
import { AdminProvider, useAdmin } from "@/context/AdminContext";

const adminNavGroups = [
  {
    title: "Operations",
    items: [
      { label: "Live Orders", href: "/admin/live-orders", icon: ShoppingBag },
      { label: "KDS", href: "/admin/kds", icon: ChefHat },
      { label: "All Orders", href: "/admin/all-orders", icon: ListOrdered },
      { label: "Tables", href: "/admin/tables", icon: Grid3X3 },
      { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck },
    ]
  },
  {
    title: "Management",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Menu", href: "/admin/menu", icon: MenuIcon },
      { label: "Inventory", href: "/admin/inventory", icon: Package },
      { label: "Employees", href: "/admin/employees", icon: Users },
    ]
  },
  {
    title: "Financials",
    items: [
      { label: "Billings", href: "/admin/billings", icon: Receipt },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Expenses", href: "/admin/expenses", icon: Wallet },
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    ]
  },
  {
    title: "Security & Logs",
    items: [
      { label: "Admins", href: "/admin/admins", icon: ShieldCheck },
      { label: "Access Matrix", href: "/admin/access-matrix", icon: Shield },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck },
      { label: "Login History", href: "/admin/login-history", icon: History },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ]
  },
  {
    title: "Marketing & Setup",
    items: [
      { label: "Gallery", href: "/admin/gallery", icon: ImageIcon },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ]
  }
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && mounted) {
      if (!user && pathname !== "/admin/login") {
        router.push("/admin/login");
      }
    }
  }, [user, loading, pathname, router, mounted]);

  const handleLogout = async () => {
    localStorage.removeItem('employee_session');
    router.push("/admin/login");
  };

  if (pathname === "/admin/login") return <>{children}</>;

  if (loading || !mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
      <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const showSidebar = !!user;

  return (
    <div className="flex min-h-screen bg-[#fafaf9]">
      {showSidebar && (
        <aside className="fixed left-0 top-0 hidden h-full w-64 border-r bg-white lg:block shadow-sm z-40">
          <div className="flex h-16 items-center border-b px-6 bg-white">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                <Coffee className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold tracking-tight">CAFE REPUBLIC</span>
            </Link>
          </div>

          <nav className="flex flex-col gap-6 p-4 h-[calc(100vh-140px)] overflow-y-auto">
            {adminNavGroups.map((group) => (
              <div key={group.title} className="flex flex-col gap-1">
                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-2">
                  {group.title}
                </h3>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-bold transition-all",
                        isActive
                          ? "bg-primary text-white shadow-md shadow-primary/10"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="absolute bottom-4 left-4 right-4 border-t pt-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4.5 w-4.5" />
              Sign Out
            </button>
          </div>
        </aside>
      )}

      <div className={cn(
        "flex flex-1 flex-col w-full min-w-0",
        showSidebar && "lg:pl-64"
      )}>
        {showSidebar && (
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/80 px-4 backdrop-blur-md lg:px-8">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold">
                {adminNavGroups.flatMap(g => g.items).find(i => i.href === pathname)?.label || "Admin"}
              </h2>
              <div className="h-4 w-[1px] bg-border hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
                <Store className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Cafe Republic</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl bg-white p-1 pr-3 border hover:border-primary/30 transition-all">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm uppercase">
                      {user?.name?.charAt(0)}
                    </div>
                    <div className="text-left hidden sm:block">
                      <span className="text-xs font-bold block leading-none mb-0.5">{user?.name}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none">{user?.role}</span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-1 shadow-xl">
                  <div className="p-3 border-b mb-1">
                    <p className="text-sm font-bold">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{user?.employee_id}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/profile" className="rounded-lg p-2 font-medium text-sm cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="rounded-lg p-2 font-medium text-sm text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}

        <main className={cn(
          "flex-1",
          showSidebar ? "p-4 lg:p-8" : "flex items-center justify-center"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </AdminProvider>
  );
}
