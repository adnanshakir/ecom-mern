# Fibio Wholesale: Frontend Design Document

Read Part 1 before any UI work. Part 2 is the architecture reference.

---

# PART 1: DESIGN SYSTEM (admin + storefront)

## Principle
Calm, minimal, utility-first. The admin and the storefront look like one product: same radius, same shadows, same icons, same motion, same status colors. Only density and theme differ.

## Never do (looks AI-generated)
- No glows, neon, gradient text, or decorative gradients.
- No colored boxes behind icons. No emoji as UI icons (emoji only inside notification message text).
- No ALL-CAPS micro-labels, no "Live" or "New" pills used as decoration.
- No duplicate information across blocks. No expandable panels or inner scroll areas for summaries.
- No borders on cards. Separate with space, shadow or a faint hover background.

## Shared tokens
- Radius: cards 12px, buttons and inputs 8px, chips 6px.
- Surface: `.surface` (soft shadow, subtle vertical gradient, lighter at the top and darker at the bottom). Defined in `globals.css` with a dark variant (admin) and a light variant (storefront). Interactive cards add `.surface-hover`.
- Icons: lucide-react only, 16px in cards and 20px in navigation, stroke 1.75, muted color.
- Font: Geist Sans. Numbers use `tabular-nums`. Currency uses `formatCurrency` (INR, en-IN).
- Color is reserved for STATUS only, shown as soft chips (`bg-{c}-500/10 text-{c}-400`): placed = blue, packed = amber, shipped = violet, delivered and paid = green, cancelled and failed = red. One shared `StatusBadge` component. One primary action color from the theme.
- Type scale: page title 20px semibold, card title 14px medium, labels 12px muted (sentence case), body 14px.

## Motion
- Allowed: 200ms fade-up on first render (`.fade-up`), 150ms hover transitions, skeleton loaders.
- Not allowed: bouncing, spinning decoration, scale pops, count-up numbers, framer-motion.
- Respect `prefers-reduced-motion` everywhere (the ticker wraps text instead of scrolling when reduced).

## Forms and controls
- Hooks own all state; pages only render.
- shadcn `Select` shows human labels, never ids or raw keys. Use segmented buttons for 4 or fewer choices.
- Multi-step flows (like Send Notification) show one step at a time. Never show `{{placeholders}}` or database ids to users.
- Pickers with result lists use native `<button type="button">` with a visible focus ring.
- Dropdowns use `position="popper"` so they stay anchored while the page scrolls.

## Admin rules
- Default dark theme with a light toggle. Dense but spacious (comfortable padding, no clutter).
- Layout by importance: needs-action first (orders), then monitoring (stock, activity).
- Lists show at most 5 rows with a "View all" link.
- Shared components: `SectionCard`, `KpiCard`, `StatusBadge` (in `components/admin/`). Reuse them on every admin page.

## Storefront rules
- Always light theme, never `dark`. Airy: bigger spacing and larger images.
- Product cards: `.surface .surface-hover`, image first (consistent aspect ratio, `object-cover`), name clamped to 2 lines, price semibold with `tabular-nums`, discount as a small green chip, one primary action.
- One accent color (theme primary) for buttons and links. No colored section backgrounds.
- Announcement ticker: black bar at the very top, text scrolling right to left, pauses on hover, dismiss button hides it until the next page load.
- Skeletons match card shape. Empty states use one muted line and an icon.
- Mobile first: 2-column product grids, large tap targets (min 44px).

---

# PART 2: ARCHITECTURE

## Overview
Fibio Wholesale is a full-stack wholesale e-commerce platform. The frontend is a Next.js 16 app (App Router, React 19, Tailwind CSS v4, shadcn/ui) with two surfaces: the **Storefront** (public customers) and the **Admin Panel** (internal). A separate Flutter app uses the same backend (customer APIs and push notifications).

## Tech stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), JavaScript (JSX) |
| Styling | Tailwind CSS v4 + `tw-animate-css` |
| Components | shadcn/ui (Radix) |
| State | Redux Toolkit |
| Forms | React Hook Form + Zod |
| HTTP | Axios (custom interceptors) |
| Customer auth | Better Auth (phone OTP + email OTP) |
| Admin auth | Custom JWT (access token in memory, refresh token httpOnly cookie) |
| Fonts | Geist Sans and Mono |
| Toasts, icons, theme | Sonner, Lucide React, next-themes |
| Misc | isomorphic-dompurify, input-otp, react-barcode and qrcode.react (invoice) |

## Structure (client/src)
```
app/
  layout.js, globals.css (tokens, .surface, ticker CSS, print CSS), robots.js, sitemap.js
  (storefront)/  page, product/[slug], category, search, cart, wishlist, sign-in, sign-up,
                 forgot-password, orders, profile, account/*, contact-us
  admin/login
  admin/(admin)/ dashboard, products, categories, brands, banners, inventory,
                 csv-import, users, orders, orders/[id]/invoice, notifications
components/
  ui/ (shadcn)   layout/   theme-provider.jsx
  admin/         RoleGate, StatusBadge, dashboard/ (KpiCard, SectionCard), banners/,
                 csv-import/, products/, orders/ (InvoiceTemplate)
  storefront/    layout/ (Navbar, CategoryNav, Footer, TickerBar), auth/, home/, products/,
                 cart/, wishlist/, category/, account/, reviews/
hooks/           admin/ (useProducts, useOrders, useNotifications, ...),
                 storefront/ (useCart, useWishlist, ...), shared/
services/        createAuthApi.js, publicApi.js, admin/ (..., adminOrderService,
                 adminNotificationService), storefront/
redux/           store, StoreProvider, slices: auth, customerAuth, cart, wishlist, brands, categories
schemas/         admin/, storefront/ (Zod)
lib/             apiBaseUrl, authClient, jwt, utils (cn), formatCurrency, productPrice,
                 productSanitizers, categoryTree, parseApiError, redirect, seo, time,
                 notificationTpl, storeInfo
```
Unauthenticated storefront calls (including the ticker) use `services/storefront/publicApi.js`. Admin calls use the `createAuthApi` instance.

## Routing
**Storefront:** home, `/product/[slug]` (SSR + ISR 60s), `/category`, `/category/[slug]`, `/search`, `/cart`, `/wishlist`, auth pages, `/profile`, `/account/*`, `/orders`, `/contact-us`. The layout has Navbar, CategoryNav, Footer and ScrollToTop, with the TickerBar above the Navbar.

**Admin** (auth-guarded layout with sidebar; redirects to `/admin/login`):
| Route | Roles |
|---|---|
| `/admin/dashboard`, `/products`, `/categories`, `/brands`, `/inventory` | all roles |
| `/admin/banners` | all roles (write: admin and above) |
| `/admin/orders`, `/admin/orders/[id]/invoice` | all roles |
| `/admin/notifications` | admin, super_admin |
| `/admin/csv-import` | admin, super_admin |
| `/admin/users` | super_admin |

## State (Redux)
`auth` (admin JWT, in memory, refreshed on mount via `POST /api/auth/refresh`), `customerAuth` (Better Auth session), `cart`, `wishlist`, `brands`, `categories`. Store is per request on the server and a singleton on the client.

## Authentication
- **Admin:** login returns an access token in the body and a refresh token in an httpOnly cookie. `createAuthApi` refreshes on 401 and retries.
- **Customer:** Better Auth, cookie-based session. `customerAxios.js` clears local auth state on 401.

## API
Next.js rewrites `/api/:path*` to the backend (`https://ecom-mern-c5wz.onrender.com/api/:path*`) so cookies stay same-origin.

## Orders and invoices (admin)
- Orders page: filters, paginated table, details sheet, status updates, and a "New" marker for unseen orders. The sidebar shows a badge with the new-order count.
- Invoice route `/admin/orders/[id]/invoice` opens in a new tab and auto-prints. It has no product images. It includes an Amazon-style Ship To label with a Code128 barcode and QR (order number) and a payment line (PREPAID only when paid; COD amount shown for unpaid COD).
- Only the invoice prints: `@media print` in `globals.css` hides everything else. Store details live in `lib/storeInfo.js`.

## Notifications
- **Admin Notification Center** (3 tabs: Send, Templates, History). Send is a 3-step wizard (template card, message, where and when). Templates use `{{variables}}` with friendly labels from `lib/notificationTpl.js`. History auto-refreshes while items are scheduled or sending.
- **Channels:** app (push), website (ticker), or both. Optional image URL and "Open screen" link.
- **Website ticker:** `TickerBar` fetches `GET /api/public/ticker` every 5 minutes and loops the text to fill the full width.
- **App push (backend only):** Firebase Cloud Messaging. The backend broadcasts to the topic `all`, and sends personal pushes (restock, order shipped, delivered) to saved device tokens. The Flutter app registers tokens via `POST /api/customer/devices` and removes them with `DELETE`. Android channel id is `fibio_default`.
- Firebase credentials live only on the backend as `FIREBASE_SERVICE_ACCOUNT_B64`. Never in client code.

## Theming
- Storefront: `forcedTheme="light"`.
- Admin: isolated theme (`storageKey="admin-isolated-theme"`), default dark, light/dark toggle. The `dark` class is removed from `<html>` when leaving admin.
- `.surface` has a dark variant and a light variant. Dark mode is the `dark` class on `<html>`.

## SEO
`lib/seo.js` generates page metadata (title, description, OG, Twitter), JSON-LD (WebSite, BreadcrumbList, Product) and canonical URLs.

## Forms
React Hook Form + Zod. Schemas live in `src/schemas/` (admin: auth, brand, category, product, inventory, user; storefront: customerAuth).

## Naming conventions
`*View` (page content), `*Client` (SSR hydration wrappers), `use*` (hooks own all state and data fetching), `*Slice`, `*Schema`, `*Service` (pure HTTP calls).

## Images
All images are hosted on ImageKit and allowed in `next.config.mjs`. Push notification images must go through `pushImage()` in `notificationService.js`, which appends `?tr=w-800,h-400,fo-auto,q-70`. Never use `?w=...&q=...` on ImageKit URLs, because that format is not ImageKit's.

## Code quality
ESLint (`eslint-config-next`, `eslint-config-prettier`), Prettier, Husky pre-commit, lint-staged.