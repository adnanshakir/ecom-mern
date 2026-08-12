"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Search, Heart, ShoppingCart, User, Truck, ChevronDown } from "lucide-react";

import { customerLogout } from "@/redux/slices/customerAuthSlice";
import { useDebouncedValue } from "@/hooks/shared/useDebouncedValue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state) => state.customerAuth.user);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 400);

  // Fires only once the debounced value settles — wire this to a real
  // search/products fetch once the customer-facing product endpoints exist.
  // useEffect(() => { if (debouncedSearch) { ... } }, [debouncedSearch]);

  const handleLogout = async () => {
    await dispatch(customerLogout());
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
            <Link href="/wishlist">
              <Heart className="size-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild title="Cart">
            <Link href="/cart">
              <ShoppingCart className="size-5" />
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title={user.name}>
                  <User className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/account/orders">Your orders</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account/addresses">Addresses</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/contact-us">Contact us</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" asChild title="Login">
              <Link href="/login">
                <User className="size-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}