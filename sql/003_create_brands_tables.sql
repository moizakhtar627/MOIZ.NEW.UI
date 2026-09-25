-- ===========================================================================
-- WHA SOL — 003 : brands and brand_models tables
-- ---------------------------------------------------------------------------
-- Brands are a SEPARATE content type from articles. They must never be
-- counted or listed as blog articles.
--
--   * public visitors  -> may SELECT every brand
--   * editor and above -> create / update
--   * admin and above  -> delete
--
-- A brand is created automatically when an article names a brand that is not
-- in the database yet. `logo` holds the brand logo that the article editor
-- copies into the article's featured image field.
--
-- The article_* columns are the "Featured Guide" block rendered on the public
-- Brands & Models page by js/listing.js.
--
-- Run this file once in the Supabase SQL Editor (Dashboard -> SQL Editor).
-- Re-running it is safe.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. brands
-- ---------------------------------------------------------------------------

create table if not exists public.brands (
    id                  uuid primary key default gen_random_uuid(),

    slug                text        not null unique,
    name                text        not null,
    description         text        not null default '',

    -- Equipment photo used on the brand card.
    image               text        not null default '',
    -- Brand logo. The article editor copies this into the featured image.
    logo                text        not null default '',

    -- Featured guide block 1
    article_title       text        not null default '',
    article_description text        not null default '',
    article_image       text        not null default '',
    article_link        text        not null default '',

    -- Featured guide block 2
    article_title2       text       not null default '',
    article_description2 text       not null default '',
    article_image2       text       not null default '',
    article_link2        text       not null default '',

    -- Set when the record was created from an article's text.
    source_article_id     uuid      references public.articles (id) on delete set null,
    source_article_title  text     not null default '',

    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index if not exists brands_name_idx on public.brands (lower(name));
create index if not exists brands_source_idx on public.brands (source_article_id);

-- ---------------------------------------------------------------------------
-- 2. brand_models
-- ---------------------------------------------------------------------------
-- Models live in their own table so a model is never stored twice for the
-- same brand, and never counted as a separate brand.

create table if not exists public.brand_models (
    id          uuid primary key default gen_random_uuid(),

    brand_id    uuid        not null references public.brands (id) on delete cascade,
    name        text        not null,

    created_at  timestamptz not null default now(),

    constraint brand_models_brand_name_key unique (brand_id, name)
);

create index if not exists brand_models_brand_idx on public.brand_models (brand_id);

-- ---------------------------------------------------------------------------
-- 3. updated_at maintenance
-- ---------------------------------------------------------------------------
-- public.touch_updated_at() is created by 001_create_articles_table.sql.

drop trigger if exists brands_touch_updated_at on public.brands;

create trigger brands_touch_updated_at
    before update on public.brands
    for each row
    execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.brands       enable row level security;
alter table public.brand_models enable row level security;

-- Drop any previous definition so re-running is clean.
drop policy if exists brands_public_read        on public.brands;
drop policy if exists brands_editor_insert      on public.brands;
drop policy if exists brands_editor_update      on public.brands;
drop policy if exists brands_admin_delete       on public.brands;
drop policy if exists brand_models_public_read  on public.brand_models;
drop policy if exists brand_models_editor_write  on public.brand_models;

-- Public: the equipment database is public.
create policy brands_public_read
    on public.brands
    for select
    using (true);

create policy brands_editor_insert
    on public.brands
    for insert
    with check (public.has_role(2));

create policy brands_editor_update
    on public.brands
    for update
    using (public.has_role(2))
    with check (public.has_role(2));

create policy brands_admin_delete
    on public.brands
    for delete
    using (public.has_role(3));

-- Models follow their brand's visibility.
create policy brand_models_public_read
    on public.brand_models
    for select
    using (true);

create policy brand_models_editor_write
    on public.brand_models
    for insert
    with check (public.has_role(2));

-- ---------------------------------------------------------------------------
-- 5. Seed the brand that already exists as static content in js/data.js
-- ---------------------------------------------------------------------------
-- Models are inserted separately so the unique (brand_id, name) constraint
-- keeps them unique.

with upserted as (
    insert into public.brands (
        slug, name, description, image, logo,
        article_title, article_description, article_image, article_link,
        article_title2, article_description2, article_image2, article_link2,
        source_article_title
    ) values
    (
        'growatt',
        'Growatt',
        'A leading global manufacturer of solar string inverters, hybrid inverters and energy storage systems trusted in residential and commercial installations worldwide.',
        'assets/growatt-inverter.png',
        'assets/growatt-inverter.png',
        'How to Shut Down and Restart Your Solar Inverter',
        'Follow the correct AC and DC switch order to safely shut down and restart your Growatt inverter.',
        'assets/growatt-inverter.png',
        'article.html?slug=growatt-inverter-restart',
        'How to Fix Growatt Error 102 on Your Inverter',
        'How to Fix Growatt Error 102 with clear steps for fault checks and inverter reset tips.',
        'assets/inverter-error.jpg',
        'article.html?slug=growatt-error-102',
        'How to Shut Down and Restart Your Solar Inverter'
    )
    on conflict (slug) do update
        set name                 = excluded.name,
            description          = excluded.description,
            image                = excluded.image,
            logo                 = excluded.logo,
            article_title        = excluded.article_title,
            article_description  = excluded.article_description,
            article_image        = excluded.article_image,
            article_link         = excluded.article_link,
            article_title2       = excluded.article_title2,
            article_description2 = excluded.article_description2,
            article_image2       = excluded.article_image2,
            article_link2        = excluded.article_link2
    returning id
)
insert into public.brand_models (brand_id, name)
select upserted.id, m.model
from upserted
cross join (
    values
        ('MIN 2500-6000TL-X'),
        ('SPH 3000-6000TL BL-UP'),
        ('MID 15-25K TL3-X')
) as m(model)
on conflict (brand_id, name) do nothing;
