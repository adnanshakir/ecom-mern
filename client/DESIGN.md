# Fibio Wholesale — Frontend Design Document

## Overview

**Fibio Wholesale** is a full-stack wholesale e-commerce platform. The frontend is a **Next.js 16** application (App Router) using **React 19**, styled with **Tailwind CSS v4** and **shadcn/ui** (Radix primitives). It serves two distinct surfaces:

1. **Storefront** — the public-facing customer shopping experience
2. **Admin Panel** — a private internal dashboard for managing the store

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | JavaScript (JSX) |
| Styling | Tailwind CSS v4 + `tw-animate-css` |
| Component Library | shadcn/ui (Radix UI primitives) |
| State Management | Redux Toolkit (`@reduxjs/toolkit`, `react-redux`) |
| Forms | React Hook Form + Zod validation |
| HTTP Client | Axios (with custom interceptors) |
| Customer Auth | Better Auth (`better-auth/react`) — phone OTP + email OTP |
| Admin Auth | Custom JWT (access token in-memory, refresh token httpOnly cookie) |
| Fonts | Geist Sans + Geist Mono (Google Fonts via `next/font`) |
| Notifications | Sonner (toast) |
| Icons | Lucide React |
| Theming | `next-themes` |
| Sanitization | `isomorphic-dompurify` |
| OTP Input | `input-otp` |

---

## Project Structure

```
client/
├── public/                   # Static assets (brand logos, banners)
├── src/
│   ├── app/                  # Next.js App Router pages & layouts
│   │   ├── layout.js         # Root layout (Redux, fonts, Toaster, SEO JSON-LD)
│   │   ├── globals.css       # Global Tailwind base styles
│   │   ├── robots.js         # SEO robots config
│   │   ├── sitemap.js        # Dynamic sitemap
│   │   ├── (storefront)/     # Storefront route group
│   │   │   ├── layout.js     # Storefront layout (Navbar, CategoryNav, Footer)
│   │   │   ├── page.js       # Home page
│   │   │   ├── product/[slug]/
│   │   │   ├── category/[slug]/
│   │   │   ├── category/     # Category listing
│   │   │   ├── search/       # Search results
│   │   │   ├── cart/
│   │   │   ├── wishlist/
│   │   │   ├── sign-in/
│   │   │   ├── sign-up/
│   │   │   ├── forgot-password/
│   │   │   ├── orders/
│   │   │   ├── profile/
│   │   │   ├── account/
│   │   │   │   ├── profile/
│   │   │   │   ├── orders/
│   │   │   │   └── delete/
│   │   │   └── contact-us/
│   │   └── admin/
│   │       ├── login/        # Admin login (public)
│   │       └── (admin)/      # Protected admin route group
│   │           ├── layout.js # Admin layout (sidebar, auth guard)
│   │           ├── dashboard/
│   │           ├── products/
│   │           │   └── [id]/
│   │           ├── categories/
│   │           ├── brands/
│   │           ├── banners/
│   │           ├── inventory/
│   │           ├── csv-import/
│   │           └── users/
│   │
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives (Button, Input, Dialog, etc.)
│   │   ├── layout/           # Shared layout helpers (PageContainer)
│   │   ├── theme-provider.jsx
│   │   ├── admin/            # Admin-specific components
│   │   │   ├── RoleGate.jsx
│   │   │   ├── banners/
│   │   │   ├── csv-import/
│   │   │   ├── dashboard/
│   │   │   └── products/
│   │   └── storefront/       # Customer-facing components
│   │       ├── layout/       # Navbar, CategoryNav, Footer, ScrollToTop
│   │       ├── auth/         # SignInView, SignUpView, ForgotPassword
│   │       ├── home/         # HeroBanner, PopularProducts, ShopByCategory, etc.
│   │       ├── products/     # ProductCard, ProductPageClient, ProductCatalogFilterView
│   │       ├── cart/         # CartView
│   │       ├── wishlist/     # WishlistView
│   │       ├── category/     # CategoryPageClient
│   │       ├── account/      # ProfileView, OrdersView, DeleteAccountView
│   │       └── reviews/      # ReviewForm, ReviewList
│   │
│   ├── hooks/
│   │   ├── admin/            # useProducts, useProduct, useEditProduct, useBrands, etc.
│   │   ├── storefront/       # useCart, useWishlist, usePublicProducts, useReviews, etc.
│   │   └── shared/           # useDebouncedValue
│   │
│   ├── services/             # API layer (all HTTP calls)
│   │   ├── createAuthApi.js  # Factory: authenticated Axios instance with token refresh
│   │   ├── publicApi.js      # Unauthenticated Axios instance
│   │   ├── admin/            # Auth, brands, categories, products, inventory, etc.
│   │   └── storefront/       # Cart, wishlist, reviews, customerAuth, publicCatalog
│   │
│   ├── redux/
│   │   ├── store.js          # Redux store factory (makeStore)
│   │   ├── StoreProvider.jsx # Next.js App Router Redux provider wrapper
│   │   └── slices/
│   │       ├── authSlice.js          # Admin JWT auth state
│   │       ├── customerAuthSlice.js  # Customer Better Auth session state
│   │       ├── cartSlice.js          # Shopping cart
│   │       ├── wishlistSlice.js      # Wishlist
│   │       ├── brandsSlice.js        # Brands (admin)
│   │       └── categoriesSlice.js    # Categories (admin)
│   │
│   ├── schemas/              # Zod validation schemas
│   │   ├── admin/            # auth, brand, category, inventory, product, user
│   │   └── storefront/       # customerAuth
│   │
│   └── lib/                  # Pure utilities (no side effects)
│       ├── apiBaseUrl.js     # Resolves backend base URL per environment
│       ├── authClient.js     # Better Auth client (phone OTP + email OTP)
│       ├── jwt.js            # JWT payload decoder (client-side, no verification)
│       ├── utils.js          # `cn()` Tailwind class merger
│       ├── formatCurrency.js # INR currency formatter
│       ├── productPrice.js   # Effective price / discount % helper
│       ├── productSanitizers.js # DOMPurify HTML sanitization
│       ├── categoryTree.js   # Flatten/build category trees
│       ├── parseApiError.js  # Extract message from Axios error
│       ├── redirect.js       # Safe Next.js redirect helper
│       ├── seo.js            # Metadata & JSON-LD generators
│       └── time.js           # Date/time formatting helpers
```

---

## Routing Architecture

### Storefront (Route Group: `(storefront)`)

Wrapped by a persistent layout with **Navbar + CategoryNav + Footer + ScrollToTop**.

| Route | Page | Description |
|---|---|---|
| `/` | `page.js` | Home: hero banner, budget banners, popular products, categories, brands |
| `/product/[slug]` | `product/[slug]/page.js` | Product detail page (SSR + ISR, 60s revalidation) |
| `/category` | `category/page.js` | All categories listing |
| `/category/[slug]` | `category/[slug]/page.js` | Products filtered by category |
| `/search` | `search/page.js` | Product search results (q param) |
| `/cart` | `cart/page.js` | Shopping cart |
| `/wishlist` | `wishlist/page.js` | Customer wishlist |
| `/sign-in` | `sign-in/page.js` | Customer sign-in (phone OTP / email OTP) |
| `/sign-up` | `sign-up/page.js` | Customer sign-up (phone number) |
| `/forgot-password` | `forgot-password/page.js` | Forgot password |
| `/profile` | `profile/page.js` | Customer profile |
| `/account/profile` | `account/profile/page.js` | Edit profile / address book |
| `/account/orders` | `account/orders/page.js` | Order history |
| `/account/delete` | `account/delete/page.js` | Account deletion flow |
| `/orders` | `orders/page.js` | Orders (alias) |
| `/contact-us` | `contact-us/page.js` | Contact page |

### Admin Panel (Route Group: `admin/(admin)`)

Wrapped by an **auth-guarded layout** with collapsible sidebar. Unauthenticated users are redirected to `/admin/login`.

| Route | Page | Roles Allowed |
|---|---|---|
| `/admin/login` | `login/page.js` | Public |
| `/admin/dashboard` | `dashboard/page.js` | All roles |
| `/admin/products` | `products/page.js` | All roles |
| `/admin/products/[id]` | `products/[id]/page.js` | All roles |
| `/admin/categories` | `categories/page.js` | All roles |
| `/admin/brands` | `brands/page.js` | All roles |
| `/admin/banners` | `banners/page.js` | All roles (write: admin+) |
| `/admin/inventory` | `inventory/page.js` | All roles |
| `/admin/csv-import` | `csv-import/page.js` | admin, super_admin |
| `/admin/users` | `users/page.js` | super_admin only |

---

## State Management (Redux Toolkit)

The store is created by `makeStore()` and provided to Next.js App Router via `StoreProvider` (a custom `"use client"` wrapper). The store is **per-request** on the server and **singleton** on the client.

### Slices

| Slice | State Shape | Purpose |
|---|---|---|
| `auth` | `{ user, accessToken, status, authReady, registerStatus }` | Admin JWT session. Access token is **in-memory only** (never localStorage). Refreshed via `POST /api/auth/refresh` on mount. |
| `customerAuth` | `{ user, status, authReady }` | Customer Better Auth session. Session read from `authClient.getSession()` (cookie-based). |
| `cart` | `{ items[], status, pendingVariants[] }` | Shopping cart. `pendingVariants` enables per-item optimistic spinner. |
| `wishlist` | `{ products[], status }` | Customer wishlist. |
| `brands` | `{ brands[], status }` | Brand list (admin, cached). |
| `categories` | `{ categories[], status }` | Category list (admin, cached). |

---

## Authentication Design

### Admin Auth (JWT)
- **Login**: `POST /api/auth/login` → receives `{ accessToken }` in body + `refreshToken` in httpOnly cookie
- **Access Token**: Stored in Redux (`auth.accessToken`) — survives tab lifetime, lost on hard refresh
- **Token Refresh**: On app mount, `refreshAccessToken` thunk calls `POST /api/auth/refresh` to restore session
- **Axios Interceptors**: `createAuthApi.js` factory automatically refreshes the token on 401 and retries the original request
- **Route Guard**: Admin layout checks `authReady && status === "unauthenticated"` and redirects to `/admin/login`

### Customer Auth (Better Auth)
- **Library**: `better-auth` with `phoneNumberClient` and `emailOTPClient` plugins
- **Plugins**: Phone OTP sign-in/sign-up + Email OTP sign-in
- **Session**: Cookie-based httpOnly session managed by Better Auth server
- **Redux**: `restoreCustomerSession` thunk calls `authClient.getSession()` on mount
- **Axios**: `customerAxios.js` clears local auth state on 401

---

## API Communication

### Admin API
- **Base**: Axios instance created by `createAuthApi.js` factory
- **Auth**: `Authorization: Bearer <accessToken>` header injected automatically
- **Refresh**: 401 responses trigger token refresh, then retry the original request
- **Services**: `services/admin/{auth, brands, categories, products, images, inventory, banners, csvImport, users, variants}.js`

### Storefront (Authenticated Customer)
- **Base**: `customerAxios.js` — Axios with `withCredentials: true` (sends Better Auth cookie)
- **Services**: `services/storefront/{cart, wishlist, reviews, customerAuth}.js`

### Storefront (Public)
- **Base**: `publicApi.js` — plain Axios, no credentials
- **Services**: `services/storefront/{publicCatalog, publicBanners}.js`

### Next.js API Proxy
`next.config.mjs` rewrites `/api/:path*` to the backend at `https://ecom-mern-c5wz.onrender.com/api/:path*`, so httpOnly cookies stay same-origin in production.

---

## Home Page Sections

The home page (`/`) renders the following sections in order:

1. **HeroBanner** — full-width image carousel (`banner.key = "hero"`)
2. **ShopByBudget** — budget-tier banners (`banner.key = "budget"`)
3. **PopularProductsSection** — featured/popular products grid
4. **RecentlyViewedProducts** — localStorage-persisted recently viewed items
5. **ShopByCategory** — category cards grid
6. **ExploreProducts** — full product catalog with filters
7. **BrandLogos** — brand logo strip
8. **BottomBanner** — single promotional banner (`banner.key = "bottom"`)
9. **TrustFeaturesBar** — delivery / return / support USP strip
10. **FaqSection** — static FAQ accordion

---

## Product Detail Page

- **Rendering**: SSR with ISR (`revalidate: 60s`) — initial product data fetched server-side, then hydrated client-side by `ProductPageClient`
- **Features**: Variant selector, image gallery, add to cart, add to wishlist, review list, review submission, recently viewed tracking

---

## Theming

- **Storefront**: `forcedTheme="light"` — always light mode
- **Admin Panel**: Independent theme with `storageKey="admin-isolated-theme"`, defaults to dark, supports light/dark toggle. Dark class is cleaned up from `<html>` when navigating away from admin.
- Both surfaces use `next-themes` `ThemeProvider`

---

## SEO

The `lib/seo.js` module generates:
- **Page metadata** (title, description, OG, Twitter card) for products, categories, search
- **JSON-LD structured data** (WebSite, BreadcrumbList, Product) injected as `<script type="application/ld+json">`
- **Canonical URLs** per page

---

## Forms & Validation

All forms use **React Hook Form** with **Zod** schemas. Schemas live in `src/schemas/`:
- `admin/auth.js` — admin login, register
- `admin/brand.js` — create/update brand
- `admin/category.js` — create/update category
- `admin/product.js` — create/update product + variants
- `admin/inventory.js` — inventory movement
- `admin/user.js` — create/update user
- `storefront/customerAuth.js` — customer sign-in, sign-up

---

## Component Naming Conventions

| Pattern | Usage |
|---|---|
| `*View` | Top-level page content components (e.g. `CartView`, `WishlistView`) |
| `*Client` | Client-side hydration wrappers for SSR pages (e.g. `ProductPageClient`) |
| `use*` | Custom hooks (data fetching + side effects) |
| `*Slice` | Redux slice modules |
| `*Schema` | Zod validation schemas |
| `*Service` | API service modules (pure HTTP calls) |

---

## Image Handling

All images are hosted on **ImageKit**. The `next.config.mjs` allows remote images from any hostname (`**`). Images are served via ImageKit CDN URLs stored in the database.

---

## Code Quality

| Tool | Config |
|---|---|
| ESLint | `eslint-config-next` + `eslint-config-prettier` |
| Prettier | `.prettierrc` |
| Husky | Pre-commit hook via `.husky/pre-commit` |
| lint-staged | Formats and lints staged files on commit |
