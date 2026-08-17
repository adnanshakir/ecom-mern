# Fibio E-Commerce Frontend Documentation

A state-of-the-art, high-performance wholesale e-commerce storefront and administration dashboard built with **Next.js 14 (App Router)**, **React 18**, **Redux Toolkit**, and **Tailwind CSS**.

---

## 📋 Table of Contents

- [Key Architecture Highlights](#-key-architecture-highlights)
- [Directory Structure](#-directory-structure)
- [Deep Technical Features](#-deep-technical-features)
  - [1. Next.js App Router & Hybrid Server/Client Components](#1-nextjs-app-router--hybrid-serverclient-components)
  - [2. Redux Toolkit State Management](#2-redux-toolkit-state-management)
  - [3. Dual-Mode Image Uploader Studio](#3-dual-mode-image-uploader-studio)
  - [4. Storefront Banner Customization Suite](#4-storefront-banner-customization-suite)
  - [5. Catalog Filtering & Infinite Scroll Engine](#5-catalog-filtering--infinite-scroll-engine)
- [Detailed Component Architecture](#-detailed-component-architecture)
  - [App Pages (`src/app/`)](#app-pages-srcapp)
  - [Storefront Components (`src/components/storefront/`)](#storefront-components-srccomponentsstorefront)
  - [Admin Components (`src/components/admin/`)](#admin-components-srccomponentsadmin)
  - [Redux State Slices (`src/redux/slices/`)](#redux-state-slices-srcreduxslices)
  - [API Service Layer (`src/services/`)](#api-service-layer-srcservices)
- [Design System & Styling System](#-design-system--styling-system)
- [Environment Setup & Quick Start](#-environment-setup--quick-start)

---

## 🌟 Key Architecture Highlights

- **Hybrid Server/Client Component Architecture**: Public catalog & product pages leverage Next.js App Router Server Components for optimal SEO and instant initial page loads, while interactive interfaces run seamlessly as Client Components (`"use client"`).
- **Dual State Management**: Redux Toolkit slices (`authSlice`, `customerAuthSlice`, `cartSlice`, `wishlistSlice`) manage global user sessions and persistent storefront states, paired with custom React hooks (`usePublicProducts`, `usePublicCategories`, `usePublicBanners`) for clean data fetching.
- **Enterprise Admin Dashboard (`/admin/*`)**: Complete administrative suite supporting product CRUD, multi-variant management, category tree editing, brand management, CSV import processing, inventory stock adjustments, and staff user management.
- **Dual-Mode Image Uploader (`ImageUploader.jsx`)**: Advanced media uploader offering both **ImageKit cloud file uploads** and **Direct URL paste** with slot limits and single/multi-image high-resolution preview modes.
- **Dynamic Storefront Banner System**: Admin interface for configuring homepage hero and category banners with overlay color pickers, left/right content placement controls, and instant "Undo Changes" state restoration.
- **Modern Responsive Design**: Built with Tailwind CSS, custom design tokens, shadcn UI primitives, dark/light theme switching (`next-themes`), and smooth micro-animations.

---

## 📁 Directory Structure

```
client/
├── src/
│   ├── app/                         # Next.js App Router pages & layouts
│   │   ├── (storefront)/            # Public storefront route group
│   │   │   ├── cart/                # Cart view page
│   │   │   ├── catalog/             # Catalog browsing page
│   │   │   ├── category/[slug]/     # Server-rendered category page
│   │   │   ├── login/               # Customer authentication page
│   │   │   ├── product/[slug]/      # Server-rendered product detail page
│   │   │   ├── search/              # Search results page
│   │   │   ├── wishlist/            # Customer wishlist page
│   │   │   ├── layout.js            # Storefront main layout (Navbar + Footer)
│   │   │   └── page.js              # Storefront homepage
│   │   ├── admin/                   # Admin dashboard route group
│   │   │   ├── (admin)/             # Protected admin shell layout & sub-pages
│   │   │   │   ├── banners/         # Storefront banner manager page
│   │   │   │   ├── brands/          # Brand management page
│   │   │   │   ├── categories/      # Category tree manager page
│   │   │   │   ├── csv-import/      # Bulk CSV import studio page
│   │   │   │   ├── dashboard/       # Analytics dashboard page
│   │   │   │   ├── inventory/       # Stock ledger adjustment page
│   │   │   │   ├── products/        # Master product catalog manager page
│   │   │   │   └── users/           # Admin/staff user management page
│   │   │   └── login/               # Admin login page
│   │   ├── globals.css              # Custom Tailwind CSS & theme tokens
│   │   └── layout.js                # Root application HTML & Provider layout
│   ├── components/
│   │   ├── admin/                   # Admin management UI components
│   │   │   └── products/            # ImageUploader, ProductDetailsFields, VariantRowFields
│   │   ├── layout/                  # PageContainer & Section wrappers
│   │   ├── shared/                  # ApiErrorSummary & common widgets
│   │   ├── storefront/              # Storefront modular domain components
│   │   │   ├── auth/                # Customer Auth tabs & forms
│   │   │   ├── cart/                # Cart item cards & checkout drawer
│   │   │   ├── home/                # HeroBanner, CategoryBanners, BottomBanner, PopularProducts
│   │   │   ├── layout/              # Navbar, Footer, CategoryNav, Breadcrumbs, ScrollToTop
│   │   │   ├── products/            # ProductCard, ProductGrid, Gallery, VariantSelector
│   │   │   ├── wishlist/            # Wishlist grid view
│   │   │   └── index.js             # Re-export barrel file for storefront components
│   │   └── ui/                      # Primitive UI components (Button, Input, Dialog, etc.)
│   ├── hooks/
│   │   └── storefront/              # Custom React data-fetching hooks
│   │       ├── usePublicBanners.js  # Storefront banner state hook
│   │       ├── usePublicCategories.js# Public category tree hook
│   │       └── usePublicProducts.js # Paginated product catalog hook
│   ├── lib/                         # Utility functions & category tree builders
│   ├── redux/                       # Redux Toolkit store & feature slices
│   │   ├── slices/                  # auth, customerAuth, cart, wishlist, categories, brands
│   │   ├── StoreProvider.jsx        # Redux Provider wrapper
│   │   └── store.js                 # Redux store configuration
│   └── services/                    # Axios API service instances & endpoint methods
│       ├── admin/                   # Admin REST API services
│       ├── storefront/              # Public & Customer REST API services
│       └── publicApi.js             # Public Axios instance
├── public/                          # Public static assets & default fallback banners
├── next.config.mjs                  # Next.js configuration
├── tailwind.config.js               # Tailwind CSS theme customization
└── package.json                     # Dependencies & scripts
```

---

## ⚡ Deep Technical Features

### 1. Next.js App Router & Hybrid Server/Client Components
The frontend separates static SEO content from interactive client views:
- **Server Components** (`category/[slug]/page.js`, `product/[slug]/page.js`): Fetch data on the server during request time, generating complete HTML for search engines and ensuring zero client-side fetching delay on entry.
- **Client Components** (`ProductCatalogFilterView.jsx`, `ProductInteractiveSection.jsx`): Manage interactive UI states (price sliders, active category selection, variant selection, cart additions).

---

### 2. Redux Toolkit State Management
Global client state is partitioned into clean feature slices:
- **`authSlice`**: Admin user authentication token, role state (`super_admin`, `admin`, `staff`), and permission logic.
- **`customerAuthSlice`**: Storefront customer authentication session and address book.
- **`cartSlice`**: Synchronizes local cart items with backend `/api/customers/cart` API.
- **`wishlistSlice`**: Synchronizes customer saved items with `/api/customers/wishlist` API.
- **`categoriesSlice` & `brandsSlice`**: Cached master category tree and brand lists.

---

### 3. Dual-Mode Image Uploader Studio (`ImageUploader.jsx`)
Reusable image management component used across Categories, Products, Variants, and Banners:
- **Dual Source Modes**:
  - **Upload (ImageKit)**: Uploads files directly to ImageKit CDN returning cloud `{ url, fileId }`.
  - **Direct URL**: Allows pasting external public image URLs.
- **Slot Limit Enforcement**: Supports single image (`maxImages={1}`) or multi-image (`maxImages={4}`) limits.
- **High-Resolution Previews**: Renders a large preview container (`max-w-lg` up to `h-60`) for single-image modes (Banners/Categories) and compact thumbnail grids for multi-variant modes.

---

### 4. Storefront Banner Customization Suite (`/admin/banners`)
Admin interface for controlling the 4 main storefront homepage banners (`hero`, `secondary-left`, `secondary-right`, `bottom`):
- **Hero Banner**: Allows custom image selection, title, subtitle, CTA link, gradient overlay toggle, and custom overlay color selection (presets + custom color picker).
- **Secondary Category Banners**: Supports image upload, text fields, gradient overlay toggle, and **Content Placement (Left vs Right)**.
- **Bottom Banner**: Controls bulk quotation promo images and copy.
- **Undo Changes Mechanism**: Tracks working draft vs saved state per banner, allowing admins to instantly revert unsaved edits with an "Undo Changes" button before saving.

---

### 5. Catalog Filtering & Infinite Scroll Engine
Catalog page (`ProductCatalogFilterView.jsx`) features:
- **Category Tree Navigation**: Expandable parent-child category tree with active item indicators.
- **Price Range Filter**: Min/Max price inputs and range slider with quick preset buttons (Under ₹500, ₹500 - ₹2,000, etc.).
- **Automatic Infinite Scroll**: Uses `IntersectionObserver` sentinel to automatically fetch subsequent product batches as the user scrolls down.
- **Safe Empty States**: Gracefully handles non-existent categories or empty search results by displaying a clean empty state UI with a "Reset Filters" action button instead of raw technical errors.

---

## 🔍 Detailed Component Architecture

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

---

### Admin Dashboard Components (`src/components/admin/`)
- **`products/ImageUploader.jsx`**: Dual-mode ImageKit / Direct URL image uploader with single/multi previews.
- **`products/ProductDetailsFields.jsx`**: Main product form inputs (name, category, brand, description, status, featured toggle).
- **`products/VariantRowFields.jsx`**: Form inputs for individual SKU variants (SKU, price, sale price, stock, options, images).

---

### API Service Layer (`src/services/`)

#### Admin Services (`src/services/admin/`)
- **`axios.js`**: Configured Axios instance with `baseURL: "/api"`, JWT Bearer token interceptor, and token refresh handling.
- **`products.js`**: `getProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `bulkUpdateProducts`, `bulkDeleteProducts`.
- **`banners.js`**: `getAdminBanners`, `updateAdminBanner`.
- **`csvImport.js`**: `uploadCSV`, `getImportJobs`, `getImportJobById`.
- **`inventory.js`**: `adjustInventoryStock`, `getInventoryMovements`.
- **`categories.js` & `brands.js`**: Category and brand API methods.

#### Storefront Services (`src/services/storefront/`)
- **`publicCatalog.js`**: `getPublicProducts`, `getPublicProductBySlug`, `getPublicCategories`, `getSearchSuggestions`.
- **`publicBanners.js`**: `getPublicBanners`.

---

## 🎨 Design System & Styling System

- **Color Palette**: Custom HSL-tailored colors featuring primary deep teal (`#033936`), slate darks, muted accents, and crisp light/dark mode contrasts.
- **Typography**: Clean, modern sans-serif typography powered by Google Fonts Inter.
- **Components & Icons**: Built on top of Radix UI / shadcn primitive components and Lucide React icons.
- **Theme Support**: Seamless dark/light theme switching managed by `next-themes`.

---

## 🚀 Environment Setup & Quick Start

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Backend API**: Running instance of `fibio-backend` (default `http://localhost:5000`)

### 1. Installation
```bash
cd client
npm install
```

### 2. Environment File Configuration
Create a `.env.local` file in the `client` root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
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