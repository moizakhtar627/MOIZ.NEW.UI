-- ===========================================================================
-- WHA SOL — 002 : error_codes table
-- ---------------------------------------------------------------------------
-- Error codes are a SEPARATE content type from articles. They must never be
-- counted or listed as blog articles.
--
--   * public visitors  -> may SELECT every documented code
--   * editor and above -> create / update
--   * admin and above  -> delete
--
-- An error code may be created automatically from an article that mentions
-- it. The two columns source_article_id / source_article_title keep that link
-- so the code can show "referenced in <article>" and the article can be found
-- again from the code.
--
-- Run this file once in the Supabase SQL Editor (Dashboard -> SQL Editor).
-- Re-running it is safe.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. error_codes
-- ---------------------------------------------------------------------------

create table if not exists public.error_codes (
    id                  uuid primary key default gen_random_uuid(),

    code                text        not null,
    title               text        not null default '',
    brand               text        not null default '',
    model               text        not null default '',
    category            text        not null default 'Inverter',

    explanation         text        not null default '',
    image               text        not null default '',
    link                text        not null default '',
    keywords            text[]      not null default '{}',

    -- Set when the record was detected from an article's text.
    source_article_id     uuid      references public.articles (id) on delete set null,
    source_article_title  text     not null default '',

    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),

    -- The same code can legitimately exist for two different brands, but never
    -- twice for the same brand. This is what makes auto-detection idempotent.
    constraint error_codes_brand_code_key unique (brand, code)
);

create index if not exists error_codes_code_idx    on public.error_codes (code);
create index if not exists error_codes_brand_idx   on public.error_codes (brand);
create index if not exists error_codes_source_idx  on public.error_codes (source_article_id);

-- ---------------------------------------------------------------------------
-- 2. updated_at maintenance
-- ---------------------------------------------------------------------------
-- public.touch_updated_at() is created by 001_create_articles_table.sql.

drop trigger if exists error_codes_touch_updated_at on public.error_codes;

create trigger error_codes_touch_updated_at
    before update on public.error_codes
    for each row
    execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.error_codes enable row level security;

-- Drop any previous definition so re-running is clean.
drop policy if exists error_codes_public_read    on public.error_codes;
drop policy if exists error_codes_editor_insert  on public.error_codes;
drop policy if exists error_codes_editor_update  on public.error_codes;
drop policy if exists error_codes_admin_delete   on public.error_codes;

-- Public: every documented code is public knowledge.
create policy error_codes_public_read
    on public.error_codes
    for select
    using (true);

-- Editor and above: create.
create policy error_codes_editor_insert
    on public.error_codes
    for insert
    with check (public.has_role(2));

-- Editor and above: update.
create policy error_codes_editor_update
    on public.error_codes
    for update
    using (public.has_role(2))
    with check (public.has_role(2));

-- Admin and above: delete.
create policy error_codes_admin_delete
    on public.error_codes
    for delete
    using (public.has_role(3));

-- ---------------------------------------------------------------------------
-- 4. Seed the code that already exists as static content in js/data.js
-- ---------------------------------------------------------------------------
-- The same article is linked, so the public code card can open the guide.

insert into public.error_codes (
    code, title, brand, model, category,
    explanation, image, link, keywords,
    source_article_title
) values
(
    '102',
    'Consistent Fault',
    'Growatt',
    'All Models',
    'Inverter',
    'A mismatch between the data reported by the inverter''s master and slave processors. The system halts operation and the red fault indicator lights up. Usually requires professional repair or inverter replacement.',
    'assets/inverter-error.jpg',
    'article.html?slug=growatt-error-102',
    array['growatt error 102', 'consistent fault', 'inverter error', 'processor mismatch', 'fault fix'],
    'How to Fix Growatt Error 102 on Your Inverter'
)
on conflict (brand, code) do update
    set title       = excluded.title,
        model       = excluded.model,
        category    = excluded.category,
        explanation = excluded.explanation,
        image       = excluded.image,
        link        = excluded.link,
        keywords    = excluded.keywords;
