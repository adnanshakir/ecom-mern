# Fibio Wholesale — Backend Documentation

## Overview

The backend is an **Express 5** REST API server written in **JavaScript (ES Modules)**. It connects to a **MongoDB** database via **Mongoose** and is deployed on **Render**. The server exposes two distinct API surfaces:

- **Admin API** — JWT-authenticated endpoints for managing the store (products, inventory, users, etc.)
- **Customer API** — Better Auth session-authenticated endpoints for the storefront (cart, payments, wishlist, reviews, profile)
- **Public API** — Unauthenticated endpoints for the storefront catalog

---

## Tech Stack

| Layer         | Technology                                                   |
| ------------- | ------------------------------------------------------------ |
| Runtime       | Node.js (ES Modules `"type": "module"`)                      |
| Framework     | Express 5                                                    |
| Database      | MongoDB via Mongoose 9                                       |
| Admin Auth    | Custom JWT (`jsonwebtoken`) — access + refresh token pattern |
| Customer Auth | Better Auth 1.7 (phone OTP + email OTP plugins)              |
| Image Storage | ImageKit                                                     |
| Validation    | Zod 4                                                        |
| Rate Limiting | `express-rate-limit`                                         |
| Security      | Helmet, CORS (allowlist-based)                               |
| Logging       | Morgan                                                       |
| File Uploads  | Multer (images) + `csv-parse` / `fast-csv` (CSV import)      |
| Testing       | Jest + Supertest + `mongodb-memory-server`                   |
| Dev Tooling   | Nodemon, Prettier, ESLint, Husky, lint-staged                |

---

## Project Structure

```
server/
├── server.js                 # Entry point: connects DB, initialises auth, starts server
├── src/
│   ├── app.js                # Express app: middleware stack + route mounting
│   ├── config/
│   │   ├── config.js         # Environment variable loading + validation (fails fast)
│   │   ├── customerAuth.js   # Better Auth factory + handler (phone OTP + email OTP)
│   │   ├── customerAuth.test.config.js  # Isolated auth config for tests
│   │   ├── db.js             # Mongoose connection helper
│   │   └── otpHelper.js      # Shared OTP verification logic (master OTP support)
│   ├── controllers/
│   │   ├── admin/            # Auth, Brand, Category, Product, ProductVariant,
│   │   │                     # CSV Import, Dashboard, Image, Inventory, User, Banner
│   │   └── customer/         # Account, Cart, CustomerImage, Profile, Public, Review, Wishlist
│   ├── middleware/
│   │   ├── authenticate.middleware.js         # Admin JWT verification
│   │   ├── authenticateCustomer.middleware.js # Customer Better Auth session verification
│   │   ├── authorize.middleware.js            # Role-based access control (RBAC)
│   │   ├── csvUpload.middleware.js            # Multer for CSV files
│   │   ├── upload.middleware.js               # Multer for image files
│   │   ├── validate.middleware.js             # Zod schema validation
│   │   └── error.middleware.js               # Global error handler + 404 handler
│   ├── models/
│   │   ├── admin/            # User, Brand, Category, Product, ProductVariant,
│   │   │                     # Banner, InventoryMovement, ImportJob, ActivityLog, RefreshToken
│   │   └── customer/         # CustomerProfile, Cart, Wishlist, Review
│   ├── routes/
│   │   ├── admin/            # auth, brand, category, product, dashboard, image,
│   │   │                     # inventory, user, banner
│   │   └── customer/         # account, cart, wishlist, review, profile,
│   │                         # customerImage, public
│   ├── validations/
│   │   ├── shared.js
│   │   ├── admin/            # auth, product, inventory, user
│   │   └── customer/         # account, cart, review, wishlist
│   ├── utils/
│   │   ├── apiError.js               # Custom ApiError class
│   │   ├── activityLogger.js         # Admin activity log writer
│   │   ├── csvMapper.js              # Shopify CSV → product/variant mapping
│   │   ├── csvParser.js              # CSV file parsing helpers
│   │   ├── customerSessionResponse.js # Enrich Better Auth session responses
│   │   ├── escapeRegex.js            # Safe regex string escaping
│   │   ├── imagekit.js               # ImageKit SDK initialiser
│   │   ├── inventory.js              # Stock movement helpers
│   │   ├── masterOtp.js              # Master OTP bypass (dev/test only)
│   │   ├── phoneUtils.js             # Phone number normalisation (E.164)
│   │   ├── slugify.js                # URL slug generator
│   │   └── token.js                  # JWT sign / verify helpers
│   ├── scripts/
│   │   ├── seedAdmin.js      # Seeds the first super_admin user
│   │   └── test_boot.js      # Minimal server boot for sanity checks
│   ├── tests/                # Jest integration tests (run against in-memory MongoDB)
│   └── uploads/
│       └── product_template.csv  # Reference CSV template for bulk import
```

---

## Startup Sequence

```
server.js
  └── connectDB()           → opens Mongoose connection to MONGO_URI
  └── createCustomerAuth()  → initialises Better Auth instance + sets up DB indexes
  └── app.listen(PORT)      → starts Express server
```

---

## Middleware Stack (app.js order)

1. `trust proxy 1` — single Render proxy for correct client IP in rate limiting
2. **CORS** — allowlist from `config.allowedOrigins` (FRONTEND_URL + TRUSTED_ORIGINS), `credentials: true`
3. **Helmet** — security headers (`crossOriginResourcePolicy: false` for ImageKit images)
4. **Morgan** — HTTP request logging (`combined` in production, `dev` in development)
5. **Rate limiters** — applied before JSON parsing to specific customer auth endpoints (10 req/15min)
6. **Better Auth handler** — mounted at `/api/v1/customers/auth/*` before `express.json` (needs raw request stream)
7. `express.json({ limit: "10mb" })` + `express.urlencoded`
8. `cookie-parser`
9. **Routes** — admin + customer
10. `notFound` + `errorHandler` — global error middleware

---

## Environment Variables

| Variable                | Required      | Description                                                    |
| ----------------------- | ------------- | -------------------------------------------------------------- |
| `PORT`                  | ✅            | Server port (integer 1-65535)                                  |
| `MONGO_URI`             | ✅            | MongoDB connection string                                      |
| `JWT_SECRET`            | ✅            | Secret for signing admin JWT tokens                            |
| `BETTER_AUTH_SECRET`    | ✅            | Secret for Better Auth customer sessions                       |
| `IMAGEKIT_PUBLIC_KEY`   | ✅            | ImageKit public API key                                        |
| `IMAGEKIT_PRIVATE_KEY`  | ✅            | ImageKit private API key                                       |
| `IMAGEKIT_URL_ENDPOINT` | ✅            | ImageKit URL endpoint                                          |
| `FRONTEND_URL`          | ✅            | Comma-separated allowed CORS origins                           |
| `BETTER_AUTH_URL`       | ✅ (prod)     | Public HTTPS URL of the server (for Better Auth)               |
| `TRUSTED_ORIGINS`       | ⬜            | Additional CORS-trusted origins                                |
| `NODE_ENV`              | ⬜            | `development` / `production` / `test`                          |
| `RAZORPAY_KEY_ID`       | ✅ (payments) | Razorpay public key ID                                         |
| `RAZORPAY_KEY_SECRET`   | ✅ (payments) | Razorpay server-side secret                                    |
| `LOW_STOCK_THRESHOLD`   | ⬜            | Stock level below which a variant is "low stock" (default: 10) |
| `ALLOW_MASTER_OTP`      | ⬜            | `"true"` to enable master OTP bypass (dev/test)                |
| `MASTER_OTP_CODE`       | ⬜            | The master OTP code when `ALLOW_MASTER_OTP=true`               |

---

## Authentication

### Admin Authentication (JWT)

Admin users use a classic access + refresh token pattern.

| Aspect            | Detail                                                                             |
| ----------------- | ---------------------------------------------------------------------------------- |
| Access Token      | Short-lived JWT (15 min), signed with `JWT_SECRET`                                 |
| Refresh Token     | Long-lived (7 days), stored in `RefreshToken` collection, sent as httpOnly cookie  |
| Token Payload     | `{ id, role, type: "admin" }`                                                      |
| Cookie Attributes | `httpOnly: true`, `secure: true` (prod), `sameSite: "none"` (prod) / `"lax"` (dev) |

**Flow:**

1. `POST /api/auth/login` → validates credentials → returns `{ accessToken }` + sets `refreshToken` cookie
2. All protected routes require `Authorization: Bearer <accessToken>` header
3. `authenticate` middleware: verifies JWT, checks user still exists + is active in DB
4. `POST /api/auth/refresh` → reads cookie → issues new access token
5. `POST /api/auth/logout` → deletes refresh token from DB, clears cookie

### Customer Authentication (Better Auth)

Customers authenticate via **phone OTP** or **email OTP** using the [Better Auth](https://better-auth.com) library.

| Aspect            | Detail                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Library           | `better-auth` v1.7                                                                                |
| Plugins           | `phoneNumber` + `emailOTP`                                                                        |
| Session Storage   | MongoDB collections: `customerUser`, `customerSession`, `customerAccount`, `customerVerification` |
| Session Transport | httpOnly cookie (managed entirely by Better Auth)                                                 |
| Mounted At        | `/api/v1/customers/auth/*`                                                                        |

**Phone OTP Flow:**

1. `POST /api/v1/customers/auth/phone-number/send-otp` → sends OTP to phone (dev: logs to console)
2. `POST /api/v1/customers/auth/phone-number/verify` → verifies OTP → creates session + auto-creates account if new user

**Email OTP Flow:**

1. `POST /api/v1/customers/auth/email-otp/send-verification-otp` → sends OTP to email
2. `POST /api/v1/customers/auth/sign-in/email-otp` → verifies OTP → creates session

**`authenticateCustomer` middleware:**

- Calls `customerAuth.api.getSession()` with request headers
- Upserts a `CustomerProfile` document linked to the Better Auth user via `authUserId`
- Attaches `req.customer`, `req.customerProfile`, `req.session` to the request

---

## Data Models

### Admin Models

#### `User`

```
{
  name: String (required)
  email: String (unique, lowercase)
  password: String (bcrypt hashed, select: false)
  role: "super_admin" | "admin" | "staff"  (default: "staff")
  isActive: Boolean (default: true)
  lastLogin: Date
}
```

#### `Brand`

```
{
  name: String (unique)
  slug: String (unique, lowercase)
  logo: String (ImageKit URL)
  isActive: Boolean
}
```

#### `Category`

```
{
  name: String
  slug: String (unique, lowercase)
  parent: ObjectId → Category (nullable, for nested categories)
  isActive: Boolean
  image: { url, fileId }
  description: String
}
Indexes: { isActive, name }, { parent }
```

#### `Product`

```
{
  name: String
  slug: String (unique, lowercase)
  description: String
  category: ObjectId → Category
  brand: ObjectId → Brand
  status: "draft" | "active" | "archived"  (default: "draft")
  featured: Boolean
  images: [{ url, fileId, source: "imagekit"|"external", altText, position }]
  optionTypes: [{ name, values: [String] }]   // e.g. { name: "Size", values: ["S","M","L"] }
  seo: { metaTitle, metaDescription, keywords: [String] }
}
Indexes: { status, createdAt }, { category, status }
```

#### `ProductVariant`

```
{
  product: ObjectId → Product
  sku: String (unique)
  barcode: String
  options: [{ name, value }]  // e.g. [{ name: "Size", value: "M" }]
  price: Number
  salePrice: Number
  costPrice: Number
  stock: Number (min: 0)
  weight: { value: Number, unit: "g"|"kg"|"lb"|"oz" }
  images: [{ url, fileId }]  (max 4)
  isActive: Boolean
}
Indexes: { product }, { price }
```

#### `Banner`

```
{
  key: "hero" | "bottom" | "budget"  (unique)
  // hero banner:
  slides: [{ name, image: { url, fileId }, href, order, isActive }]
  // bottom/budget banners:
  title, subtitle, image: { url, fileId }, href, ctaText, isActive
}
```

#### `InventoryMovement`

```
{
  variant: ObjectId → ProductVariant
  product: ObjectId → Product
  type: "initial" | "restock" | "sale" | "return" | "damage" | "correction"
  quantityChange: Number  (signed: + = added, - = removed)
  previousStock: Number
  newStock: Number
  reason: String
  user: ObjectId → User
}
```

#### `ImportJob`

Tracks CSV bulk import jobs (status: pending/completed/rolled_back, created product/variant IDs for rollback).

#### `ActivityLog`

Audit log of admin actions (entity, action, user, details).

#### `RefreshToken`

Stores hashed refresh tokens linked to a user. Cleaned up on logout.

---

### Customer Models

#### `CustomerProfile`

```
{
  authUserId: String (unique) — Better Auth user.id
  isActive: Boolean
  addresses: [{
    label, line1, line2, city, state, postalCode, country, phone, isDefault
  }]
}
```

Created automatically (upsert) by `authenticateCustomer` middleware on first request.

#### `Cart`

```
{
  customer: ObjectId → CustomerProfile  (unique — one cart per customer)
  items: [{ variant: ObjectId → ProductVariant, quantity: Number }]
}
```

#### `Wishlist`

```
{
  customer: ObjectId → CustomerProfile  (unique)
  products: [ObjectId → Product]
}
```

#### `Review`

```
{
  product: ObjectId → Product
  customer: ObjectId → CustomerProfile
  customerAuthUserId: String
  customerName: String
  rating: Number (1-5)
  title: String (max 100)
  body: String (max 2000)
  images: [{ url, fileId }]  (max 4)
  isVerifiedPurchase: Boolean
  isEdited: Boolean
}
Indexes: { product, createdAt }, { product, customerAuthUserId } (unique)
```

---

## API Reference

Base URL: `https://ecom-mern-c5wz.onrender.com`

### Health Check

| Method | Path      | Auth | Description            |
| ------ | --------- | ---- | ---------------------- |
| GET    | `/health` | None | Server health + uptime |

---

### Admin Auth — `/api/auth`

| Method | Path                 | Auth   | Roles       | Description                                                                |
| ------ | -------------------- | ------ | ----------- | -------------------------------------------------------------------------- |
| POST   | `/api/auth/login`    | None   | —           | Login with email+password. Returns `{ accessToken }` + sets refresh cookie |
| POST   | `/api/auth/logout`   | Cookie | —           | Revoke refresh token, clear cookie                                         |
| POST   | `/api/auth/refresh`  | Cookie | —           | Exchange refresh cookie for new access token                               |
| POST   | `/api/auth/register` | Bearer | super_admin | Create a new admin/staff user                                              |

**Rate limit:** login/register: 10 req/15min; refresh: 60 req/15min

---

### Admin — Brands `/api/brands`

| Method | Path              | Auth   | Roles              | Description                                     |
| ------ | ----------------- | ------ | ------------------ | ----------------------------------------------- |
| GET    | `/api/brands`     | Bearer | All                | List all brands                                 |
| GET    | `/api/brands/:id` | Bearer | All                | Get brand by ID                                 |
| POST   | `/api/brands`     | Bearer | super_admin, admin | Create brand                                    |
| PUT    | `/api/brands/:id` | Bearer | super_admin, admin | Update brand                                    |
| DELETE | `/api/brands/:id` | Bearer | super_admin, admin | Delete brand (blocked if products reference it) |

---

### Admin — Categories `/api/categories`

| Method | Path                  | Auth   | Roles              | Description                                     |
| ------ | --------------------- | ------ | ------------------ | ----------------------------------------------- |
| GET    | `/api/categories`     | Bearer | All                | List all categories                             |
| GET    | `/api/categories/:id` | Bearer | All                | Get category by ID                              |
| POST   | `/api/categories`     | Bearer | super_admin, admin | Create category (supports `parent` for nesting) |
| PUT    | `/api/categories/:id` | Bearer | super_admin, admin | Update category                                 |
| DELETE | `/api/categories/:id` | Bearer | super_admin, admin | Delete (blocked if has children or products)    |

---

### Admin — Products `/api/products`

| Method | Path                 | Auth   | Roles              | Description                                                                    |
| ------ | -------------------- | ------ | ------------------ | ------------------------------------------------------------------------------ |
| GET    | `/api/products`      | Bearer | All                | List products (filters: category, brand, status, featured, search, pagination) |
| GET    | `/api/products/:id`  | Bearer | All                | Get product + variants                                                         |
| POST   | `/api/products`      | Bearer | super_admin, admin | Create product with ≥1 variant (transactional)                                 |
| PUT    | `/api/products/:id`  | Bearer | super_admin, admin | Update product fields                                                          |
| DELETE | `/api/products/:id`  | Bearer | super_admin, admin | Delete product + cascade-delete variants                                       |
| PATCH  | `/api/products/bulk` | Bearer | super_admin, admin | Bulk update status / featured flag                                             |
| DELETE | `/api/products/bulk` | Bearer | super_admin, admin | Bulk delete products                                                           |

**Product Variants** (nested):

| Method | Path                                    | Auth   | Roles              | Description                              |
| ------ | --------------------------------------- | ------ | ------------------ | ---------------------------------------- |
| GET    | `/api/products/:productId/variants`     | Bearer | All                | List all variants for a product          |
| GET    | `/api/products/:productId/variants/:id` | Bearer | All                | Get a single variant                     |
| POST   | `/api/products/:productId/variants`     | Bearer | super_admin, admin | Add a variant to a product               |
| PUT    | `/api/products/:productId/variants/:id` | Bearer | super_admin, admin | Update a variant                         |
| DELETE | `/api/products/:productId/variants/:id` | Bearer | super_admin, admin | Delete variant (blocked if last variant) |

**CSV Import**:

| Method | Path                                | Auth   | Roles              | Description                                                |
| ------ | ----------------------------------- | ------ | ------------------ | ---------------------------------------------------------- |
| POST   | `/api/products/import/preview`      | Bearer | super_admin, admin | Parse + validate CSV (Shopify format), no DB writes        |
| POST   | `/api/products/import/confirm`      | Bearer | super_admin, admin | Import validated rows (transactional), creates ImportJob   |
| POST   | `/api/products/import/:id/rollback` | Bearer | super_admin, admin | Undo a completed import by ImportJob ID                    |
| GET    | `/api/products/import`              | Bearer | super_admin, admin | List ImportJob documents (paginated, filterable by status) |
| GET    | `/api/products/import/:id`          | Bearer | super_admin, admin | Get a single ImportJob                                     |

---

### Admin — Dashboard `/api/dashboard`

| Method | Path                   | Auth   | Roles | Description                                                                      |
| ------ | ---------------------- | ------ | ----- | -------------------------------------------------------------------------------- |
| GET    | `/api/dashboard/stats` | Bearer | All   | Aggregate stats: product/category/brand counts, low-stock variants, activity log |

---

### Admin — Images `/api/images`

| Method | Path                 | Auth   | Roles              | Description                                                    |
| ------ | -------------------- | ------ | ------------------ | -------------------------------------------------------------- |
| POST   | `/api/images/upload` | Bearer | super_admin, admin | Upload up to 4 images to ImageKit. Returns `[{ url, fileId }]` |

---

### Admin — Inventory `/api/inventory`

| Method | Path                                  | Auth   | Roles              | Description                                                     |
| ------ | ------------------------------------- | ------ | ------------------ | --------------------------------------------------------------- |
| POST   | `/api/inventory/movements`            | Bearer | super_admin, admin | Record a stock movement (restock/sale/return/damage/correction) |
| GET    | `/api/inventory/movements/:variantId` | Bearer | All                | Full movement history for a variant                             |
| GET    | `/api/inventory/reconcile/:variantId` | Bearer | super_admin, admin | Recompute stock from ledger to detect drift                     |

---

### Admin — Users `/api/users`

| Method | Path             | Auth   | Roles       | Description                                              |
| ------ | ---------------- | ------ | ----------- | -------------------------------------------------------- |
| GET    | `/api/users/me`  | Bearer | All         | Current user's profile (session hydration)               |
| GET    | `/api/users`     | Bearer | super_admin | List users (filters: role, isActive, search, pagination) |
| GET    | `/api/users/:id` | Bearer | super_admin | Get user by ID                                           |
| PUT    | `/api/users/:id` | Bearer | super_admin | Update user (self-modification blocked)                  |
| DELETE | `/api/users/:id` | Bearer | super_admin | Delete user (self-deletion blocked)                      |

---

### Admin — Banners `/api/banners`

| Method | Path                | Auth   | Roles              | Description                                       |
| ------ | ------------------- | ------ | ------------------ | ------------------------------------------------- |
| GET    | `/api/banners`      | Bearer | All                | Get all banner configurations                     |
| PUT    | `/api/banners/:key` | Bearer | super_admin, admin | Update banner by key (`hero`, `bottom`, `budget`) |

---

### Customer Auth — `/api/v1/customers/auth/*`

Handled entirely by **Better Auth**. Full route list auto-generated by the library.

| Path                                                          | Plugin      | Description                    |
| ------------------------------------------------------------- | ----------- | ------------------------------ |
| `POST /api/v1/customers/auth/phone-number/send-otp`           | phoneNumber | Send OTP to phone              |
| `POST /api/v1/customers/auth/phone-number/verify`             | phoneNumber | Verify OTP → sign in / sign up |
| `POST /api/v1/customers/auth/email-otp/send-verification-otp` | emailOTP    | Send OTP to email              |
| `POST /api/v1/customers/auth/sign-in/email-otp`               | emailOTP    | Sign in with email OTP         |
| `POST /api/v1/customers/auth/email-otp/request-email-change`  | emailOTP    | Request email change OTP       |
| `POST /api/v1/customers/auth/email-otp/change-email`          | emailOTP    | Confirm email change           |
| `POST /api/v1/customers/auth/sign-out`                        | core        | Sign out (clear session)       |
| `GET /api/v1/customers/auth/get-session`                      | core        | Get current session            |

**Rate limit:** OTP send/verify endpoints: 10 req/15min

---

### Customer — Account `/api/customers`

| Method | Path                | Auth             | Description                                 |
| ------ | ------------------- | ---------------- | ------------------------------------------- |
| DELETE | `/api/customers/me` | Customer Session | Delete account after phone OTP verification |

---

### Customer — Profile `/api/customers/profile`

| Method | Path                     | Auth             | Description                             |
| ------ | ------------------------ | ---------------- | --------------------------------------- |
| GET    | `/api/customers/profile` | Customer Session | Get profile + addresses                 |
| PUT    | `/api/customers/profile` | Customer Session | Update profile (name, email, addresses) |

---

### Customer — Cart `/api/customers/cart`

| Method | Path                                   | Auth             | Description                                                 |
| ------ | -------------------------------------- | ---------------- | ----------------------------------------------------------- |
| GET    | `/api/customers/cart`                  | Customer Session | Get (or create) cart                                        |
| POST   | `/api/customers/cart/items`            | Customer Session | Add variant to cart (increments if exists, clamps to stock) |
| PUT    | `/api/customers/cart/items/:variantId` | Customer Session | Set item quantity (≤0 removes item)                         |
| DELETE | `/api/customers/cart/items/:variantId` | Customer Session | Remove a single item                                        |
| DELETE | `/api/customers/cart`                  | Customer Session | Clear entire cart                                           |

---

### Customer — Payments and Orders `/api/customers/payments`

| Method | Path                             | Auth             | Description                                                                               |
| ------ | -------------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| POST   | `/api/customers/payments/orders` | Customer Session | Create a server-priced Razorpay order from the current cart                               |
| GET    | `/api/customers/payments/orders` | Customer Session | List the authenticated customer's orders                                                  |
| POST   | `/api/customers/payments/verify` | Customer Session | Verify Razorpay signature, decrement stock, record inventory movement, and clear the cart |

Payment amounts are calculated from current server-side variant prices. Configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; never expose the secret to the frontend.

### Customer — Wishlist `/api/customers/wishlist`

| Method | Path                                       | Auth             | Description                            |
| ------ | ------------------------------------------ | ---------------- | -------------------------------------- |
| GET    | `/api/customers/wishlist`                  | Customer Session | Get (or create) wishlist               |
| POST   | `/api/customers/wishlist/items`            | Customer Session | Add product (no-op if already present) |
| DELETE | `/api/customers/wishlist/items/:productId` | Customer Session | Remove product                         |

---

### Customer — Reviews `/api/customers/reviews`

| Method | Path                                     | Auth             | Description                                           |
| ------ | ---------------------------------------- | ---------------- | ----------------------------------------------------- |
| GET    | `/api/customers/reviews/mine/:productId` | Customer Session | Get the customer's own review for a product (or null) |
| POST   | `/api/customers/reviews/:productId`      | Customer Session | Create a review (one per customer per product)        |
| PUT    | `/api/customers/reviews/:reviewId`       | Customer Session | Update own review                                     |
| DELETE | `/api/customers/reviews/:reviewId`       | Customer Session | Delete own review                                     |

---

### Customer — Images `/api/customers/images`

| Method | Path                           | Auth             | Description                                     |
| ------ | ------------------------------ | ---------------- | ----------------------------------------------- |
| POST   | `/api/customers/images/upload` | Customer Session | Upload up to 4 images (for reviews) to ImageKit |

---

### Public Catalog `/api/public`

No authentication required.

| Method | Path                                              | Description                                                               |
| ------ | ------------------------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/api/public/products`                            | List active products (filters: search, category, brand, sort, pagination) |
| GET    | `/api/public/products/:slug`                      | Get a single active product by slug                                       |
| GET    | `/api/public/categories`                          | List all active categories                                                |
| GET    | `/api/public/banners`                             | Get all active banner configurations                                      |
| GET    | `/api/public/search/suggestions`                  | Search autocomplete suggestions                                           |
| GET    | `/api/public/products/:productId/reviews`         | Paginated reviews for a product                                           |
| GET    | `/api/public/products/:productId/reviews/summary` | Average rating + count breakdown                                          |

---

## Role-Based Access Control (RBAC)

| Role          | Description     | Capabilities                                                   |
| ------------- | --------------- | -------------------------------------------------------------- |
| `super_admin` | Full access     | All operations including user management, all write operations |
| `admin`       | Store manager   | Products, categories, brands, inventory, banners, CSV import   |
| `staff`       | Read-only admin | View products, categories, brands, banners, inventory          |

The `authorize(...roles)` middleware returns **403 Forbidden** if the authenticated user's role is not in the allowed list.

---

## Error Handling

All errors are routed through the global `errorHandler` middleware. Errors are thrown as `ApiError` instances.

**Standard error response shape:**

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [...]   // optional: Zod validation error details
}
```

**Common status codes:**

- `400` — Bad Request (validation failure, business rule violation)
- `401` — Unauthorized (missing/invalid/expired token or session)
- `403` — Forbidden (insufficient role)
- `404` — Not Found
- `429` — Too Many Requests (rate limit)
- `500` — Internal Server Error

---

## Validation

Requests are validated using **Zod** via the `validate(schema)` middleware. Validation schemas:

| Schema File                       | Covers                                                          |
| --------------------------------- | --------------------------------------------------------------- |
| `admin/auth.validation.js`        | Register (name, email, password, role), Login (email, password) |
| `admin/product.validation.js`     | Create/update product, variant, brand, category                 |
| `admin/inventory.validation.js`   | Create inventory movement                                       |
| `admin/user.validation.js`        | Update user (name, role, isActive)                              |
| `customer/account.validation.js`  | Delete account (OTP verification)                               |
| `customer/cart.validation.js`     | Add to cart (variantId, quantity), update cart item             |
| `customer/review.validation.js`   | Create/update review (rating, title, body, images)              |
| `customer/wishlist.validation.js` | Add to wishlist (productId)                                     |

---

## Inventory System

Stock is tracked via an **immutable ledger** (`InventoryMovement` collection):

- Each stock change creates an `InventoryMovement` record
- `variant.stock` is the **current computed value** (updated atomically)
- `GET /api/inventory/reconcile/:variantId` recomputes stock from the full movement history to detect drift
- Movement types: `initial`, `restock`, `sale`, `return`, `damage`, `correction`

---

## CSV Bulk Import

Products can be imported in **Shopify-compatible CSV format**:

1. **Preview** (`POST /api/products/import/preview`): Parse and validate the CSV, group rows into products + variants. No DB writes. Returns preview data with any validation errors.
2. **Confirm** (`POST /api/products/import/confirm`): Re-validate and write valid rows to DB within a MongoDB transaction. Creates an `ImportJob` record tracking all created document IDs.
3. **Rollback** (`POST /api/products/import/:id/rollback`): Delete all products and variants created by an import job, using the tracked IDs in `ImportJob.createdIds`.

---

## Testing

Tests use **Jest** with **Supertest** and **mongodb-memory-server** (in-memory MongoDB):

```bash
npm test
```

Test files in `src/tests/`: auth, brand, category, product, productVariant, inventory, user, dashboard, cart, wishlist, review, customerAuth, customerProfile, image, csvImport, cors.

---

## Deployment

- **Platform**: Render (Node.js web service)
- **Frontend Proxy**: Next.js rewrites `/api/*` to the Render server URL, ensuring httpOnly cookies are same-origin
- **ImageKit**: CDN for all product and review images
- **MongoDB**: MongoDB Atlas (cloud-hosted)
