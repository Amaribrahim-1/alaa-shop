// src/types/database.ts
// Mirrors docs/database_schema.sql exactly — do not add columns that don't exist in the DB.

export type Profile = {
    id: string; // uuid — FK → auth.users(id)
    full_name: string | null; // text, nullable
    phone: string | null; // text, nullable
    address: string | null; // text, nullable
    role: 'customer' | 'admin'; // text NOT NULL, check constraint
    created_at: string; // timestamptz NOT NULL
};

export type Product = {
    id: string; // uuid
    title: string; // text NOT NULL
    slug: string; // text NOT NULL UNIQUE
    description: string | null; // text, nullable
    price: number; // numeric(10,2) NOT NULL
    stock_quantity: number; // integer NOT NULL default 0
    category: string | null; // text, nullable
    images: string[]; // text[] default '{}'
    is_active: boolean; // boolean NOT NULL default true
    created_at: string; // timestamptz NOT NULL
};

export type Order = {
    id: string; // uuid
    user_id: string | null; // uuid, nullable — guest checkout allowed
    customer_name: string; // text NOT NULL
    customer_phone: string; // text NOT NULL
    shipping_address: string; // text NOT NULL
    total_amount: number; // numeric(10,2) NOT NULL
    status: 'pending' | 'shipped' | 'completed' | 'cancelled'; // text NOT NULL, check constraint
    created_at: string; // timestamptz NOT NULL
};

export type OrderItem = {
    id: string; // uuid
    order_id: string; // uuid NOT NULL — FK → orders(id) on delete cascade
    product_id: string | null; // uuid, nullable — FK → products(id) on delete set null
    product_title_snapshot: string; // text NOT NULL — preserved title at purchase time
    price_at_purchase: number; // numeric(10,2) NOT NULL
    quantity: number; // integer NOT NULL
};

export type Review = {
    id: string; // uuid
    product_id: string | null; // uuid, nullable — FK → products(id) on delete cascade
    customer_name: string; // text NOT NULL
    review_text: string; // text NOT NULL
    rating: number; // integer NOT NULL, check (1–5)
    is_published: boolean; // boolean NOT NULL default true
    created_at: string; // timestamptz NOT NULL
};
