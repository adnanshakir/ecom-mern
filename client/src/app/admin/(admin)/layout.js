"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  Package,
  Tags,
  BadgeCheck,
  Warehouse,
  Users,
  FileUp,
  Image as ImageIcon,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";

import { logout } from "@/redux/slices/authSlice";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, allow: ["super_admin", "admin", "staff"] },
  { href: "/admin/products", label: "Products", icon: Package, allow: ["super_admin", "admin", "staff"] },
  { href: "/admin/categories", label: "Categories", icon: Tags, allow: ["super_admin", "admin", "staff"] },
  { href: "/admin/brands", label: "Brands", icon: BadgeCheck, allow: ["super_admin", "admin", "staff"] },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon, allow: ["super_admin", "admin", "staff"] },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse, allow: ["super_admin", "admin", "staff"] },
  { href: "/admin/csv-import", label: "CSV Import", icon: FileUp, allow: ["super_admin", "admin"] },
  { href: "/admin/users", label: "Users", icon: Users, allow: ["super_admin"] },
];

const COLLAPSE_KEY = "admin-sidebar-collapsed";
const THEME_KEY = "admin-isolated-theme";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state) => state.auth.user);

  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminTheme, setAdminTheme] = useState("dark");

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem(COLLAPSE_KEY) === "true") setCollapsed(true);

    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      setAdminTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = adminTheme === "dark" ? "light" : "dark";
    setAdminTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSE_KEY, String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await dispatch(logout());
    router.push("/admin/login");
  };

  const effectiveCollapsed = collapsed && !mobileOpen;

  const visibleNavItems = NAV_ITEMS.filter((item) => user?.role && item.allow.includes(user.role));

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("min-h-screen bg-background text-foreground transition-colors duration-200", adminTheme)}>
        <div className="flex h-screen overflow-hidden">
          {/* Mobile Overlay */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          {/* Sidebar Drawer */}
          <aside
            className={cn(
              "flex flex-col border-r bg-card transition-all duration-200 ease-in-out",
              "fixed inset-y-0 left-0 z-50",
              effectiveCollapsed ? "w-16" : "w-64",
              mobileOpen ? "translate-x-0 w-64" : "-translate-x-full sm:translate-x-0"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b">
              {(!effectiveCollapsed || mobileOpen) && (
                <div className="flex items-center gap-2">
                  <span className="truncate text-base font-bold tracking-tight text-primary">Fibio Admin</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    title={`Switch to ${adminTheme === "dark" ? "light" : "dark"} mode`}
                    className="size-8"
                  >
                    {adminTheme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-700" />}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:inline-flex size-8"
                  onClick={toggleCollapsed}
                >
                  {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden size-8"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Vertical Stack Navigation Menu */}
            <nav className="flex-1 flex flex-col gap-1.5 p-3 overflow-y-auto w-full">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                const navLink = (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all w-full",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      effectiveCollapsed && !mobileOpen && "justify-center px-0"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {(!effectiveCollapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                  </Link>
                );

                if (effectiveCollapsed && !mobileOpen) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return navLink;
              })}
            </nav>

            {/* Footer Profile / Logout */}
            <div className="border-t p-3">
              {!effectiveCollapsed || mobileOpen ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{user?.name || "Admin Account"}</p>
                    <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{user?.role || "Staff"}</p>
                  </div>

                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="size-8">
                    <LogOut className="size-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="w-full">
                      <LogOut className="size-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{user?.name} — Logout</TooltipContent>
                </Tooltip>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <div className={cn("flex min-h-0 flex-1 flex-col transition-all duration-200", effectiveCollapsed ? "sm:ml-16" : "sm:ml-64")}>
            {/* Top Bar for Mobile */}
            <header className="flex items-center justify-between border-b px-4 py-3 sm:hidden bg-card">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setMobileOpen(true)} className="size-9">
                  <Menu className="size-5" />
                </Button>
                <span className="text-base font-bold tracking-tight text-primary">Fibio Admin</span>
              </div>

              {mounted && (
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="size-9">
                  {adminTheme === "dark" ? <Sun className="size-5 text-amber-400" /> : <Moon className="size-5 text-slate-700" />}
                </Button>
              )}
            </header>

            <main className="flex-1 overflow-y-auto">
              <PageContainer className="py-4 sm:py-6">{children}</PageContainer>
            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
