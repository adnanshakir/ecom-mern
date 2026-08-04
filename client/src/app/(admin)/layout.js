"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { LayoutDashboard, Package, Tags, BadgeCheck, Warehouse, Users, LogOut } from "lucide-react";

import { logout } from "@/redux/slices/authSlice";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/brands", label: "Brands", icon: BadgeCheck },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/users", label: "Users", icon: Users },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = async () => {
    await dispatch(logout());
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 flex-col border-r bg-card px-3 py-4 sm:flex">
        <div className="mb-6 px-2 text-sm font-semibold">Ecom Admin</div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm text-muted-foreground">{user ? `${user.name} · ${user.role}` : ""}</div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="size-4" />
            Logout
          </Button>
        </header>

        <main className="flex-1">
          <PageContainer className="py-6">{children}</PageContainer>
        </main>
      </div>
    </div>
  );
}
