# ecom-mern API — Postman Collection

A complete, ready-to-import Postman collection covering every API endpoint in the ecom-mern backend.

---

## Files

| File | Description |
|------|-------------|
| `postman_collection.json` | All API requests, organized into folders |
| `postman_environment.json` | Environment variables (baseUrl, tokens, IDs) |

---

## How to Import into Postman

### 1. Import the Collection
1. Open Postman
2. Click **Import** (top-left)
3. Drag-and-drop `postman_collection.json` **or** click **Upload Files** and select it
4. Click **Import**

### 2. Import the Environment
1. Click **Import** again
2. Select `postman_environment.json`
3. Click **Import**

### 3. Activate the Environment
1. In the top-right corner of Postman, open the environment dropdown
2. Select **ecom-mern (Local)**

---

## Quick Start Workflow

### Admin Panel Testing

1. **Start the server** — `npm run dev` inside the `server/` folder (default port: `5000`)

2. **Login as admin**
   - Open **Admin — Auth → Login**
   - Update the body with valid credentials
   - Click **Send**
   - The test script **automatically saves** `accessToken` and `adminUserId` to the environment

3. **All admin requests are ready** — they inherit `Authorization: Bearer {{accessToken}}` from the collection-level auth

4. **After creating resources**, copy the returned `_id` and paste it into the corresponding environment variable:
   - Created a brand? → paste its `_id` into `{{brandId}}`
   - Created a product? → paste its `_id` into `{{productId}}`
   - Created a variant? → paste its `_id` into `{{variantId}}`

### Customer (Storefront) Testing

1. **Register or login as a customer**
   - Open **Customer — Auth → Register Customer** or **Login Customer**
   - Click **Send**
   - The test script **automatically saves** `customerAccessToken` and `customerId`

2. **Customer-protected requests** (Cart, Wishlist, Profile) each individually override the auth to use `{{customerAccessToken}}`

---

## Authentication Summary

| Area | Header | Token Variable | Cookie |
|------|--------|---------------|--------|
| Admin / Staff | `Authorization: Bearer {{accessToken}}` | `accessToken` | `refreshToken` (HttpOnly) |
| Customer | `Authorization: Bearer {{customerAccessToken}}` | `customerAccessToken` | `customerRefreshToken` (HttpOnly) |
| Public routes | None | — | — |

> **Important:** Admin tokens and customer tokens are **mutually exclusive** — they carry different `type` claims and each middleware rejects the other's token type.

---

## Environment Variables Reference

| Variable | Set By | Description |
|----------|--------|-------------|
| `baseUrl` | Manual | Server URL (default: `http://localhost:5000`) |
| `accessToken` | Admin Login test script | Short-lived admin JWT |
| `adminUserId` | Admin Login test script | Logged-in admin's MongoDB ID |
| `customerAccessToken` | Customer Login/Register test script | Short-lived customer JWT |
| `customerId` | Customer Login/Register test script | Logged-in customer's MongoDB ID |
| `userId` | Manual | Target admin user ID for user management |
| `productId` | Manual | Target product MongoDB ID |
| `variantId` | Manual | Target variant MongoDB ID |
| `categoryId` | Manual | Target category MongoDB ID |
| `brandId` | Manual | Target brand MongoDB ID |
| `importJobId` | Manual | CSV ImportJob MongoDB ID (from Confirm Import response) |

---

## API Folder Structure

```
ecom-mern API
├── Health
│   └── GET /health
├── Admin — Auth
│   ├── POST /api/auth/login
│   ├── POST /api/auth/register        (super_admin only)
│   ├── POST /api/auth/refresh
│   └── POST /api/auth/logout
├── Admin — Users
│   ├── GET  /api/users/me
│   ├── GET  /api/users                (super_admin only)
│   ├── GET  /api/users/:id            (super_admin only)
│   ├── PUT  /api/users/:id            (super_admin only)
│   └── DELETE /api/users/:id          (super_admin only)
├── Admin — Dashboard
│   └── GET  /api/dashboard/stats
├── Admin — Brands
│   ├── GET  /api/brands
│   ├── GET  /api/brands/:id
│   ├── POST /api/brands               (admin+)
│   ├── PUT  /api/brands/:id           (admin+)
│   └── DELETE /api/brands/:id         (admin+)
├── Admin — Categories
│   ├── GET  /api/categories
│   ├── GET  /api/categories/:id
│   ├── POST /api/categories           (admin+)
│   ├── PUT  /api/categories/:id       (admin+)
│   └── DELETE /api/categories/:id     (admin+)
├── Admin — Products
│   ├── GET    /api/products
│   ├── GET    /api/products/:id
│   ├── POST   /api/products           (admin+)
│   ├── PUT    /api/products/:id       (admin+)
│   ├── DELETE /api/products/:id       (admin+)
│   ├── PATCH  /api/products/bulk      (admin+)
│   └── DELETE /api/products/bulk      (admin+)
├── Admin — Product Variants
│   ├── GET    /api/products/:productId/variants
│   ├── GET    /api/products/:productId/variants/:id
│   ├── POST   /api/products/:productId/variants   (admin+)
│   ├── PUT    /api/products/:productId/variants/:id (admin+)
│   └── DELETE /api/products/:productId/variants/:id (admin+)
├── Admin — Inventory
│   ├── POST /api/inventory/movements             (admin+)
│   ├── GET  /api/inventory/movements/:variantId
│   └── GET  /api/inventory/reconcile/:variantId  (admin+)
├── Admin — Images
│   └── POST /api/images/upload                   (admin+) multipart/form-data
├── Admin — Banners
│   ├── GET /api/banners
│   └── PUT /api/banners/:key                     (admin+)  key: hero | budget | bottom
├── Admin — CSV Import
│   ├── POST /api/products/import/preview          (admin+) multipart/form-data
│   ├── POST /api/products/import/confirm          (admin+)
│   ├── POST /api/products/import/:id/rollback     (admin+)
│   ├── GET  /api/products/import
│   └── GET  /api/products/import/:id
├── Customer — Auth
│   ├── POST /api/customers/auth/register
│   ├── POST /api/customers/auth/login
│   ├── POST /api/customers/auth/refresh
│   ├── POST /api/customers/auth/logout
│   ├── GET  /api/customers/auth/me               (customer auth)
│   └── PUT  /api/customers/auth/profile          (customer auth)
├── Customer — Cart
│   ├── GET    /api/customers/cart                (customer auth)
│   ├── POST   /api/customers/cart/items          (customer auth)
│   ├── PUT    /api/customers/cart/items/:variantId (customer auth)
│   ├── DELETE /api/customers/cart/items/:variantId (customer auth)
│   └── DELETE /api/customers/cart                (customer auth)
├── Customer — Wishlist
│   ├── GET    /api/customers/wishlist            (customer auth)
│   ├── POST   /api/customers/wishlist/items      (customer auth)
│   └── DELETE /api/customers/wishlist/items/:productId (customer auth)
└── Public — Storefront
    ├── GET /api/public/products
    ├── GET /api/public/products/:slug
    ├── GET /api/public/categories
    ├── GET /api/public/search/suggestions
    └── GET /api/public/banners
```

---

## Key Design Notes for the Frontend Developer

### Stock Management
Stock is **ledger-based**. The variant's `stock` field is a derived value computed from inventory movements.
- To add/reduce stock: `POST /api/inventory/movements` (not via the product/variant update endpoints)
- `stock` in the variant update body is **silently ignored**

### Image Upload Flow
1. Upload image files via `POST /api/images/upload` (returns `{ url, fileId }`)
2. Pass the returned `url` and `fileId` into the `images` array when creating/updating products or variants

### CSV Import Flow
1. `POST /api/products/import/preview` — upload the CSV, get back a `products` array with `valid: true/false`
2. Show the preview to the user
3. `POST /api/products/import/confirm` — pass the `products` array to commit valid rows
4. Use the returned `importJobId` with `POST /api/products/import/:id/rollback` to undo if needed

### Refresh Token Cookies
Both admin and customer refresh tokens are **HttpOnly cookies**. Postman handles these automatically via its Cookie Jar. In the browser, they are sent automatically with requests (no manual handling needed).

### Rate Limits
| Endpoint group | Limit |
|----------------|-------|
| Admin login & register | 10 req / 15 min |
| Admin refresh | 30 req / 15 min |
| Customer login & register | 10 req / 15 min |
| Customer refresh | 30 req / 15 min |
