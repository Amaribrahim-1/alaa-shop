-- ============================================================
-- ARCHITECTURE.MD — DATABASE IMPLEMENTATION SCRIPT
-- Supabase / PostgreSQL — Production-Ready Schema + RLS + Seed Data
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto"; -- needed for crypt() in seed auth.users

-- ============================================================
-- 2. HELPER FUNCTION: is_admin()
-- Used across RLS policies to check the caller's role
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- 3. TABLES
-- ============================================================

-- 3.1 PROFILES (1:1 with auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  address     text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamp with time zone not null default now()
);

-- 3.2 PRODUCTS
create table if not exists public.products (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  slug            text not null unique,
  description     text,
  price           numeric(10,2) not null check (price >= 0),
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  category        text,
  images          text[] default '{}'::text[],
  is_active       boolean not null default true,
  created_at      timestamp with time zone not null default now()
);

create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_is_active on public.products (is_active);

-- 3.3 ORDERS
create table if not exists public.orders (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references public.profiles(id) on delete set null, -- nullable: guest checkout
  customer_name     text not null,
  customer_phone    text not null,
  shipping_address  text not null,
  total_amount      numeric(10,2) not null check (total_amount >= 0),
  status            text not null default 'pending'
                      check (status in ('pending', 'shipped', 'completed', 'cancelled')),
  created_at        timestamp with time zone not null default now()
);

create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_status on public.orders (status);

-- 3.4 ORDER_ITEMS
create table if not exists public.order_items (
  id                       uuid primary key default uuid_generate_v4(),
  order_id                 uuid not null references public.orders(id) on delete cascade,
  product_id               uuid references public.products(id) on delete set null, -- preserved via snapshot below
  product_title_snapshot  text not null,
  price_at_purchase        numeric(10,2) not null check (price_at_purchase >= 0),
  quantity                 integer not null check (quantity > 0)
);

create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_items_product_id on public.order_items (product_id);

-- 3.5 REVIEWS
create table if not exists public.reviews (
  id            uuid primary key default uuid_generate_v4(),
  product_id    uuid references public.products(id) on delete cascade,
  customer_name text not null,
  review_text   text not null,
  rating        integer not null check (rating between 1 and 5),
  is_published  boolean not null default true,
  created_at    timestamp with time zone not null default now()
);

create index if not exists idx_reviews_product_id on public.reviews (product_id);
create index if not exists idx_reviews_is_published on public.reviews (is_published);

-- ============================================================
-- 4. AUTO-CREATE PROFILE ON SIGNUP (Email or Google OAuth)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ---------- PROFILES ----------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

create policy "profiles_delete_admin_only"
  on public.profiles for delete
  using (public.is_admin());

-- ---------- PRODUCTS ----------
alter table public.products enable row level security;

create policy "products_select_active_or_admin"
  on public.products for select
  using (is_active = true or public.is_admin());

create policy "products_insert_admin_only"
  on public.products for insert
  with check (public.is_admin());

create policy "products_update_admin_only"
  on public.products for update
  using (public.is_admin());

create policy "products_delete_admin_only"
  on public.products for delete
  using (public.is_admin());

-- ---------- ORDERS ----------
alter table public.orders enable row level security;

create policy "orders_select_own_or_admin"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

create policy "orders_insert_self_or_guest"
  on public.orders for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "orders_update_admin_only"
  on public.orders for update
  using (public.is_admin());

create policy "orders_delete_admin_only"
  on public.orders for delete
  using (public.is_admin());

-- ---------- ORDER_ITEMS ----------
alter table public.order_items enable row level security;

create policy "order_items_select_own_or_admin"
  on public.order_items for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
      and o.user_id = auth.uid()
    )
  );

create policy "order_items_insert_own_or_guest"
  on public.order_items for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
      and (o.user_id = auth.uid() or o.user_id is null)
    )
  );

create policy "order_items_update_admin_only"
  on public.order_items for update
  using (public.is_admin());

create policy "order_items_delete_admin_only"
  on public.order_items for delete
  using (public.is_admin());

-- ---------- REVIEWS ----------
alter table public.reviews enable row level security;

create policy "reviews_select_published_or_admin"
  on public.reviews for select
  using (is_published = true or public.is_admin());

create policy "reviews_insert_admin_only"
  on public.reviews for insert
  with check (public.is_admin());

create policy "reviews_update_admin_only"
  on public.reviews for update
  using (public.is_admin());

create policy "reviews_delete_admin_only"
  on public.reviews for delete
  using (public.is_admin());

-- ============================================================
-- 6. SEED DATA
-- ============================================================

-- ------------------------------------------------------------
-- 6.1 DUMMY CUSTOMERS (via auth.users -> triggers profile creation)
-- ------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000',
   'a1111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated',
   'sara.hassan@example.com', crypt('Password123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"سارة حسن"}', false, '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000',
   'a2222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated',
   'mohamed.ali@example.com', crypt('Password123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"محمد علي"}', false, '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000',
   'a3333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated',
   'nourhan.adel@example.com', crypt('Password123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"نورهان عادل"}', false, '', '', '', '')
on conflict (id) do nothing;

-- Enrich the auto-created profiles with phone/address (trigger only sets full_name + role)
update public.profiles set phone = '+201012345678', address = '6 أكتوبر، الجيزة'
  where id = 'a1111111-1111-1111-1111-111111111111';
update public.profiles set phone = '+201112233445', address = 'مدينة نصر، القاهرة'
  where id = 'a2222222-2222-2222-2222-222222222222';
update public.profiles set phone = '+201234567890', address = 'سيدي جابر، الإسكندرية'
  where id = 'a3333333-3333-3333-3333-333333333333';

-- ------------------------------------------------------------
-- 6.2 PRODUCTS (10 items across multiple categories)
-- ------------------------------------------------------------
insert into public.products (id, title, slug, description, price, stock_quantity, category, images, is_active) values
  ('b1111111-1111-1111-1111-111111111111',
   'رواية مئة عام من العزلة', 'hundred-years-of-solitude',
   'نسخة عربية مترجمة من الرواية العالمية الشهيرة لغابرييل غارسيا ماركيز.',
   150.00, 12, 'Books',
   array['https://example.com/images/book-solitude-1.jpg','https://example.com/images/book-solitude-2.jpg'], true),

  ('b2222222-2222-2222-2222-222222222222',
   'كتاب العادات السبع للناس الأكثر فاعلية', 'seven-habits-effective-people',
   'الكتاب التطويري الأشهر في تطوير الذات والإدارة الشخصية.',
   180.00, 8, 'Books',
   array['https://example.com/images/book-habits-1.jpg'], true),

  ('b3333333-3333-3333-3333-333333333333',
   'روج مات لونغ لاستينغ', 'matte-long-lasting-lipstick',
   'روج مطفي ثابت لفترة طويلة، متوفر بعدة درجات.',
   220.00, 30, 'Cosmetics',
   array['https://example.com/images/lipstick-matte-1.jpg'], true),

  ('b4444444-4444-4444-4444-444444444444',
   'باليت ظلال عيون 12 لون', 'eyeshadow-palette-12-colors',
   'باليت ظلال عيون متنوعة الألوان مناسبة للسهرات واليومي.',
   350.00, 15, 'Cosmetics',
   array['https://example.com/images/eyeshadow-palette-1.jpg'], true),

  ('b5555555-5555-5555-5555-555555555555',
   'كريم مرطب للبشرة الجافة SPF 30', 'moisturizing-cream-spf30',
   'كريم مرطب يومي بحماية من الشمس، مناسب للبشرة الجافة والحساسة.',
   275.00, 20, 'Skincare',
   array['https://example.com/images/moisturizer-spf30-1.jpg'], true),

  ('b6666666-6666-6666-6666-666666666666',
   'سيروم فيتامين سي للوجه', 'vitamin-c-face-serum',
   'سيروم مركز لتفتيح البشرة وتوحيد لونها مع الاستخدام المنتظم.',
   320.00, 10, 'Skincare',
   array['https://example.com/images/vitamin-c-serum-1.jpg'], true),

  ('b7777777-7777-7777-7777-777777777777',
   'مروحة سطح صغيرة 16 بوصة', 'desk-fan-16-inch',
   'مروحة مكتب صغيرة بثلاث سرعات تبريد، مناسبة للمكاتب والغرف الصغيرة.',
   450.00, 6, 'Home Appliances',
   array['https://example.com/images/desk-fan-1.jpg'], true),

  ('b8888888-8888-8888-8888-888888888888',
   'مروحة عمودية تبريد قوي', 'tower-fan-cooling',
   'مروحة عمودية بقوة تبريد عالية وتحكم عن بعد.',
   890.00, 4, 'Home Appliances',
   array['https://example.com/images/tower-fan-1.jpg'], true),

  ('b9999999-9999-9999-9999-999999999999',
   'شنطة يد جلد طبيعي', 'leather-handbag-classic',
   'شنطة يد كلاسيك من الجلد الطبيعي، مناسبة للاستخدام اليومي والمشاوير.',
   650.00, 7, 'Accessories',
   array['https://example.com/images/leather-handbag-1.jpg'], true),

  ('b1010101-1010-1010-1010-101010101010',
   'ساعة يد كاجوال نسائية', 'casual-womens-watch',
   'ساعة يد أنيقة بتصميم كاجوال يناسب جميع الإطلالات.',
   480.00, 0, 'Accessories',
   array['https://example.com/images/womens-watch-1.jpg'], true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 6.3 REVIEWS (6 admin-entered reviews, linked to specific products)
-- ------------------------------------------------------------
insert into public.reviews (product_id, customer_name, review_text, rating, is_published) values
  ('b1111111-1111-1111-1111-111111111111', 'سارة حسن',
   'الرواية ممتازة والترجمة كانت رائعة، استلمتها في نفس اليوم وجودة الطباعة حلوة جدًا.', 5, true),

  ('b1111111-1111-1111-1111-111111111111', 'أحمد سمير',
   'كتاب جميل جدًا، بس حصل تأخير بسيط في التوصيل عن الموعد المتفق عليه.', 4, true),

  ('b3333333-3333-3333-3333-333333333333', 'نورهان عادل',
   'الروج لونه حلو جدًا وثابت طول اليوم، مش بيحتاج تثبيت تاني، أنصح بيه بشدة.', 5, true),

  ('b5555555-5555-5555-5555-555555555555', 'محمد علي',
   'الكريم مناسب جدًا للبشرة الجافة، ملمسه خفيف ومش دهني، وريحته هادية.', 5, true),

  ('b7777777-7777-7777-7777-777777777777', 'إيمان طارق',
   'المروحة شغالة كويس وفيها قوة تبريد مناسبة، بس الصوت شوية عالي وقت الليل.', 3, true),

  ('b9999999-9999-9999-9999-999999999999', 'هبة الله محمود',
   'الشنطة شكلها فخم جدًا وأكبر من المتوقع، الجلد ملمسه ممتاز وتستحق سعرها فعلاً.', 5, true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 6.4 SAMPLE ORDERS + ORDER_ITEMS
-- ------------------------------------------------------------

-- Order 1: registered customer (سارة حسن), status: pending
insert into public.orders (id, user_id, customer_name, customer_phone, shipping_address, total_amount, status) values
  ('c1111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111111111',
   'سارة حسن', '+201012345678', '6 أكتوبر، الجيزة',
   425.00, 'pending')
on conflict (id) do nothing;

insert into public.order_items (order_id, product_id, product_title_snapshot, price_at_purchase, quantity) values
  ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'رواية مئة عام من العزلة', 150.00, 1),
  ('c1111111-1111-1111-1111-111111111111', 'b5555555-5555-5555-5555-555555555555', 'كريم مرطب للبشرة الجافة SPF 30', 275.00, 1);

-- Order 2: guest checkout (no account), status: shipped
insert into public.orders (id, user_id, customer_name, customer_phone, shipping_address, total_amount, status) values
  ('c2222222-2222-2222-2222-222222222222',
   null,
   'خالد إبراهيم', '+201556677889', 'حدائق الأهرام، الجيزة',
   890.00, 'shipped')
on conflict (id) do nothing;

insert into public.order_items (order_id, product_id, product_title_snapshot, price_at_purchase, quantity) values
  ('c2222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', 'روج مات لونغ لاستينغ', 220.00, 2),
  ('c2222222-2222-2222-2222-222222222222', 'b7777777-7777-7777-7777-777777777777', 'مروحة سطح صغيرة 16 بوصة', 450.00, 1);

-- Order 3: registered customer (محمد علي), status: completed
insert into public.orders (id, user_id, customer_name, customer_phone, shipping_address, total_amount, status) values
  ('c3333333-3333-3333-3333-333333333333',
   'a2222222-2222-2222-2222-222222222222',
   'محمد علي', '+201112233445', 'مدينة نصر، القاهرة',
   830.00, 'completed')
on conflict (id) do nothing;

insert into public.order_items (order_id, product_id, product_title_snapshot, price_at_purchase, quantity) values
  ('c3333333-3333-3333-3333-333333333333', 'b9999999-9999-9999-9999-999999999999', 'شنطة يد جلد طبيعي', 650.00, 1),
  ('c3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'كتاب العادات السبع للناس الأكثر فاعلية', 180.00, 1);

-- ============================================================
-- END OF SCRIPT
-- ============================================================