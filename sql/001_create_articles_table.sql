-- ===========================================================================
-- WHA SOL — 001 : articles table
-- ---------------------------------------------------------------------------
-- Supabase is the shared source of truth for article content.
--
--   * public visitors  -> may SELECT only status = 'published'
--   * editor and above -> full CRUD
--   * draft records    -> never visible to the public
--
-- Run this file once in the Supabase SQL Editor (Dashboard -> SQL Editor).
-- Re-running it is safe.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. articles
-- ---------------------------------------------------------------------------

create table if not exists public.articles (
    id              uuid primary key default gen_random_uuid(),

    title           text        not null,
    slug            text        not null unique,
    description     text        not null default '',

    brand           text        not null default '',
    model           text        not null default '',
    category        text        not null default 'General',

    meta_title      text        not null default '',
    meta_description text       not null default '',

    content         text        not null default '',
    image           text        not null default '',
    keywords        text[]      not null default '{}',

    status          text        not null default 'draft'
                                check (status in ('draft', 'published')),

    published_at    timestamptz,

    author_id       uuid        references auth.users (id) on delete set null,

    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- Public listing pages filter and sort on these columns.
create index if not exists articles_status_idx   on public.articles (status);
create index if not exists articles_published_idx
    on public.articles (published_at desc)
    where status = 'published';
create index if not exists articles_category_idx on public.articles (category);
create index if not exists articles_brand_idx    on public.articles (brand);
create index if not exists articles_keywords_idx on public.articles using gin (keywords);

-- ---------------------------------------------------------------------------
-- 2. updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists articles_touch_updated_at on public.articles;

create trigger articles_touch_updated_at
    before update on public.articles
    for each row
    execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Role helper
-- ---------------------------------------------------------------------------
-- Reads the role from the profiles table that js/auth.js already uses.
-- Rank order matches WHASOL.auth.ROLE_RANK in js/auth.js.
-- Returns false for anonymous / missing profiles, so it never grants access by
-- accident.
--
-- If public.profiles does not exist yet, the helper still gets created and
-- simply reports "no permissions" for everyone. Create profiles first (see
-- 002_profiles.sql) and re-run this file to enable the write policies.

create or replace function public.has_role(min_rank integer)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
    if to_regclass('public.profiles') is null then
        return false;
    end if;

    return exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and case lower(coalesce(p.role, 'viewer'))
                    when 'owner'  then 4
                    when 'admin'  then 3
                    when 'editor' then 2
                    else 1
                end >= min_rank
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.articles enable row level security;

-- Drop any previous definition so re-running is clean.
drop policy if exists articles_public_read       on public.articles;
drop policy if exists articles_editor_read_all  on public.articles;
drop policy if exists articles_editor_insert     on public.articles;
drop policy if exists articles_editor_update     on public.articles;
drop policy if exists articles_admin_delete      on public.articles;

-- Public: published rows only.
create policy articles_public_read
    on public.articles
    for select
    using (status = 'published');

-- Editor and above: see everything.
create policy articles_editor_read_all
    on public.articles
    for select
    using (public.has_role(2));

-- Editor and above: create.
create policy articles_editor_insert
    on public.articles
    for insert
    with check (public.has_role(2));

-- Editor and above: update. The author_id stays with whoever created it.
create policy articles_editor_update
    on public.articles
    for update
    using (public.has_role(2))
    with check (public.has_role(2));

-- Admin and above: delete.
create policy articles_admin_delete
    on public.articles
    for delete
    using (public.has_role(3));

-- ---------------------------------------------------------------------------
-- 5. published_at housekeeping
-- ---------------------------------------------------------------------------

create or replace function public.sync_published_at()
returns trigger
language plpgsql
as $$
begin
    if new.status = 'published' and new.published_at is null then
        new.published_at = now();
    elsif new.status = 'draft' then
        new.published_at = null;
    end if;
    return new;
end;
$$;

drop trigger if exists articles_sync_published_at on public.articles;

create trigger articles_sync_published_at
    before insert or update of status on public.articles
    for each row
    execute function public.sync_published_at();

-- ---------------------------------------------------------------------------
-- 6. Seed the two articles that already exist as static pages
-- ---------------------------------------------------------------------------
-- These keep their existing public URLs. Slugs match the static file names so
-- nothing that already links to them breaks. Content is a short pointer to
-- those pages; the full text still lives in growatt-inverter-restart.html and
-- growatt-error-102.html.

insert into public.articles (
    title, slug, description, brand, model, category,
    meta_title, meta_description, content, image, keywords, status, published_at
) values
(
    'How to Shut Down and Restart Your Solar Inverter',
    'growatt-inverter-restart',
    'Follow the correct AC and DC switch order to safely shut down and restart your solar inverter during faults or maintenance.',
    'Growatt',
    'MIN 2500-6000TL-X',
    'Inverter',
    'How to Shut Down and Restart Your Solar Inverter',
    'Learn how to safely shut down and restart your solar inverter during faults, system checks, or maintenance. Follow the correct switch order and restore normal operation.',
    '<h2>Safe shutdown order</h2><p>Switch off the AC isolator first, then the DC isolator. Never disconnect the DC side while the inverter is producing power.</p><h2>Safe startup order</h2><p>Close the DC isolator first, then the AC isolator, and wait for the inverter to complete its self-test.</p>',
    'assets/growatt-inverter.png',
    array['solar inverter', 'restart', 'shutdown', 'DC isolator', 'AC isolator', 'reboot', 'power cycle', 'inverter reset'],
    'published',
    '2026-09-17T00:00:00Z'
),
(
    'How to Fix Growatt Error 102 on Your Inverter',
    'growatt-error-102',
    'Growatt Error 102 is a Consistent Fault indicating a mismatch between the inverter''s master and slave processors. Learn what causes it, how to attempt a power cycle, and when to call a technician.',
    'Growatt',
    'MIN 2500-6000TL-X',
    'Inverter',
    'How to Fix Growatt Error 102 on Your Inverter | WHA Sol',
    'How to Fix Growatt Error 102 with clear steps for fault checks and inverter reset tips. Find the cause and get your system running safely again.',
    '<h2>What error 102 means</h2><p>Error 102 is a Consistent Fault. The inverter''s master and slave processors disagree, so it halts output and lights the red fault indicator.</p><h2>What to try first</h2><p>Power cycle the inverter using the safe shutdown and startup order. If the fault returns, the unit needs professional repair or replacement.</p>',
    'assets/inverter-error.jpg',
    array['growatt error 102', 'consistent fault', 'inverter error', 'processor mismatch', 'fault fix', 'growatt pakistan'],
    'published',
    '2026-09-19T00:00:00Z'
)
on conflict (slug) do update
    set title            = excluded.title,
        description      = excluded.description,
        brand            = excluded.brand,
        model            = excluded.model,
        category         = excluded.category,
        meta_title       = excluded.meta_title,
        meta_description = excluded.meta_description,
        content          = excluded.content,
        image            = excluded.image,
        keywords         = excluded.keywords;
