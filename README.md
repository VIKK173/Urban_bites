# 🔥 Urban Bites — Premium Full-Stack Food Ordering Platform

A production-style, fully functional food ordering website: bold dark UI, real cart & checkout,
server-verified payments, live order tracking over Socket.IO, and a complete admin console.

Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma (SQLite) +
Socket.IO + JWT auth**, adapted to run as a single deployable web app (hash-routed SPA front end,
REST API route handlers back end).

---

## ✨ Feature Overview

### Customer experience
- **Homepage** — cinematic hero (giant burger + floating tomato/onion/cheese/chilli/lettuce/sauce
  layers with reduced-motion support), oversized “PUSH THE TASTE” backdrop typography, trust
  indicators, category grid, best sellers, dynamic offer banner, why-us, real customer reviews,
  newsletter signup with duplicate handling.
- **Menu** — full-text search, category filter, veg/non-veg filter, 5 sort modes, availability
  states, pagination, shareable filter URLs.
- **Product detail** — gallery image, ingredients & allergens, customization groups (single-choice +
  add-ons priced server-side), quantity stepper, live price, eligible-customer reviews.
- **Cart** — server-persisted (per user), quantity controls, coupon apply/remove, subtotal /
  discount / delivery fee / GST breakdown, empty & unavailable states.
- **Checkout** — 4 steps (address → contact & instructions → review → payment). Saved addresses,
  address creation, COD (toggleable) and online payment.
- **Payments** — Razorpay test-mode integration **with signature verification**; when API keys are
  not configured a clearly-labelled local simulation gateway stands in and runs through the *exact
  same* server-side verification endpoint. Idempotent order + payment creation, tamper-proof
  (HMAC-SHA256, timing-safe compare), webhook support.
- **Live order tracking** — real-time status timeline via Socket.IO (Order Placed → Confirmed →
  Preparing → Ready → Out for Delivery → Delivered / Cancelled), ETA countdown, cancellation within
  allowed window, reconnect recovery, toast notifications.
- **Account** — profile editing, saved addresses, favorites, order history.
- **Content** — About, Contact (validated form + OpenStreetMap embed), Support (FAQ, policies,
  order-issue form), custom 404.

### Admin console (`#/admin`, role-gated)
- Dashboard — revenue, orders, pending/completed, popular items, recent orders.
- Orders — search/filter, detail dialog, status transition buttons (guarded state machine),
  cancellation/refund handling; every change streams live to customers.
- Products — CRUD with image upload (Cloudinary or local fallback), availability & featured
  toggles, spice level, ingredients/allergens.
- Coupons — create/toggle/delete with percent/flat, min order, caps, usage limits.
- Reviews — moderation (approve/hide/delete) with automatic rating recompute.
- Users — search, order counts, lifetime spend, role management.
- Settings — delivery fee, free-delivery threshold, GST %, COD toggle, ETA, offer banner,
  contact info and map coordinates.

### Engineering
- **Auth**: bcrypt password hashing, HS256 JWT in an httpOnly cookie, role-based authorization
  enforced on the backend (never just the UI), short-lived socket tokens.
- **Pricing engine**: pure, unit-tested functions; money stored as integer paise; all totals
  recomputed server-side — the browser is never trusted.
- **Validation**: Zod schemas on every mutating endpoint; consistent `{ success, data | error }`
  envelope; centralized error handling; in-memory rate limiting on auth/newsletter/contact.
- **Real-time**: Socket.IO mini-service on its own port with JWT-verified rooms
  (`order:<id>`, `user:<id>`, `admin`) fed by a secret-guarded internal emit API.
- **DB**: normalized Prisma schema (14 models) with indexes, unique constraints, transactions for
  order creation & payment marking, and historical snapshots on order items.
- **Tests**: 35 automated tests (bun test) covering pricing math, auth, catalog, cart, coupons,
  orders, payment verification & idempotency, cancellation rules and authorization.

---

## 🚀 Quick Start

```bash
# 1. install dependencies
bun install

# 2. configure environment (already created for the sandbox — see .env.example for a fresh setup)
cp .env.example .env    # then edit values

# 3. create & sync the database
bun run db:push

# 4. seed categories, 20 products, test accounts, coupons, sample orders
bun prisma/seed.ts

# 5. start the app (dev server on :3000)
bun run dev

# 6. start the order-tracking socket service (terminal 2)
cd mini-services/order-tracking-service && bun install && bun run dev

# 7. run the test suite (dev server must be running)
bun test tests/api.test.ts
```

### Demo accounts (created by the seed)

| Role     | Email                  | Password       |
| -------- | ---------------------- | -------------- |
| Admin    | `admin@urbanbites.com` | `Admin@1234`   |
| Customer | `priya@example.com`    | `Customer@123` |
| Customer | `arjun@example.com`    | `Customer@123` |
| Customer | `sara@example.com`     | `Customer@123` |

> Development-only credentials for evaluating the project. Change them before any real deployment.

### Demo coupons

| Code        | Effect                          | Min order |
| ----------- | ------------------------------- | --------- |
| `URBAN20`   | 20% off, capped at ₹150         | ₹399      |
| `WELCOME50` | Flat ₹50 off                    | ₹299      |
| `FLAT100`   | Flat ₹100 off                   | ₹499      |

---

## 🔐 Environment Variables (`.env.example`)

| Variable                    | Purpose                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`              | SQLite file URL (`file:./db/custom.db`)                                 |
| `JWT_SECRET`                | HS256 signing secret (**required**, ≥ 16 chars)                         |
| `JWT_EXPIRES_IN`            | Session lifetime (default `7d`)                                         |
| `SOCKET_PORT`               | Socket.IO service port (default `3003`)                                 |
| `SOCKET_INTERNAL_PORT`      | Internal emit API port (default `3013`, never exposed)                  |
| `INTERNAL_EMIT_SECRET`      | Shared secret between the app and the socket service                    |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay **test-mode** keys. Leave blank to use the built-in simulation gateway |
| `RAZORPAY_WEBHOOK_SECRET`   | Enables `/api/payments/webhook` (503 until set)                         |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`  | Product image uploads. Blank = local `public/uploads` fallback |
| `RESTAURANT_PHONE/EMAIL/ADDRESS` | Contact placeholders (also editable in Admin → Settings)           |

**Never expose `RAZORPAY_KEY_SECRET`, `JWT_SECRET` or `INTERNAL_EMIT_SECRET` to the client.** Only
`NEXT_PUBLIC_*` variables are bundled into front-end code.

### Switching on real Razorpay test payments
1. Create an account at dashboard.razorpay.com → Settings → API Keys → generate **Test** keys.
2. Put `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (and optionally `NEXT_PUBLIC_RAZORPAY_KEY_ID`) in `.env`.
3. Restart the dev server. Checkout now opens the real Razorpay test modal; verification uses the
   genuine `order_id|payment_id` HMAC. The simulation endpoint disables itself automatically.
4. Optional webhook: set `RAZORPAY_WEBHOOK_SECRET`, point a Razorpay webhook at
   `POST /api/payments/webhook`.

---

## 🧱 Architecture

```
urban-bites/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                  # single user-visible route (SPA shell)
│  │  ├─ layout.tsx                # fonts, SEO/OG metadata, toaster
│  │  └─ api/                      # REST API (route handlers)
│  │     ├─ auth/{register,login,logout,me,socket-token}
│  │     ├─ products/[id]/reviews  ├─ categories          ├─ cart
│  │     ├─ coupons/validate       ├─ orders/[id]/cancel  ├─ orders/my
│  │     ├─ payments/razorpay/{order,simulate,verify}     ├─ payments/webhook
│  │     ├─ addresses/[id]         ├─ favorites           ├─ newsletter
│  │     ├─ contact                ├─ settings            ├─ reviews/latest
│  │     └─ admin/{dashboard,orders/[id]/status,users,coupons/[id],reviews/[id],reports,settings,upload}
│  ├─ components/
│  │  ├─ ui/                       # shadcn/ui primitives
│  │  └─ urb/                      # app components
│  │     ├─ App.tsx (hash router)  ├─ Navbar, Footer, FoodCard, SearchDialog
│  │     ├─ pages/                 # Home, Menu, Product, Cart, Checkout,
│  │     │                         # OrderTracking, Orders, Login, Register,
│  │     │                         # Profile, About, Contact, Support, Admin, 404
│  │     └─ admin/                 # dashboard/orders/products/coupons/reviews/users/settings
│  ├─ lib/                         # db, auth, api helpers, pricing engine, payments, emit, money
│  ├─ store/                       # zustand: auth-store, cart-store
│  ├─ services/                    # typed fetch client, socket.io singleton
│  └─ hooks/                       # useHashRoute
├─ prisma/                         # schema.prisma + seed.ts
├─ mini-services/order-tracking-service/   # Socket.IO real-time service (ports 3003/3013)
├─ tests/api.test.ts               # 35 automated API + unit tests
├─ scripts/                        # asset generation + stock photo fetch
└─ .env.example
```

### Why hash routing?
This deployment exposes a single page route; `#/menu`, `#/product/:slug`, `#/checkout`,
`#/admin/...` etc. are handled by a tiny client router (with query support, back/forward support and
deep links). All data still flows through real REST APIs backed by the database.

### Money handling
All monetary values are stored and computed as **integer paise** (₹1 = 100). The pricing engine
(`src/lib/pricing.ts`) is the single source of truth for subtotal, coupon eligibility, discount
capping, free-delivery threshold and tax — used by the cart, checkout, orders API and tests.

### Order state machine
```
PLACED → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
   ↘ (any step before PREPARING: CANCELLED by customer)
PLACED/CONFIRMED/PREPARING/READY → CANCELLED (admin, with refund handling)
```
Illegal transitions are rejected server-side (`INVALID_TRANSITION`).

### Payment integrity
1. `POST /api/orders` — creates the order + payment row atomically; the client-supplied
   `idempotencyKey` (unique index) makes retries return the original order instead of double-charging.
2. `POST /api/payments/razorpay/order` — creates the gateway order (real API or simulation), idempotent.
3. `POST /api/payments/razorpay/verify` — HMAC-SHA256 signature check (timing-safe) **before** the
   order is marked PAID/CONFIRMED. Tampered signatures fail and mark the payment FAILED.
4. `POST /api/payments/webhook` — same idempotent mark-paid path for server-to-server capture events.

---

## 🗄️ Database Schema (Prisma / SQLite)

`User`, `Address`, `Category`, `Product`, `ProductImage`, `CartItem`, `Order`, `OrderItem`,
`Payment`, `Coupon`, `Review`, `Favorite`, `NewsletterSubscriber`, `ContactMessage`,
`RestaurantSettings` — with FK integrity, unique constraints (`email`, `slug`, `code`,
`userId+productId`, `userId+productId+optionsHash`, `idempotencyKey`), indexes on hot query paths
(category, availability, status, createdAt) and JSON-string columns for option snapshots.
Order items store name/price/options **snapshots** so past orders stay accurate after menu edits.

> The schema is written for SQLite (this sandbox). To move to PostgreSQL: change
> `datasource db { provider = "postgresql" }`, add native `enum`s and `Decimal` if desired, then
> `bun run db:push` — application code is storage-agnostic (money already integer paise).

---

## 🧪 Testing

```bash
bun test tests/api.test.ts        # 35 tests, requires dev server on :3000
BASE_URL=http://other:3000 bun test tests/api.test.ts
bun run lint                      # eslint
bunx tsc --noEmit                 # types
```

Coverage: pricing engine (subtotal/coupons/totals/state machine), registration & login guards,
role authorization, product search/filter/sort, cart option pricing from the DB, coupon minimums,
order totals with coupons, order idempotency, tampered-signature rejection, verify + replay,
cancellation rules, cross-user access control, newsletter duplicates, contact validation.

---

## 🖼️ Assets

Product/category photography: curated Unsplash food shots stored locally under `public/images`
(no hotlinking, no broken URLs). Hero ingredients: hand-built SVGs (crisp at any DPI, transparent).
The admin image uploader accepts Cloudinary or local uploads.

## 📱 Accessibility & Performance

Semantic landmarks, labelled inputs, `aria-current` navigation, keyboard-operable menus/dialogs,
focus-visible rings, 44px+ touch targets, skip-to-content link, `prefers-reduced-motion` support,
lazy-loaded imagery, pagination + DB indexes, no layout shift from images (fixed aspect ratios).
