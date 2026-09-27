-- WHA SOL — 004 : separate Blog and Troubleshooting article records
-- Existing rows are deliberately left as blog records. Review and classify
-- them manually only when their section is known with certainty.

alter table public.articles
    add column if not exists content_type text not null default 'blog';

alter table public.articles
    drop constraint if exists articles_content_type_check;

alter table public.articles
    add constraint articles_content_type_check
    check (content_type in ('blog', 'troubleshooting'));

create index if not exists articles_content_type_idx
    on public.articles (content_type);
