# Storefront & Customer Backend Updates (App Developer Guide)

This document summarizes all recent backend changes and frontend reference patterns affecting the **customer / storefront** side (shared by web and mobile app), along with updated Postman references.

---

## 1. Public Storefront APIs

### A. Product Description, Key Features & Product Dimensions
- **Description length**: Product `description` on admin creation/editing now supports up to **500 words** and is always required.
- **New optional detail fields** returned by `GET /api/public/products/:slug`:
  ```json
  {
    "success": true,
    "data": {
      "_id": "...",
      "name": "Wireless Headphones",
      "slug": "wireless-headphones",
      "description": "Full product overview (up to 500 words)...",
      "keyFeatures": "• Active Noise Cancellation\n• 40h Battery",
      "productDimensions": "20 x 18 x 8 cm, 250g",
      "images": [{ "url": "..." }],
      "brand": { "name": "..." },
      "category": { "_id": "...", "name": "..." },
      "featured": false,
      "optionTypes": [],
      "variants": []
    }
  }
  ```
- **App UI rules**:
  - `description` is mandatory and always present.
  - `keyFeatures` and `productDimensions` default to `""` when not set by the admin.
  - **Hide / do not render** the Key Features or Product Dimensions accordion/section when its trimmed value is empty (`!(value || "").trim()`), matching the web product detail page.

### B. Categories Hierarchy (`/api/public/categories`)
- The duplicate category tree route (`GET /api/public/categories/tree`) has been **removed**. Use only **`GET /api/public/categories`**.
- Each node uses a single child key: **`subcategories`** (duplicate `children` key was removed).
- Every category and subcategory includes `image: { url }` so the app can render subcategory tiles with images:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "...",
        "name": "Electronics",
        "slug": "electronics",
        "description": "...",
        "image": { "url": "https://..." },
        "isActive": true,
        "parent": null,
        "subcategories": [
          {
            "_id": "...",
            "name": "Audio",
            "slug": "audio",
            "description": "...",
            "image": { "url": "https://..." },
            "isActive": true,
            "parent": { "_id": "...", "name": "Electronics", "slug": "electronics" },
            "subcategories": []
          }
        ]
      }
    ]
  }
  ```
- Query options:
  - Default (no params): nested hierarchy with `subcategories`.
  - `?flat=true`: flat list of all active categories.
  - `?parentOnly=true`: top-level categories only (`subcategories: []`).

### C. Product Listing Sort Options (`GET /api/public/products`)
- **`price_asc` and `price_desc` have been removed.**
- Only **`newest`** (default) and **`featured`** are accepted for `sort`.
- Passing an unsupported `sort` value now returns **HTTP `400`** (`Invalid sort option. Supported options: newest, featured`).

---

## 2. Guest Cart & Wishlist Storage + Account Merge Flow

Guest users can add/update/remove cart items and toggle wishlist products locally **without logging in**. Authentication is only required at checkout (`Place Order` / `Buy Now`) or when calling authenticated customer endpoints.

### A. How Guest Data Should Be Stored Locally in the App
Validate entries when reading local storage (`AsyncStorage` / `MMKV` / SQLite) before hydrating state or calling merge, dropping corrupt items cleanly:

1. **Guest Cart items** — each stored entry should contain:
   - `variantId`: valid 24-hex ObjectId string
   - `quantity`: positive integer (`>= 1`, clamped locally to `variant.stock` if known)
   - `variant` snapshot object (`_id`, `sku`, `price`, optional `salePrice`, optional `stock`, `product: { _id, name, slug, images }`) so Cart UI renders offline/unauthenticated.
2. **Guest Wishlist items** — each stored entry should contain:
   - `_id`: valid 24-hex ObjectId string
   - `name` (non-empty string), `slug` (string), `images` (array), `variants` (array).

### B. Merging Guest Cart on Login (`POST /api/customers/cart/merge`)
Right after login/registration (or session restore on app launch), sync local guest cart items to the user's account.

- **Endpoint**: `POST /api/customers/cart/merge` (authenticated customer session)
- **Request Body**:
  ```json
  {
    "batchId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      { "variantId": "650000000000000000000001", "quantity": 2 }
    ]
  }
  ```
- **Validation Limits**:
  - `items`: max **100** entries per request (defaults to `[]` if omitted).
  - `quantity`: positive integer (`>= 1`).
  - `batchId`: optional trimmed string (`1..128` chars) — **strongly recommended for mobile**.
- **Server Behavior & Deduplication**:
  - **Idempotent batch retry**: Send a persisted `batchId` (UUID) for each pending merge batch. The server stores processed `batchId`s per cart (`processedMergeBatches`) and executes the merge **atomically**, guaranteeing a `batchId` modifies cart quantities **at most once** across retries or duplicate concurrent requests.
  - **Stock clamping**: If `existingQty + guestQty > variant.stock`, the quantity is clamped to `variant.stock`.
  - **Skipped items reporting**: If any guest variant is missing, inactive (`!variant.isActive`), or out of stock (`variant.stock <= 0`), the server skips it without failing the batch and returns `skippedItems`:
    ```json
    {
      "success": true,
      "data": {
        "_id": "...",
        "items": [ ... ],
        "skippedItems": [
          {
            "variantId": "650000000000000000000099",
            "sku": "OLD-SKU",
            "productName": "Discontinued Item",
            "requestedQuantity": 2,
            "reason": "out_of_stock"
          }
        ]
      },
      "skippedItems": [ ... ]
    }
    ```
    Possible `reason` values: `"not_found"`, `"inactive"`, `"out_of_stock"`.
- **Recommended App Sync & Cleanup Steps**:
  1. Before calling `/merge`, lock storage updates and persist `{ batchId, items, revision }` locally so concurrent callers reuse the same `batchId` for an in-flight/unclaimed batch.
  2. Call `POST /api/customers/cart/merge` with `{ items, batchId }` (sending batches of up to **100** items each).
  3. **If the request fails** (timeout/network/5xx): keep both the guest cart items and the persisted `batchId` batch so the next retry reuses the exact same `batchId` without double-adding or losing items.
  4. **On `200 OK`**:
     - Atomically claim the pending batch before mutating local storage so concurrent callers/tabs do not double-subtract.
     - If `data.skippedItems.length > 0`, show a warning/alert to the user **before** subtracting merged items (e.g., which items were skipped because they are unavailable or out of stock).
     - Perform **delta-only reconciliation**: subtract/remove **only** the `variantId`s and quantities from the submitted `batch.items` (preserving any remaining `> 100` overflow items as well as any items/quantities added concurrently while the request was in-flight).
     - Clear the persisted `batchId` and continue draining any remaining pre-existing batches until all `> 100` guest entries are merged.
     - If reading local storage fails/throws corrupt JSON, preserve current in-memory state instead of treating the read failure as an empty cart.

### C. Merging Guest Wishlist on Login (`POST /api/customers/wishlist/merge`)
- **Endpoint**: `POST /api/customers/wishlist/merge` (authenticated customer session)
- **Request Body**:
  ```json
  {
    "productIds": ["660000000000000000000001"]
  }
  ```
- **Validation & Server Behavior**:
  - `productIds`: array of valid ObjectIds, max **100** items per request (defaults to `[]`).
  - Filters out non-active / non-existent products and deduplicates against items already in the customer's server wishlist.
- **App Cleanup Rule**:
  - Do **not** remove local guest wishlist entries until `200 OK`.
  - If the user has more than 100 local wishlist items, send sequential batches of up to 100 IDs each and remove **only** the submitted `productIds` after each batch succeeds (never clear the whole wishlist blindly), so unsubmitted overflow batches and any product toggled while a batch was in-flight stay preserved.
  - On storage read error, preserve in-memory wishlist state rather than overwriting it with `[]`.

---

## 3. Payment & Order Flow Changes (`/api/customers/payments/*`)

Stock is **not reserved** when creating a checkout order (`POST /orders`). Instead, stock is deducted atomically inside a transaction when payment **capture** is confirmed, with full idempotency and automatic refund recovery.

### A. Creating Checkout / Gateway Order (`POST /api/customers/payments/orders`)
- **Idempotency key support**:
  - Pass a unique key per checkout attempt via **`Idempotency-Key` header** or **`idempotencyKey` in the JSON body** (trimmed string, `1..128` chars).
  - Generate a fresh key whenever the customer changes shipping address, cart items/quantities, or starts a new checkout.
  - Repeating or retrying with the same `idempotencyKey` returns the existing Razorpay order (`200 OK`) without creating a duplicate order or Razorpay order.
  - If an order with that `idempotencyKey` is already finalized (`paid`, `refund_pending`, or `refunded`), the server returns **`409 Conflict`**.
- **Receipt collisions**: Server uses `crypto.randomBytes` order numbers (`ORD-YYYYMMDD-XXXXXXXXXXXX`) and retries uniqueness conflicts automatically.

### B. Payment Verification & Reconciliation
- Endpoints:
  - `POST /api/customers/payments/verify` (`{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`)
  - `POST /api/customers/payments/reconcile` (`{ razorpayOrderId, razorpayPaymentId }`)
- **Capture-only confirmation**:
  - Both endpoints fetch the payment from Razorpay and require `payment.status === "captured"` (along with matching order ID and amount).
  - Authorized-only payments are **not** marked paid (`status: "pending"`).
- **Possible `data.status` values returned**:
  - `"paid"` — captured, stock deducted, order confirmed (`paidAt` recorded).
  - `"pending"` — payment not yet captured by gateway; allow customer to re-check/reconcile later without assuming success.
  - `"failed"` — gateway reported `failed`; do not treat as placed.
  - `"refunded"` — payment was captured, **but stock ran out before capture completed**; stock transaction aborted cleanly, order was marked cancelled, and an automatic Razorpay refund succeeded (`data.refundId` and a user-facing `message` are included).
  - `"refund_pending"` — stock ran out at capture and automatic refund initiation failed transiently; order is recorded and retryable via `/reconcile` (`message` explains refund initiation is in progress; server atomically claims `"processing"` inside `/reconcile` to prevent duplicate refunds).
  - Gateway timeouts return HTTP **`504`** (`Payment gateway request timed out`).
- **Important App Handling**:
  - Always check `response.data.status` after `/verify` or `/reconcile` instead of assuming `success: true` means `"paid"`:
    - `"paid"`: clear local cart state, clear pending reconciliation/idempotency state, and navigate to Order Success.
    - `"refunded"`: confirmed refund completed — clear pending reconciliation/idempotency state, show the returned `message` clearly to the user, and allow starting a fresh checkout attempt if desired.
    - `"refund_pending"` / `"pending"`: **recoverable state** — persist `{ razorpayOrderId, razorpayPaymentId, orderNumber, idempotencyKey, status, message }` across app navigation/restarts, avoid creating a duplicate checkout order while recovery is active, and poll `POST /api/customers/payments/reconcile` (deduplicated, e.g., every 4s) or provide a **"Check Payment Status" / Reconcile** action until a final status (`"paid"`, `"refunded"`, or `"failed"`) is reached.
    - `"failed"`: clear pending reconciliation/idempotency state, show payment failed message, and let user retry checkout.

### C. Customer Order History (`GET /api/customers/payments/orders`)
- Now returns orders where `payment.status` is in `["paid", "refund_pending", "refunded"]` (so customers whose captured payment triggered an out-of-stock refund still see their order and refund status in Order History instead of it disappearing).

---

## 4. Customer Auth & Postman Collection

- Customer authentication endpoints are mounted under **`/api/v1/customers/auth/*`** (Better Auth phone OTP & email OTP flows), plus **`/api/customers/profile`** for customer profile & addresses.
- **Cookie-based session auth**: Customer middleware authenticates via Better Auth's **HTTP-only session cookies** (`credentials: "include"` / cookie jar). Customer endpoints do **not** use `Authorization: Bearer` tokens.
- Updated single Postman collection & environment live in `postman/`:
  - [`postman_collection.json`](./postman_collection.json) — Complete unified collection (Admin + Customer + Public Storefront):
    - **Customer folders** (`Customer — Auth & Profile`, `Customer — Cart`, `Customer — Wishlist`) and **`Public — Storefront`** override auth to `noauth` so they rely on Better Auth HTTP-only session cookies in Postman's Cookie Jar without sending the Admin Bearer token. Includes OTP send/verify (capturing `customerId`), Profile/Addresses, Cart (`/merge` with `batchId` & `skippedItems`), Wishlist (`/merge`), Public products (`sort`: `newest`, `featured`), product details (`keyFeatures`, `productDimensions`), categories hierarchy (`subcategories` with images), search suggestions, and banners.
  - [`postman_environment.json`](./postman_environment.json) — Shared environment variables (`baseUrl`, `accessToken` for admin/staff JWT, `customerId`, etc.; obsolete `customerAccessToken` removed).
