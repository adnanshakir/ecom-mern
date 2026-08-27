"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { usePublicCategories } from "@/hooks/storefront/usePublicCategories";
import { buildChildrenMap } from "@/lib/categoryTree";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 6;

export function CategoryNav() {
  const { categories, loading } = usePublicCategories();
  const pathname = usePathname();
  const [openId, setOpenId] = useState(null); // Tap toggle state
  const [hoverId, setHoverId] = useState(null); // Mouse hover state
  const containerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = (id) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoverId(id);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverId(null);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Close dropdown on outside click or tap
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenId(null);
        setHoverId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  // Close whenever route changes
  useEffect(() => {
    setOpenId(null);
    setHoverId(null);
  }, [pathname]);

  // Render ONLY on homepage ("/")
  if (pathname !== "/") return null;

  if (loading || categories.length === 0) return null;

  const childrenMap = buildChildrenMap(categories);
  const topLevel = childrenMap.get(null) || [];
  const visibleCategories = topLevel.slice(0, MAX_VISIBLE);
  const moreCategories = topLevel.slice(MAX_VISIBLE);

  const handleToggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <nav ref={containerRef} className="hidden lg:block relative z-30 border-b bg-muted/30">
      <div className="mx-auto flex max-w-400 items-center gap-1 px-4 py-1 sm:px-6 lg:px-8 whitespace-nowrap">
        <Link
          href="/category/all"
          className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
        >
          All Categories
        </Link>

        {/* Visible Categories */}
        {visibleCategories.map((category) => {
          const subcategories = childrenMap.get(category._id) || [];
          const isShown = openId === category._id || hoverId === category._id;

          if (!subcategories || subcategories.length === 0) {
            return (
              <Link
                key={category._id}
                href={`/category/${category.slug || category._id}`}
                className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {category.name}
              </Link>
            );
          }

          return (
            <div
              key={category._id}
              className="group relative shrink-0"
              onMouseEnter={() => handleMouseEnter(category._id)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center">
                <Link
                  href={`/category/${category.slug || category._id}`}
                  className="rounded-l-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => {
                    setOpenId(null);
                    setHoverId(null);
                  }}
                >
                  {category.name}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggle(category._id);
                  }}
                  className="rounded-r-md px-1.5 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <ChevronDown className={cn("size-3.5 transition-transform", isShown && "rotate-180")} />
                </button>
              </div>

              {/* Dropdown Menu with Hover Bridge */}
              <div
                className={cn(
                  "absolute left-0 top-full z-50 pt-1 min-w-48 whitespace-normal transition-all duration-150",
                  isShown
                    ? "visible opacity-100 block"
                    : "invisible opacity-0 hidden group-hover:visible group-hover:opacity-100 group-hover:block"
                )}
              >
                <div className="rounded-md border bg-popover py-1 shadow-lg">
                  <Link
                    href={`/category/${category.slug || category._id}`}
                    onClick={() => {
                      setOpenId(null);
                      setHoverId(null);
                    }}
                    className="block px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    All {category.name}
                  </Link>
                  {subcategories.map((sub) => (
                    <Link
                      key={sub._id}
                      href={`/category/${sub.slug || sub._id}`}
                      onClick={() => {
                        setOpenId(null);
                        setHoverId(null);
                      }}
                      className="block px-3 py-2 text-sm text-popover-foreground hover:bg-accent"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* More Categories */}
        {moreCategories.length > 0 && (
          <MoreCategoriesDropdown
            moreCategories={moreCategories}
            childrenMap={childrenMap}
            openId={openId}
            hoverId={hoverId}
            setOpenId={setOpenId}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        )}
      </div>
    </nav>
  );
}

function MoreCategoriesDropdown({
  moreCategories,
  childrenMap,
  openId,
  hoverId,
  setOpenId,
  onMouseEnter,
  onMouseLeave,
}) {
  const [activeSubId, setActiveSubId] = useState(null);
  const isShown = openId === "more" || hoverId === "more";

  return (
    <div
      className="group relative shrink-0"
      onMouseEnter={() => onMouseEnter("more")}
      onMouseLeave={() => {
        onMouseLeave();
        setActiveSubId(null);
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpenId((prev) => (prev === "more" ? null : "more"));
        }}
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <span>More</span>
        <ChevronDown className={cn("size-3.5 transition-transform", isShown && "rotate-180")} />
      </button>

      {/* Main "More" Dropdown Menu */}
      <div
        className={cn(
          "absolute left-0 top-full z-50 pt-1 min-w-56 whitespace-normal transition-all duration-150",
          isShown
            ? "visible opacity-100 block"
            : "invisible opacity-0 hidden group-hover:visible group-hover:opacity-100 group-hover:block"
        )}
      >
        <div className="relative rounded-md border bg-popover py-1 shadow-lg">
          {moreCategories.map((category) => {
            const subcategories = childrenMap.get(category._id) || [];
            const isSubOpen = activeSubId === category._id;
            const hasSubs = subcategories.length > 0;

            return (
              <div
                key={category._id}
                className="group/item relative"
                onMouseEnter={() => setActiveSubId(category._id)}
              >
                <div className="flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent text-popover-foreground transition-colors cursor-pointer">
                  <Link
                    href={`/category/${category.slug || category._id}`}
                    onClick={() => {
                      setOpenId(null);
                      setHoverId(null);
                    }}
                    className="flex-1 truncate"
                  >
                    {category.name}
                  </Link>

                  {hasSubs && (
                    <ChevronRight className="ml-2 size-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Side Fly-out Dropdown for Subcategories */}
                {hasSubs && isSubOpen && (
                  <div className="absolute left-full top-0 z-50 pl-1.5 min-w-52 -mt-1">
                    <div className="rounded-md border bg-popover py-1 shadow-xl whitespace-normal">
                      <Link
                        href={`/category/${category.slug || category._id}`}
                        onClick={() => {
                          setOpenId(null);
                          setHoverId(null);
                        }}
                        className="block px-3 py-2 text-sm font-semibold hover:bg-accent text-foreground border-b border-border/40"
                      >
                        All {category.name}
                      </Link>
                      {subcategories.map((sub) => (
                        <Link
                          key={sub._id}
                          href={`/category/${sub.slug || sub._id}`}
                          onClick={() => {
                            setOpenId(null);
                            setHoverId(null);
                          }}
                          className="block px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
