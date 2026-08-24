"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Search, Heart, ShoppingCart, User, Truck, FolderTree, Package, Loader2, ArrowRight, X } from "lucide-react";

import { customerLogout } from "@/redux/slices/customerAuthSlice";
import { resetCart } from "@/redux/slices/cartSlice";
import { resetWishlist } from "@/redux/slices/wishlistSlice";
import { selectCartCount } from "@/redux/slices/cartSlice";
import { useSearchSuggestions } from "@/hooks/storefront/useSearchSuggestions";
import { formatPrice } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Navbar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state) => state.customerAuth.user);
  const status = useSelector((state) => state.customerAuth.status);
  const isAuthenticated = status === "authenticated";
  const cartCount = useSelector(selectCartCount);

  const handleLogout = async () => {
    await dispatch(customerLogout());
    dispatch(resetCart());
    dispatch(resetWishlist());
    router.push("/");
  };

  return (
    <header className="border-b bg-background">
      <div className="mx-auto max-w-400 px-4 py-3 sm:px-6 lg:px-8">
        {/* Desktop Single-Row & Mobile Top Row */}
        <div className="flex items-center justify-between gap-4 md:gap-6">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <span className="text-xl font-bold tracking-tight">Fibio</span>
            <span className="ml-1.5 text-xs text-muted-foreground">Wholesale</span>
          </Link>

          {/* Desktop Search Bar (Hidden on Mobile) */}
          <div className="hidden flex-1 md:block">
            <SearchInputWithSuggestions />
          </div>

          {/* Action Icons */}
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
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-primary px-1 py-px text-[10px] font-semibold leading-none text-primary-foreground">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
            </Button>

            {/* User menu — hover/click to open */}
            <UserMenu user={user} isAuthenticated={isAuthenticated} onLogout={handleLogout} />
          </div>
        </div>

        {/* Mobile 2nd Row: Full-Width Search Bar */}
        <div className="mt-2.5 w-full md:hidden">
          <SearchInputWithSuggestions />
        </div>
      </div>
    </header>
  );
}

function SearchInputWithSuggestions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const router = useRouter();

  const { suggestions, loading, query } = useSearchSuggestions(searchTerm);
  const hasProducts = suggestions.products && suggestions.products.length > 0;
  const hasCategories = suggestions.categories && suggestions.categories.length > 0;
  const showDropdown = isOpen && query.length >= 2 && (hasProducts || hasCategories || loading);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleNavigate = (path) => {
    setIsOpen(false);
    setSearchTerm("");
    router.push(path);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search products & categories..."
          className="pl-9 pr-8"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </form>

      {/* Live Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[80vh] overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg">
          {loading && (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Searching suggestions...
            </div>
          )}

          {!loading && (
            <div className="grid gap-3">
              {/* Category Suggestions */}
              {hasCategories && (
                <div>
                  <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Categories
                  </div>
                  <div className="grid gap-0.5">
                    {suggestions.categories.map((cat) => (
                      <button
                        key={cat._id}
                        onClick={() => handleNavigate(`/category/${cat.slug}`)}
                        className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <div className="flex items-center gap-2">
                          <FolderTree className="size-4 text-primary shrink-0" />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        {cat.parentName && (
                          <span className="text-xs text-muted-foreground">in {cat.parentName}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Suggestions */}
              {hasProducts && (
                <div>
                  <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Products
                  </div>
                  <div className="grid gap-1">
                    {suggestions.products.map((prod) => (
                      <button
                        key={prod._id}
                        onClick={() => handleNavigate(`/product/${prod.slug}`)}
                        className="flex w-full items-center gap-3 rounded-md p-1.5 text-left transition-colors hover:bg-accent"
                      >
                        <div className="relative size-10 shrink-0 overflow-hidden rounded bg-muted flex items-center justify-center">
                          {prod.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={prod.image} alt="" className="size-full object-cover" />
                          ) : (
                            <Package className="size-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-tight">{prod.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{prod.categoryName || "Product"}</p>
                        </div>

                        {prod.price != null && (
                          <span className="shrink-0 text-xs font-semibold">{formatPrice(prod.price)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* See all results button */}
              <div className="border-t pt-1">
                <button
                  onClick={() => handleSearchSubmit()}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-accent"
                >
                  <span>See all results for &quot;{query}&quot;</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
