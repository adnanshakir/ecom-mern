# Fibio E-Commerce Frontend Documentation

A state-of-the-art, high-performance wholesale e-commerce storefront and administration dashboard built with **Next.js 16 (App Router)**, **React 19**, **Redux Toolkit**, and **Tailwind CSS v4**.

---

## 📋 Table of Contents

- [Key Architecture Highlights](#-key-architecture-highlights)
- [Directory Structure](#-directory-structure)
- [Deep Technical Features](#-deep-technical-features)
  - [1. Next.js App Router & Hybrid Server/Client Components](#1-nextjs-app-router--hybrid-serverclient-components)
  - [2. Redux Toolkit State Management](#2-redux-toolkit-state-management)
  - [3. Authenticated Axios Factory (`createAuthApi.js`)](#3-authenticated-axios-factory-createauthapiejs)
  - [4. Dual-Mode Image Uploader Studio](#4-dual-mode-image-uploader-studio)
  - [5. Storefront Banner Customization Suite](#5-storefront-banner-customization-suite)
  - [6. Catalog Filtering & Infinite Scroll Engine](#6-catalog-filtering--infinite-scroll-engine)
  - [7. Route Protection Middleware](#7-route-protection-middleware)
  - [8. Form Validation with React Hook Form & Zod](#8-form-validation-with-react-hook-form--zod)
- [Detailed Component Architecture](#-detailed-component-architecture)
  - [App Pages (`src/app/`)](#app-pages-srcapp)
  - [Storefront Components (`src/components/storefront/`)](#storefront-components-srccomponentsstorefront)
  - [Admin Components (`src/components/admin/`)](#admin-components-srccomponentsadmin)
  - [Custom Hooks (`src/hooks/`)](#custom-hooks-srchooks)
  - [Redux State Slices (`src/redux/slices/`)](#redux-state-slices-srcreduxslices)
  - [API Service Layer (`src/services/`)](#api-service-layer-srcservices)
  - [Validation Schemas (`src/schemas/`)](#validation-schemas-srcschemas)
- [Design System & Styling System](#-design-system--styling-system)
- [Environment Setup & Quick Start](#-environment-setup--quick-start)

---

## 🌟 Key Architecture Highlights

- **Hybrid Server/Client Component Architecture**: Public catalog & product pages leverage Next.js App Router Server Components for optimal SEO and instant initial page loads, while interactive interfaces run seamlessly as Client Components (`"use client"`).
- **Dual State Management**: Redux Toolkit slices (`authSlice`, `customerAuthSlice`, `cartSlice`, `wishlistSlice`) manage global user sessions and persistent storefront states, paired with a rich library of custom React hooks for clean data fetching and UI logic.
- **Enterprise Admin Dashboard (`/admin/*`)**: Complete administrative suite supporting product CRUD, multi-variant management, category tree editing, brand management, CSV import processing, inventory stock adjustments, and staff user management.
- **Authenticated Axios Factory (`createAuthApi.js`)**: A shared factory that creates Axios instances with automatic Bearer token injection, a silent `401 → refresh → retry` interceptor, and concurrent-request queuing during token refresh to prevent duplicate refresh calls.
- **Dual-Mode Image Uploader (`ImageUploader.jsx`)**: Advanced media uploader offering both **ImageKit cloud file uploads** and **Direct URL paste** with slot limits and single/multi-image high-resolution preview modes.
- **Dynamic Storefront Banner System**: Admin interface for configuring homepage hero and category banners with overlay color pickers, left/right content placement controls, and instant "Undo Changes" state restoration.
- **Next.js Route Guard Middleware**: Server-side cookie-based guard protecting all `/admin/*` routes, redirecting unauthenticated users to `/admin/login`.
- **Comprehensive Validation**: All forms use **React Hook Form** + **Zod** schemas (from `src/schemas/`) for type-safe, declarative validation with real-time field feedback.
- **SEO Infrastructure**: Auto-generated `sitemap.xml` (`sitemap.js`) and `robots.txt` (`robots.js`) with environment-aware base URLs.
- **Modern Responsive Design**: Built with Tailwind CSS v4, custom design tokens, shadcn/Base UI primitives, dark/light theme switching (`next-themes`), and smooth micro-animations.

---

## 📁 Directory Structure

```
client/
├── src/
│   ├── app/                             # Next.js App Router pages & layouts
│   │   ├── (storefront)/                # Public storefront route group
│   │   │   ├── account/                 # Customer account hub (profile & orders sub-routes)
│   │   │   │   ├── orders/              # Customer order history page
│   │   │   │   └── profile/             # Customer profile edit page
│   │   │   ├── cart/                    # Cart view page
│   │   │   ├── category/                # Category browsing pages
│   │   │   ├── contact-us/              # Contact/enquiry page
│   │   │   ├── login/                   # Customer authentication page
│   │   │   ├── product/                 # Product detail pages
│   │   │   ├── search/                  # Search results page
│   │   │   ├── wishlist/                # Customer wishlist page
│   │   │   ├── layout.js                # Storefront main layout (Navbar + Footer)
│   │   │   └── page.js                  # Storefront homepage
│   │   ├── admin/                       # Admin dashboard route group
│   │   │   ├── (admin)/                 # Protected admin shell layout & sub-pages
│   │   │   │   ├── banners/             # Storefront banner manager page
│   │   │   │   ├── brands/              # Brand management page
│   │   │   │   ├── categories/          # Category tree manager page
│   │   │   │   ├── csv-import/          # Bulk CSV import studio page
│   │   │   │   ├── dashboard/           # Analytics dashboard page
│   │   │   │   ├── inventory/           # Stock ledger adjustment page
│   │   │   │   ├── products/            # Master product catalog manager page
│   │   │   │   ├── users/               # Admin/staff user management page
│   │   │   │   └── layout.js            # Admin shell layout (Sidebar + Header)
│   │   │   └── login/                   # Admin login page
│   │   ├── globals.css                  # Custom Tailwind CSS v4 & theme tokens
│   │   ├── layout.js                    # Root application HTML & Provider layout
│   │   ├── robots.js                    # Auto-generated robots.txt (disallows /admin, /cart, etc.)
│   │   └── sitemap.js                   # Auto-generated sitemap.xml
│   ├── components/
│   │   ├── admin/                       # Admin management UI components
│   │   │   └── products/                # ImageUploader, ProductDetailsFields, VariantRowFields
│   │   ├── layout/                      # PageContainer & Section wrappers
│   │   ├── shared/                      # ApiErrorSummary & common widgets
│   │   ├── storefront/                  # Storefront modular domain components
│   │   │   ├── account/                 # ProfileView, OrdersView customer account components
│   │   │   ├── auth/                    # Customer Auth tabs & forms
│   │   │   ├── cart/                    # Cart item cards & checkout drawer
│   │   │   ├── category/                # Category-specific storefront components
│   │   │   ├── contact/                 # ContactUsView enquiry form
│   │   │   ├── home/                    # HeroBanner, CategoryBanners, BottomBanner, PopularProducts
│   │   │   ├── layout/                  # Navbar, Footer, CategoryNav, Breadcrumbs, ScrollToTop
│   │   │   ├── products/                # ProductCard, ProductGrid, Gallery, VariantSelector
│   │   │   ├── wishlist/                # Wishlist grid view
│   │   │   └── index.js                 # Re-export barrel file for storefront components
│   │   └── ui/                          # Primitive UI components (Button, Input, Dialog, etc.)
│   ├── hooks/
│   │   ├── admin/                       # Admin-specific data & UI hooks
│   │   │   ├── useAuth.js               # Admin auth state & token management
│   │   │   ├── useBrands.js             # Brand CRUD operations
│   │   │   ├── useCategories.js         # Category tree CRUD
│   │   │   ├── useCreateProduct.js      # New product form logic
│   │   │   ├── useCreateUser.js         # New user form logic
│   │   │   ├── useCsvImport.js          # CSV upload & job polling
│   │   │   ├── useEditProduct.js        # Edit product form logic
│   │   │   ├── useInventoryMovements.js # Inventory ledger data fetching
│   │   │   ├── useProduct.js            # Single product data fetching
│   │   │   ├── useProductPicker.js      # Product picker modal state
│   │   │   ├── useProductVariants.js    # Variant management CRUD
│   │   │   ├── useProducts.js           # Paginated product list with filters
│   │   │   ├── useRecentImports.js      # Recent CSV import jobs
│   │   │   ├── useUrlFilters.js         # URL query param-based filter state
│   │   │   └── useUsers.js              # Staff/admin user CRUD
│   │   ├── shared/
│   │   │   └── useDebouncedValue.js     # Generic debounce hook
│   │   ├── storefront/                  # Storefront data-fetching & interaction hooks
│   │   │   ├── useCart.js               # Cart sync & mutation helpers
│   │   │   ├── usePublicBanners.js      # Storefront banner state hook
│   │   │   ├── usePublicCategories.js   # Public category tree hook
│   │   │   ├── usePublicProduct.js      # Single product detail hook
│   │   │   ├── usePublicProducts.js     # Paginated product catalog hook
│   │   │   ├── useRecentlyViewed.js     # Recently viewed products (localStorage)
│   │   │   ├── useSearchSuggestions.js  # Debounced search autocomplete hook
│   │   │   ├── useVariantSelector.js    # Variant option selection & stock state
│   │   │   └── useWishlist.js           # Wishlist sync & toggle helpers
│   │   └── useConfirm.js                # Reusable confirmation dialog hook
│   ├── lib/                             # Utility functions & category tree builders
│   ├── middleware.js                    # Next.js Edge middleware (admin route guard)
│   ├── redux/                           # Redux Toolkit store & feature slices
│   │   ├── slices/                      # auth, customerAuth, cart, wishlist, categories, brands
│   │   ├── StoreProvider.jsx            # Redux Provider wrapper
│   │   └── store.js                     # Redux store configuration
│   ├── schemas/                         # Zod + React Hook Form validation schemas
│   │   ├── admin/
│   │   │   ├── auth.js                  # Admin login schema
│   │   │   ├── brand.js                 # Brand create/edit schema
│   │   │   ├── category.js              # Category create/edit schema
│   │   │   ├── inventory.js             # Stock adjustment schema
│   │   │   ├── product.js               # Product & variant schemas
│   │   │   └── user.js                  # User create/edit schema
│   │   ├── shared/                      # Shared Zod primitives
│   │   └── storefront/
│   │       # Customer auth & profile schemas
│   └── services/                        # Axios API service instances & endpoint methods
│       ├── admin/                        # Admin REST API services
│       │   ├── axios.js                 # Admin Axios instance (via createAuthApi factory)
│       │   ├── auth.js                  # Admin auth API calls
│       │   ├── banners.js               # Banner CRUD
│       │   ├── brands.js                # Brand CRUD
│       │   ├── categories.js            # Category CRUD
│       │   ├── csvImport.js             # CSV upload & job status
│       │   ├── images.js                # ImageKit upload
│       │   ├── inventory.js             # Stock adjustment & movements
│       │   ├── products.js              # Product CRUD
│       │   ├── users.js                 # User management
│       │   └── variants.js              # Variant CRUD
│       ├── storefront/                  # Public & Customer REST API services
│       │   ├── customerAxios.js         # Customer Axios instance (via createAuthApi factory)
│       │   ├── cart.js                  # Cart API calls
│       │   ├── customerAuth.js          # Customer auth API calls
│       │   ├── publicBanners.js         # Public banner fetching
│       │   ├── publicCatalog.js         # Public product & category fetching
│       │   └── wishlist.js              # Wishlist API calls
│       ├── createAuthApi.js             # Authenticated Axios factory (shared by admin & customer)
│       └── publicApi.js                 # Unauthenticated public Axios instance
├── public/                              # Public static assets & default fallback banners
├── next.config.mjs                      # Next.js configuration
├── tailwind.config.js                   # Tailwind CSS v4 theme customization
└── package.json                         # Dependencies & scripts
```

---

## ⚡ Deep Technical Features

### 1. Next.js App Router & Hybrid Server/Client Components
The frontend separates static SEO content from interactive client views:
- **Server Components** (`product/[slug]/page.js`, category pages): Fetch data on the server during request time, generating complete HTML for search engines and ensuring zero client-side fetching delay on entry.
- **Client Components** (`ProductCatalogFilterView.jsx`, `ProductInteractiveSection.jsx`): Manage interactive UI states (price sliders, active category selection, variant selection, cart additions).
- **SEO Automation**: `robots.js` generates a `robots.txt` at runtime disallowing `/admin`, `/cart`, `/account`, `/orders`, `/wishlist`, etc. `sitemap.js` generates a `sitemap.xml` from the live product & category catalog.

---

### 2. Redux Toolkit State Management
Global client state is partitioned into clean feature slices:
- **`authSlice`**: Admin user `accessToken`, role state (`super_admin`, `admin`, `staff`), and permission logic. The token lives in memory only (never localStorage) for XSS safety.
- **`customerAuthSlice`**: Storefront customer authentication session, `accessToken`, and address book.
- **`cartSlice`**: Synchronizes local cart items with backend `/api/customers/cart` API.
- **`wishlistSlice`**: Synchronizes customer saved items with `/api/customers/wishlist` API.
- **`categoriesSlice` & `brandsSlice`**: Cached master category tree and brand lists shared across admin pages.

---

### 3. Authenticated Axios Factory (`createAuthApi.js`)
A shared factory function used to create both the admin and customer Axios instances:

```
createAuthenticatedApi({ stateKey, refreshUrlFragment, loadAuth })
        │
        ├──► Injects Bearer token from Redux state on every request
        │
        └──► On 401 response:
              ├── If already refreshing → queue request until refresh completes
              ├── Dispatch refreshThunk() using the HttpOnly refresh cookie
              ├── On success → update token in Redux, retry original request
              └── On failure → dispatch logoutAction(), reject all queued requests
```

This ensures only one refresh call is in-flight at a time, even when multiple requests fail simultaneously with a 401.

---

### 4. Dual-Mode Image Uploader Studio (`ImageUploader.jsx`)
Reusable image management component used across Categories, Products, Variants, and Banners:
- **Dual Source Modes**:
  - **Upload (ImageKit)**: Uploads files directly to ImageKit CDN returning cloud `{ url, fileId }`.
  - **Direct URL**: Allows pasting external public image URLs.
- **Slot Limit Enforcement**: Supports single image (`maxImages={1}`) or multi-image (`maxImages={4}`) limits.
- **High-Resolution Previews**: Renders a large preview container for single-image modes (Banners/Categories) and compact thumbnail grids for multi-variant modes.

---

### 5. Storefront Banner Customization Suite (`/admin/banners`)
Admin interface for controlling the 4 main storefront homepage banners (`hero`, `secondary-left`, `secondary-right`, `bottom`):
- **Hero Banner**: Allows custom image selection, title, subtitle, CTA link, gradient overlay toggle, and custom overlay color selection (presets + custom color picker).
- **Secondary Category Banners**: Supports image upload, text fields, gradient overlay toggle, and **Content Placement (Left vs Right)**.
- **Bottom Banner**: Controls bulk quotation promo images and copy.
- **Undo Changes Mechanism**: Tracks working draft vs saved state per banner, allowing admins to instantly revert unsaved edits with an "Undo Changes" button before saving.

---

### 6. Catalog Filtering & Infinite Scroll Engine
Catalog page (`ProductCatalogFilterView.jsx`) features:
- **Category Tree Navigation**: Expandable parent-child category tree with active item indicators.
- **Price Range Filter**: Min/Max price inputs and range slider with quick preset buttons (Under ₹500, ₹500 - ₹2,000, etc.).
- **Automatic Infinite Scroll**: Uses `IntersectionObserver` sentinel to automatically fetch subsequent product batches as the user scrolls down.
- **Safe Empty States**: Gracefully handles non-existent categories or empty search results by displaying a clean empty state UI with a "Reset Filters" action button instead of raw technical errors.

---

### 7. Route Protection Middleware
`src/middleware.js` runs as a Next.js Edge Middleware and guards all `/admin/*` routes:

```
Incoming request to /admin/*
        │
        ├── Has `refreshToken` HttpOnly cookie?
        │       ├── No  → Redirect to /admin/login?from=<pathname>
        │       └── Yes → Is route /admin/login?
        │                   ├── Yes → Redirect to /admin/dashboard (already logged in)
        │                   └── No  → Allow through
        │
        └── All non-admin routes → Allow through (customer auth handled separately)
```

---

### 8. Form Validation with React Hook Form & Zod
All forms across both admin and storefront use **React Hook Form** with **Zod** resolvers:
- Schemas live in `src/schemas/` mirroring the server's validation structure.
- `@hookform/resolvers/zod` connects schema to form, providing real-time per-field error messages.
- `isomorphic-dompurify` sanitizes any rich-text/HTML content before submission.
- **Sonner** (`sonner`) is used for toast notifications on form success and error states.

---

## 🔍 Detailed Component Architecture

### App Pages (`src/app/`)

#### Storefront Pages (`src/app/(storefront)/`)
| Route | Description |
| :--- | :--- |
| `/` | Homepage (HeroBanner, CategoryBanners, PopularProducts, BottomBanner) |
| `/category/[slug]` | Category product listing |
| `/product/[slug]` | Product detail with variant selection & add-to-cart |
| `/cart` | Shopping cart |
| `/wishlist` | Saved items |
| `/search` | Search results |
| `/login` | Customer login & registration |
| `/account/profile` | Customer profile editing |
| `/account/orders` | Customer order history |
| `/contact-us` | Contact/enquiry form |

#### Admin Pages (`src/app/admin/(admin)/`)
| Route | Description |
| :--- | :--- |
| `/admin/dashboard` | Analytics overview & stock alerts |
| `/admin/products` | Product list, create, edit, bulk operations |
| `/admin/categories` | Category tree management |
| `/admin/brands` | Brand management |
| `/admin/banners` | Homepage banner configuration |
| `/admin/inventory` | Manual stock adjustments & movement log |
| `/admin/csv-import` | Bulk product CSV import |
| `/admin/users` | Staff & admin user management |

---

### Storefront Modular Components (`src/components/storefront/`)

#### Layout (`src/components/storefront/layout/`)
- **`Navbar.jsx`**: Main header featuring logo, real-time search bar with autocomplete suggestions dropdown, customer auth menu, cart drawer badge, and mobile drawer.
- **`CategoryNav.jsx`**: Sticky horizontal category navigation bar.
- **`Footer.jsx`**: Multi-column site footer with link sections, payment badges, and newsletter signup.
- **`Breadcrumbs.jsx`**: Dynamic breadcrumb navigation trail.
- **`ScrollToTop.jsx`**: Floating scroll-to-top button appearing on long pages.

#### Home (`src/components/storefront/home/`)
- **`HeroBanner.jsx`**: Dynamic top hero banner with background overlay and value proposition badges.
- **`CategoryBanners.jsx`**: Left and right promotional category cards supporting left/right text alignment.
- **`BottomBanner.jsx`**: Bulk order quote callout section.
- **`PopularProductsSection.jsx`**: Category-filtered homepage product showcase.
- **`BrandLogos.jsx`**: Interactive brand logos carousel.
- **`TrustFeaturesBar.jsx`**: Trust badges (Wholesale Prices, Bulk Discounts, Fast Delivery).

#### Products (`src/components/storefront/products/`)
- **`ProductCard.jsx`**: Reusable product card with image hover zoom, price tag, variant badge, and quick add/wishlist buttons.
- **`ProductGrid.jsx`**: Responsive grid container for product cards.
- **`ProductCatalogFilterView.jsx`**: Main catalog browsing layout with sidebar filters, sorting, and infinite scroll.
- **`ProductGallery.jsx`**: Interactive main product detail image viewer with thumbnail selector.
- **`ProductInteractiveSection.jsx`**: Handles variant option selection (Color, Size, etc.), live stock calculation, price calculation, and add-to-cart actions.
- **`VariantSelector.jsx`**: Option pill selector for product variants.
- **`QuantitySelector.jsx`**: Increment/decrement quantity input control.
- **`RelatedProducts.jsx`**: Recommended products from the same category.

#### Account (`src/components/storefront/account/`)
- **`ProfileView.jsx`**: Customer profile editing form — personal info, password change, and address book management (add/edit/delete addresses).
- **`OrdersView.jsx`**: Customer order history listing with order status display.

#### Contact (`src/components/storefront/contact/`)
- **`ContactUsView.jsx`**: Full contact/enquiry page with form validation, business details, and map/location info.

---

### Admin Dashboard Components (`src/components/admin/`)
- **`products/ImageUploader.jsx`**: Dual-mode ImageKit / Direct URL image uploader with single/multi previews.
- **`products/ProductDetailsFields.jsx`**: Main product form inputs (name, category, brand, description, status, featured toggle).
- **`products/VariantRowFields.jsx`**: Form inputs for individual SKU variants (SKU, price, sale price, stock, options, images).

---

### Custom Hooks (`src/hooks/`)

#### Admin Hooks (`src/hooks/admin/`)
Encapsulate all admin data-fetching, form logic, and mutation operations. Each hook owns its loading, error, and data state, exposing clean APIs to page components:

| Hook | Purpose |
| :--- | :--- |
| `useAuth` | Admin token refresh & logout |
| `useProducts` | Paginated products list + bulk operations |
| `useProduct` | Single product data fetching |
| `useCreateProduct` | Create product form state & submission |
| `useEditProduct` | Edit product form state & submission |
| `useProductVariants` | Variant list CRUD per product |
| `useProductPicker` | Product search picker modal |
| `useCategories` | Category tree CRUD |
| `useBrands` | Brand CRUD |
| `useUsers` | Staff/admin user CRUD |
| `useCreateUser` | New user form |
| `useCsvImport` | CSV file upload & import job polling |
| `useRecentImports` | Recent import jobs list |
| `useInventoryMovements` | Inventory ledger data |
| `useUrlFilters` | Syncs filter state to URL query params |

#### Storefront Hooks (`src/hooks/storefront/`)

| Hook | Purpose |
| :--- | :--- |
| `usePublicProducts` | Paginated product catalog with filters |
| `usePublicProduct` | Single product detail |
| `usePublicCategories` | Public category tree |
| `usePublicBanners` | Storefront banner configs |
| `useSearchSuggestions` | Debounced autocomplete search |
| `useCart` | Cart sync, add, update, remove |
| `useWishlist` | Wishlist sync & toggle |
| `useVariantSelector` | Variant option selection & live stock |
| `useRecentlyViewed` | Recently viewed products (localStorage) |

#### Shared Hooks
- **`useConfirm`**: Reusable confirmation dialog hook — returns a `confirm()` promise that resolves on user acceptance.
- **`useDebouncedValue`**: Generic debounce hook used by search inputs.

---

### Redux State Slices (`src/redux/slices/`)
- **`authSlice`**: Admin access token (in-memory), user info, role, loading state.
- **`customerAuthSlice`**: Customer access token (in-memory), customer info, addresses.
- **`cartSlice`**: Cart items array, total count, syncing state.
- **`wishlistSlice`**: Wishlist product IDs, syncing state.
- **`categoriesSlice`**: Cached flat & tree category lists for admin dropdowns.
- **`brandsSlice`**: Cached brand list for admin dropdowns.

---

### API Service Layer (`src/services/`)

#### Authenticated Axios Factory
**`createAuthApi.js`** — creates Axios instances with automatic token injection and `401 → silent refresh → retry` interceptor. Both admin and customer Axios instances (`services/admin/axios.js` and `services/storefront/customerAxios.js`) are built using this factory.

#### Admin Services (`src/services/admin/`)
- **`axios.js`**: Admin Axios instance with `baseURL: "/api"`.
- **`auth.js`**: `login`, `logout`, `refresh`, `getMe`.
- **`products.js`**: `getProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `bulkUpdateProducts`, `bulkDeleteProducts`.
- **`variants.js`**: `createVariant`, `updateVariant`, `deleteVariant`.
- **`banners.js`**: `getAdminBanners`, `updateAdminBanner`.
- **`csvImport.js`**: `uploadCSV`, `getImportJobs`, `getImportJobById`.
- **`inventory.js`**: `adjustInventoryStock`, `getInventoryMovements`.
- **`categories.js`**: Category CRUD.
- **`brands.js`**: Brand CRUD.
- **`images.js`**: `uploadImage` — uploads to ImageKit via `/api/images/upload`.
- **`users.js`**: Staff/admin user CRUD.

#### Storefront Services (`src/services/storefront/`)
- **`customerAxios.js`**: Customer Axios instance with auto token refresh.
- **`publicCatalog.js`**: `getPublicProducts`, `getPublicProductBySlug`, `getPublicCategories`, `getSearchSuggestions`.
- **`publicBanners.js`**: `getPublicBanners`.
- **`customerAuth.js`**: `register`, `login`, `logout`, `refresh`, `getProfile`.
- **`cart.js`**: `getCart`, `addToCart`, `updateCartItem`, `removeFromCart`, `clearCart`.
- **`wishlist.js`**: `getWishlist`, `toggleWishlist`.

#### Public Services
- **`publicApi.js`**: Unauthenticated Axios instance for public endpoints.

---

### Validation Schemas (`src/schemas/`)
Zod schemas used with React Hook Form across all forms:

#### Admin Schemas (`src/schemas/admin/`)
- **`auth.js`**: Admin login form schema.
- **`product.js`**: Product create/edit and variant schemas.
- **`category.js`**: Category create/edit.
- **`brand.js`**: Brand create/edit.
- **`inventory.js`**: Stock adjustment form.
- **`user.js`**: User create/edit with role validation.

---

## 🎨 Design System & Styling System

- **Color Palette**: Custom HSL-tailored colors featuring primary deep teal (`#033936`), slate darks, muted accents, and crisp light/dark mode contrasts.
- **Typography**: Clean, modern sans-serif typography powered by Google Fonts Inter.
- **Component Libraries**: Built on top of **shadcn** (Radix UI primitives) and **Base UI** (`@base-ui/react`) for accessible, unstyled components.
- **Icons**: Lucide React (`lucide-react`).
- **Toasts**: Sonner (`sonner`) for lightweight, accessible notifications.
- **Theme Support**: Seamless dark/light theme switching managed by `next-themes`.
- **Tailwind CSS v4**: Uses the new PostCSS-based Tailwind v4 pipeline with `@tailwindcss/postcss`.

---

## 🚀 Environment Setup & Quick Start

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Backend API**: Running instance of the `server/` (default `http://localhost:5000`)

### 1. Installation
```bash
cd client
npm install
```

### 2. Environment File Configuration
Create a `.env.local` file in the `client/` root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
```
The client application will start at `http://localhost:3000`.

---

### 4. Build for Production
```bash
# Generate optimized production bundle
npm run build

# Start production server
npm start
```

### 5. Linting & Formatting
```bash
# Run ESLint
npm run lint

# Auto-fix ESLint issues
npm run lint:fix

# Format with Prettier
npm run format

# Check formatting without writing
npm run format:check
```
Husky + lint-staged run Prettier and ESLint automatically on every `git commit`.