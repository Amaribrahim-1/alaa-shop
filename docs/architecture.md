# Architecture & System Design Document

## Project: Dynamic E-Commerce Platform for WhatsApp-Based Business

**Version:** 1.0 (Final MVP Blueprint)
**Last Updated:** 2026-06-30
**Status:** Locked for Development

---

## 1. Project Overview

| Item                 | Detail                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Business Context** | Informal e-commerce business previously run via WhatsApp groups, selling rotating/temporary inventory (books, cosmetics, fans, skincare, etc.) |
| **Goal**             | Replace manual WhatsApp ordering with a full self-serve e-commerce experience, while keeping order fulfillment manual on the admin's end       |
| **Primary Users**    | 1. Customers (guests or registered) 2. Admin (business owner)                                                                                  |
| **Core Principle**   | Customer never leaves the web app during the shopping/ordering flow. Admin manages everything from a single dashboard.                         |

---

## 2. Tech Stack

| Layer         | Technology                                    |
| ------------- | --------------------------------------------- |
| Framework     | Next.js v16.2.9 (App Router)                  |
| Language      | TypeScript v6.0   |
| Styling       | Tailwind CSS v4.3.1                           |
| Client State  | Zustand (with `persist` middleware for cart)  |
| Form Handling | React Hook Form                               |
| Validation    | Zod                                           |
| Backend / DB  | Supabase (PostgreSQL)                         |
| Auth          | Supabase Auth (Email/Password + Google OAuth) |
| File Storage  | Supabase Storage (product images)             |
| Hosting       | Vercel                                        |

---

## 3. Product & Inventory Strategy (Finalized)

**Decision:** Unified flat schema for all products, regardless of category. No per-category dynamic attribute system in MVP.

| Field            | Type    | Notes                                                       |
| ---------------- | ------- | ----------------------------------------------------------- |
| `title`          | text    | Product name                                                |
| `description`    | text    | Free text                                                   |
| `price`          | numeric | Current price                                               |
| `stock_quantity` | integer | Auto-decremented on order                                   |
| `category`       | text    | Free-text field entered by admin (e.g. "Books", "Skincare") |
| `images`         | text[]  | Array of Supabase Storage URLs                              |
| `is_active`      | boolean | Soft visibility toggle (replaces hard delete)               |

**Category Handling:** No dedicated `categories` table in MVP. Unique category values are extracted dynamically on the frontend (via `DISTINCT` query) to populate filter pills/dropdowns on `/products`.

**Scalability Note (Future, not MVP):** If category-specific structured fields become necessary later (e.g. "Author" for books, "SPF" for skincare), this can be introduced via a `attributes JSONB` column added non-destructively to the existing `products` table without breaking current data.

---

## 4. Database Schema

### 4.1 `profiles` (extends Supabase `auth.users`)

| Column       | Type                          | Notes                       |
| ------------ | ----------------------------- | --------------------------- |
| `id`         | uuid (PK, FK → auth.users.id) |                             |
| `full_name`  | text                          |                             |
| `phone`      | text                          | Saved for checkout autofill |
| `address`    | text                          | Saved for checkout autofill |
| `role`       | text                          | `'customer'` \| `'admin'`   |
| `created_at` | timestamp                     |                             |

### 4.2 `products`

| Column           | Type      | Notes                                                     |
| ---------------- | --------- | --------------------------------------------------------- |
| `id`             | uuid (PK) |                                                           |
| `slug`           | text      | URL-friendly name, must be UNIQUE (e.g., clean-code-book) |
| `title`          | text      |                                                           |
| `description`    | text      |                                                           |
| `price`          | numeric   |                                                           |
| `stock_quantity` | integer   |                                                           |
| `category`       | text      |                                                           |
| `images`         | text[]    |                                                           |
| `is_active`      | boolean   | default `true`                                            |
| `created_at`     | timestamp |                                                           |

### 4.3 `orders`

| Column             | Type                              | Notes                                                        |
| ------------------ | --------------------------------- | ------------------------------------------------------------ |
| `id`               | uuid (PK)                         |                                                              |
| `user_id`          | uuid (nullable, FK → profiles.id) | Null if guest checkout allowed                               |
| `customer_name`    | text                              | Snapshot at order time                                       |
| `customer_phone`   | text                              | Snapshot at order time                                       |
| `shipping_address` | text                              | Snapshot at order time                                       |
| `total_amount`     | numeric                           | Server-calculated, never trusted from client                 |
| `status`           | text                              | `'pending'` \| `'shipped'` \| `'completed'` \| `'cancelled'` |
| `created_at`       | timestamp                         |                                                              |

### 4.4 `order_items`

| Column                   | Type                    | Notes                                                |
| ------------------------ | ----------------------- | ---------------------------------------------------- |
| `id`                     | uuid (PK)               |                                                      |
| `order_id`               | uuid (FK → orders.id)   |                                                      |
| `product_id`             | uuid (FK → products.id) |                                                      |
| `product_title_snapshot` | text                    | Preserves name even if product later changes/deleted |
| `price_at_purchase`      | numeric                 | Preserves historical price                           |
| `quantity`               | integer                 |                                                      |

### 4.5 `reviews`

| Column          | Type                    | Notes                              |
| --------------- | ----------------------- | ---------------------------------- |
| `id`            | uuid (PK)               |                                    |
| `product_id`    | uuid (FK → products.id) | Links review to a specific product |
| `customer_name` | text                    | Manually entered by admin          |
| `review_text`   | text                    |                                    |
| `rating`        | integer                 | 1–5                                |
| `is_published`  | boolean                 | Default `true`, admin can hide     |
| `created_at`    | timestamp               |                                    |

> **Note:** Reviews are admin-entered only (no image uploads, no customer-submitted form in MVP) since source reviews arrive via WhatsApp. Each review is tied to a `product_id`, enabling both the homepage carousel (pull random/featured reviews across all products) and the Amazon-style per-product review section.

---

## 5. Authentication System (Finalized)

| Requirement               | Implementation                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Methods Supported**     | Email/Password AND Google OAuth, for both customer and admin                                                                                            |
| **Provider**              | Supabase Auth (handles both methods natively)                                                                                                           |
| **Customer Auth Purpose** | Enables saving `full_name`, `phone`, `address` to `profiles` table → autofills checkout form on future visits                                           |
| **Guest Checkout**        | Permitted — `orders.user_id` is nullable; guest enters details manually each time                                                                       |
| **Admin Auth**            | Same Supabase Auth system, but access to `/admin/*` routes restricted via middleware check: `profiles.role === 'admin'` AND/OR allow-listed admin email |
| **Route Protection**      | Next.js Middleware intercepts `/admin/*` requests, verifies session + role before rendering                                                             |

---

## 6. Customer Side — Pages & Features

| Route                           | Purpose                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/`                             | Hero banner, latest products grid, dynamic Reviews Carousel (pulled from `reviews` table)                |
| `/products`                     | Full product grid with category filter pills + live search bar                                           |
| `/products/[slug]`              | Product detail, image gallery, "Add to Cart" button, Amazon-style review list (filtered by `product_id`) |
| `/cart`                         | Full-page cart: line items, quantity edit, remove item, subtotal/total                                   |
| `/checkout`                     | Customer info form (autofilled if logged in), Zod-validated, order summary                               |
| `/order-confirmation/[orderId]` | Order success confirmation with order number                                                             |
| `/login`                        | Email/Password + "Continue with Google"                                                                  |
| `/signup`                       | Email/Password + "Continue with Google"                                                                  |
| `/account`                      | Customer's saved profile info + past order history                                                       |
| `/reviews`                      | Static page listing all published reviews (lower priority)                                               |
| `/about`                        | Static info page (lower priority)                                                                        |

### Customer User Journey

Land on Homepage  
│  
▼  
Browse / Search / Filter Products  
│  
▼  
View Product Detail Page (+ read reviews for that product)  
│  
▼  
Add to Cart → (toast confirmation, header cart icon updates)  
│  
▼  
Repeat for more products (cart persists via Zustand + localStorage)  
│  
▼  
Open /cart → Review items, adjust quantities  
│  
▼  
Proceed to /checkout  
│  
├── If logged in → form autofilled from profile  
└── If guest → manual entry (or prompted to sign up/login)  
│  
▼  
Submit Order (Server Action validates stock + price, decrements stock_quantity)  
│  
▼  
Redirected to /order-confirmation/[orderId]  
│  
▼  
(Optional) If logged in, order appears in /account order history



---

## 7. Admin Side — Pages & Workflows (Finalized)

| Route             | Purpose                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/admin/login`    | Email/Password + Google OAuth, restricted to admin role                                                                        |
| `/admin`          | Dashboard: Total Sales, Pending Orders count, Total Active Products                                                            |
| `/admin/products` | Unified CRUD table for all products (single form, no per-category fields)                                                      |
| `/admin/orders`   | Orders table: Customer Name, Phone, Address, Items, Total, Status — admin updates status (`pending` → `shipped` → `completed`) |
| `/admin/reviews`  | Manual review entry form: Customer Name, Review Text, Rating (1–5), linked to a specific Product                               |

### Admin User Journey

Login (Email/Password or Google) → Role check passes  
│  
▼  
Dashboard Overview (quick health check of the business)  
│  
├──► /admin/products  
│ └── Add/Edit/Delete product (unified form: title, desc,  
│ price, stock, category text, images)  
│  
├──► /admin/orders  
│ └── View new "Pending" orders → call customer using  
│ provided phone number → fulfill → mark "Shipped" → "Completed"  
│  
└──► /admin/reviews  
└── After WhatsApp feedback, manually log review  
(name + text + star rating) tied to the relevant product



---

## 8. State Management Strategy (Zustand)

| Store                                                        | Responsibility                                                                               | Persistence                             |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------- |
| `useCartStore`                                               | Cart items, add/remove/update quantity, total price calculation                              | `persist` middleware → `localStorage`   |
| `useAuthStore` (optional, supplementary to Supabase session) | Cached current user profile (name, phone, address) for instant UI access without re-fetching | In-memory, synced from Supabase session |

**Critical Rule:** Cart data (Zustand/client) is never trusted at order submission. A Server Action re-fetches real price and stock from Supabase before creating the `orders` and `order_items` records, preventing price tampering via DevTools.

---

## 9. Order Lifecycle & Stock Management

Customer submits checkout form  
│  
▼  
Server Action triggered  
│  
├── Re-validate each cart item against live `products` table  
│ (confirm stock_quantity >= requested quantity)  
│  
├── Calculate total_amount server-side (ignore client-sent price)  
│  
├── Insert 1 row into `orders` (status = 'pending')  
│  
├── Insert N rows into `order_items` (with price_at_purchase snapshot)  
│  
├── Decrement `stock_quantity` on each affected product  
│  
└── Clear Zustand cart store  
│  
▼  
Customer redirected to /order-confirmation/[orderId]  
│  
▼  
Order appears in /admin/orders with status "pending"  
│  
▼  
Admin manually contacts customer via phone → fulfills → updates status



---

## 10. MVP Feature Checklist

**Customer Side**

- [ ] Homepage with Hero + Latest Products + Reviews Carousel
- [ ] Product listing with category filter + search bar
- [ ] Product detail page with per-product reviews section
- [ ] Cart (Zustand + persist)
- [ ] Checkout with Zod validation
- [ ] Order confirmation page
- [ ] Email/Password + Google OAuth signup/login
- [ ] Saved profile (name, phone, address) for returning customers
- [ ] Wishlist *(explicitly excluded from MVP)*
- [ ] Customer-submitted reviews *(excluded — admin-entered only)*

**Admin Side**

- [ ] Protected login (Email/Password + Google OAuth, role-restricted)
- [ ] Dashboard with key metrics
- [ ] Unified product CRUD
- [ ] Orders management with status updates
- [ ] Manual review entry tool

**Backend / Data Integrity**

- [ ] Server-side price & stock validation on order creation
- [ ] Automatic stock decrement on order
- [ ] Historical price/name snapshotting in `order_items`
- [ ] Row Level Security (RLS) policies per table (to be defined in implementation phase)

---

## 11. Next Steps (Post-Design Lock)

1. Finalize Supabase RLS policies per table
2. Define Next.js folder/file architecture (App Router structure)
3. Set up Supabase project + Auth providers (Email + Google)
4. Build Admin Panel (Products → Orders → Reviews, in that order)
5. Build Customer Side (Homepage → Products → Product Detail → Cart → Checkout)
6. Integration testing of full order flow
7. Deploy to Vercel
