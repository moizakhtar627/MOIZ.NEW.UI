-- WHA SOL — 007 : import the content already present on the website
--
-- This migration is intentionally idempotent and preserves existing records:
--   * Existing article/error-code rows are not overwritten.
--   * Existing brands are not overwritten.
--   * Missing models are added through the existing brand_models table.
--   * Blog and Troubleshooting remain separate article content types.
--
-- Run after 004_add_article_content_type.sql and 005_add_error_codes_brand_code_constraint.sql.

begin;

-- ---------------------------------------------------------------------------
-- Blog records from js/data.js / the existing static website
-- ---------------------------------------------------------------------------

insert into public.articles (
    title, slug, description, brand, model, category, content_type,
    meta_title, meta_description, content, image, keywords, status, published_at
) values
(
    'How to Shut Down and Restart Your Solar Inverter',
    'growatt-inverter-restart',
    'Follow the correct AC and DC switch order to safely shut down and restart your solar inverter during faults or maintenance.',
    'Growatt', 'MIN 2500-6000TL-X', 'inverter', 'blog',
    'How to Shut Down and Restart Your Solar Inverter',
    'Learn how to safely shut down and restart your solar inverter during faults, system checks, or maintenance. Follow the correct switch order and restore normal operation.',
    '<h2>Safe shutdown order</h2><p>Switch off the AC isolator first, then the DC isolator. Never disconnect the DC side while the inverter is producing power.</p><h2>Safe startup order</h2><p>Close the DC isolator first, then the AC isolator, and wait for the inverter to complete its self-test.</p>',
    'assets/growatt-inverter.png',
    array['solar inverter', 'restart', 'shutdown', 'DC isolator', 'AC isolator', 'reboot', 'power cycle', 'inverter reset'],
    'published', '2026-09-17T00:00:00Z'
),
(
    'How to Fix Growatt Error 102 on Your Inverter',
    'growatt-error-102',
    'Growatt Error 102 is a Consistent Fault indicating a mismatch between the inverter''s master and slave processors. Learn what causes it, how to attempt a power cycle, and when to call a technician.',
    'Growatt', 'MIN 2500-6000TL-X', 'inverter', 'blog',
    'How to Fix Growatt Error 102 on Your Inverter | WHA Sol',
    'How to Fix Growatt Error 102 with clear steps for fault checks and inverter reset tips. Find the cause and get your system running safely again.',
    '<h2>What error 102 means</h2><p>Error 102 is a Consistent Fault. The inverter''s master and slave processors disagree, so it halts output and lights the red fault indicator.</p><h2>What to try first</h2><p>Power cycle the inverter using the safe shutdown and startup order. If the fault returns, the unit needs professional repair or replacement.</p>',
    'assets/inverter-error.jpg',
    array['growatt error 102', 'consistent fault', 'inverter error', 'processor mismatch', 'fault fix', 'growatt pakistan'],
    'published', '2026-09-19T00:00:00Z'
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Troubleshooting records from the existing static troubleshooting section.
-- Unique slugs avoid colliding with the separate Blog records above.
-- ---------------------------------------------------------------------------

insert into public.articles (
    title, slug, description, brand, model, category, content_type,
    meta_title, meta_description, content, image, keywords, status, published_at
) values
(
    'How to Shut Down and Restart Your Solar Inverter',
    'growatt-inverter-restart-troubleshooting',
    'Learn how to safely shut down and restart your solar inverter during faults, system checks, or maintenance.',
    'Growatt', 'MIN 2500-6000TL-X', 'inverter', 'troubleshooting',
    'How to Shut Down and Restart Your Solar Inverter',
    'Follow the correct AC and DC isolator sequence when troubleshooting a solar inverter restart.',
    '<h2>Safety first</h2><p>Follow the manufacturer shutdown procedure and isolate AC before DC. Wait for stored energy to discharge before inspection.</p><h2>Restart checks</h2><p>Close the DC isolator first, then the AC isolator, and confirm the inverter completes its self-test.</p>',
    'assets/growatt-inverter.png',
    array['restart', 'shutdown', 'DC isolator', 'AC isolator', 'reboot', 'power cycle'],
    'published', '2026-09-17T00:00:00Z'
),
(
    'How to Fix Growatt Error 102 on Your Inverter',
    'growatt-error-102-troubleshooting',
    'Find the cause of Growatt Error 102, try safe fault checks, and identify when professional repair is required.',
    'Growatt', 'MIN 2500-6000TL-X', 'inverter', 'troubleshooting',
    'How to Fix Growatt Error 102 on Your Inverter',
    'Troubleshoot the Growatt 102 Consistent Fault with safe checks and power-cycle guidance.',
    '<h2>What Error 102 means</h2><p>The inverter''s master and slave processors are not communicating correctly. The inverter may stop output as a protective response.</p><h2>Safe checks</h2><p>Follow the approved shutdown and restart sequence. If the error returns, stop testing and contact a qualified technician.</p>',
    'assets/inverter-error.jpg',
    array['growatt error 102', 'consistent fault', 'inverter error', 'processor mismatch', 'fault fix'],
    'published', '2026-09-19T00:00:00Z'
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Error code from the website’s static error-code source
-- ---------------------------------------------------------------------------

insert into public.error_codes (
    code, title, brand, model, category, explanation, image, link, keywords,
    source_article_title
) values (
    '102', 'Consistent Fault', 'Growatt', 'All Models', 'Inverter',
    'A mismatch between the data reported by the inverter''s master and slave processors. The system halts operation and the red fault indicator lights up. Usually requires professional repair or inverter replacement.',
    'assets/inverter-error.jpg', 'article.html?slug=growatt-error-102',
    array['growatt error 102', 'consistent fault', 'inverter error', 'processor mismatch', 'fault fix'],
    'How to Fix Growatt Error 102 on Your Inverter'
)
on conflict (brand, code) do nothing;

-- ---------------------------------------------------------------------------
-- Growatt brand/models: preserve an existing brand and add only missing data
-- ---------------------------------------------------------------------------

insert into public.brands (slug, name, description, image, logo)
values (
    'growatt',
    'Growatt',
    'A leading global manufacturer of solar string inverters, hybrid inverters and energy storage systems trusted in residential and commercial installations worldwide.',
    'assets/growatt-inverter.png',
    'assets/growatt-inverter.png'
)
on conflict (slug) do nothing;

insert into public.brand_models (brand_id, name)
select b.id, models.name
from public.brands b
cross join (values
    ('MIN 2500-6000TL-X'),
    ('SPH 3000-6000TL BL-UP'),
    ('MID 15-25K TL3-X')
) as models(name)
where b.slug = 'growatt'
on conflict (brand_id, name) do nothing;

commit;
