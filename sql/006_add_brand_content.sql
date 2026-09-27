-- WHA SOL — 006 : add long-form brand/model information
-- Existing brand records remain unchanged and receive an empty optional value.

alter table public.brands
    add column if not exists content text not null default '';
