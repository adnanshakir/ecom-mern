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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, allow: ["super_admin", "admin", "staff"] },
  { href: "/products", label: "Products", icon: Package, allow: ["super_admin", "admin", "staff"] },
  { href: "/categories", label: "Categories", icon: Tags, allow: ["super_admin", "admin", "staff"] },
  { href: "/brands", label: "Brands", icon: BadgeCheck, allow: ["super_admin", "admin", "staff"] },
  { href: "/inventory", label: "Inventory", icon: Warehouse, allow: ["super_admin", "admin", "staff"] },
  { href: "/csv-import", label: "CSV Import", icon: FileUp, allow: ["super_admin", "admin"] },
  { href: "/users", label: "Users", icon: Users, allow: ["super_admin"] },
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
    router.push("/login");
  };

  // Mobile drawer always shows the full menu, regardless of the desktop
  // collapsed preference — mobileOpen only ever becomes true on small
  // screens (the hamburger trigger is hidden on sm+), so this is safe.
  const effectiveCollapsed = collapsed && !mobileOpen;

  const visibleNavItems = NAV_ITEMS.filter((item) => !user?.role || item.allow.includes(user.role));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen">
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={() => setMobileOpen(false)} />
        )}

        <aside
          className={cn(
            "flex flex-col border-r bg-card transition-all duration-200 ease-in-out",
            "fixed inset-y-0 left-0 z-50 sm:static",
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

          <nav className="flex flex-1 flex-col gap-1 px-2">
            {visibleNavItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);

              const link = effectiveCollapsed ? (
                <Button asChild variant={isActive ? "secondary" : "ghost"} size="icon">
                  <Link href={href}>
                    <Icon className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );

              return effectiveCollapsed ? (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={href}>{link}</div>
              );
            })}
          </nav>

          <div className="border-t px-2 py-3">
            {!effectiveCollapsed ? (
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user?.name}</p>
                  <p className="truncate text-xs capitalize text-muted-foreground">{user?.role}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="size-4" />
                </Button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-full" onClick={handleLogout}>
                    <LogOut className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{user?.name} — Logout</TooltipContent>
              </Tooltip>
            )}
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
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

          <main className="flex-1">
            <PageContainer className="py-6">{children}</PageContainer>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
