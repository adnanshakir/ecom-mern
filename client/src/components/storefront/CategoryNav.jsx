import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Placeholder categories — replace with a real fetch once a public,
// customer-facing categories endpoint exists (current GET /categories
// requires seller auth, which customers don't have).
const PLACEHOLDER_CATEGORIES = ["Electronics", "Apparel", "Home & Kitchen", "Books"];

export function CategoryNav() {
  return (
    <nav className="border-b bg-muted/30">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium hover:bg-accent">
              All Categories
              <ChevronDown className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {PLACEHOLDER_CATEGORIES.map((cat) => (
              <DropdownMenuItem key={cat} asChild>
                <Link href={`/category/${cat.toLowerCase().replace(/\s+/g, "-")}`}>{cat}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {PLACEHOLDER_CATEGORIES.slice(0, 4).map((cat) => (
          <Link
            key={cat}
            href={`/category/${cat.toLowerCase().replace(/\s+/g, "-")}`}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {cat}
          </Link>
        ))}
      </div>
    </nav>
  );
}