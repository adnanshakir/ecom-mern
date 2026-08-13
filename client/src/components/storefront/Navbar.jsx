"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Search, Heart, ShoppingCart, User, Truck } from "lucide-react";

import { customerLogout } from "@/redux/slices/customerAuthSlice";
import { resetCart } from "@/redux/slices/cartSlice";
import { resetWishlist } from "@/redux/slices/wishlistSlice";
import { selectCartCount } from "@/redux/slices/cartSlice";
import { useDebouncedValue } from "@/hooks/shared/useDebouncedValue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Navbar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state) => state.customerAuth.user);
  const status = useSelector((state) => state.customerAuth.status);
  const isAuthenticated = status === "authenticated";
  const cartCount = useSelector(selectCartCount);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  void debouncedSearch;

  const handleLogout = async () => {
    await dispatch(customerLogout());
    dispatch(resetCart());
    dispatch(resetWishlist());
    router.push("/");
  };

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          <span className="text-xl font-bold tracking-tight">Fibio</span>
          <span className="ml-1.5 text-xs text-muted-foreground">Wholesale</span>
        </Link>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" asChild title="Track your order">
            <Link href="/track-order">
              <Truck className="size-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild title="Wishlist">
            <Link href={isAuthenticated ? "/wishlist" : "/login?from=/wishlist"}>
              <Heart className="size-5" />
            </Link>
          </Button>

          {/* Cart icon with count badge */}
          <Button variant="ghost" size="icon" className="relative" asChild title="Cart">
            <Link href={isAuthenticated ? "/cart" : "/login?from=/cart"}>
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 py-px text-[10px] font-semibold leading-none text-primary-foreground">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </Button>

          {/* User menu — hover/click to open */}
          <UserMenu user={user} isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        </div>
      </div>
    </header>
  );
}

function UserMenu({ user, isAuthenticated, onLogout }) {
  const [open, setOpen] = useState(false);
  const isLoggedIn = isAuthenticated || !!user;

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {/* Trigger icon */}
      {isLoggedIn ? (
        <button
          className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title={user?.name || "Account"}
          onClick={() => setOpen((prev) => !prev)}
        >
          <User className="size-5" />
        </button>
      ) : (
        <Link
          href="/login"
          className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Login"
        >
          <User className="size-5" />
        </Link>
      )}

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-md border bg-popover py-1 shadow-md">
          {isLoggedIn ? (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground truncate">{user?.name || "Account"}</div>
              <div className="my-1 h-px bg-border" />
              <MenuItem href="/account/orders">Your orders</MenuItem>
              <MenuItem href="/account/addresses">Addresses</MenuItem>
              <MenuItem href="/contact-us">Contact us</MenuItem>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={onLogout}
                className="w-full px-3 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-accent"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <MenuItem href="/contact-us">Contact us</MenuItem>
              <div className="my-1 h-px bg-border" />
              <MenuItem href="/login" highlight>
                Login
              </MenuItem>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ href, children, highlight }) {
  return (
    <Link
      href={href}
      className={`block px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
        highlight ? "font-medium text-primary" : "text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
