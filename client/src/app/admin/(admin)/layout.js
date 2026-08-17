"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "next-themes";
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
import { ThemeProvider } from "@/components/theme-provider";
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

const COLLAPSE_KEY = "sidebar-collapsed";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state) => state.auth.user);
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem(COLLAPSE_KEY) === "true") setCollapsed(true);
  }, []);

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
        <div className="flex h-screen overflow-hidden">
          {mobileOpen && (
            <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={() => setMobileOpen(false)} />
          )}

          <aside
            className={cn(
              "flex flex-col border-r bg-card transition-all duration-200 ease-in-out",
              "fixed inset-y-0 left-0 z-50",
              effectiveCollapsed ? "w-16" : "w-64",
              mobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
            )}
          >
            <div className="flex items-center justify-between px-3 py-4">
              {!effectiveCollapsed && <span className="truncate text-sm font-semibold">Ecom Admin</span>}
              <div className="flex items-center gap-1">
                {mounted && !effectiveCollapsed && !mobileOpen && (
                  <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={toggleCollapsed}>
                  {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setMobileOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          effectiveCollapsed && "justify-center px-0"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {!effectiveCollapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </TooltipTrigger>
                    {effectiveCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                  </Tooltip>
                );
              })}
            </nav>

            <div className="border-t p-2">
              {!effectiveCollapsed ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{user?.name || "Admin User"}</p>
                    <p className="truncate text-[10px] capitalize text-muted-foreground">{user?.role || "Role"}</p>
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

          <div className={cn("flex min-h-0 flex-1 flex-col", effectiveCollapsed ? "sm:ml-16" : "sm:ml-64")}>
            <header className="flex items-center justify-between border-b px-4 py-3 sm:hidden">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
                  <Menu className="size-4" />
                </Button>
                <span className="text-sm font-semibold">Ecom Admin</span>
              </div>
              {mounted && (
                <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              )}
            </header>

            <main className="flex-1 overflow-y-auto">
              <PageContainer className="py-6">{children}</PageContainer>
            </main>
          </div>
        </div>
      </TooltipProvider>
  );
}
